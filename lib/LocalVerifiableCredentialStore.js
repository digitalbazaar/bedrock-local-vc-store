/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import pMap from 'p-map';
import {EncryptedDb} from './encrypt.js';

/**
 * Each instance of this API is associated with a single edv and performs
 * initialization (ensures required indexes are created).
 */

export class LocalVerifiableCredentialStore {
  constructor({db, dbName, edv, invocationSigner, profileId}) {
    this.profileId = profileId;
    edv.ensureIndex({attribute: [
      'meta.profileId',
      'content.id'
    ]});
    edv.ensureIndex({attribute: [
      'meta.profileId',
      'meta.displayable'
    ]});
    edv.ensureIndex({attribute: [
      'meta.profileId',
      'meta.parentId'
    ]});
    edv.ensureIndex({attribute: [
      'meta.profileId',
      'content.type',
      'meta.issuer'
    ]});
    this.encryptedDb = new EncryptedDb({db, dbName, edv, invocationSigner});
  }

  /**
   * Gets a verifiable credential by its ID.
   *
   * @param {object} options - The options to use.
   * @param {string} options.id - The ID of the credential.
   *
   * @returns {Promise<object>} Resolves with an object of the matching VC.
   */
  async get({id}) {
    const [doc] = await this.encryptedDb.find({
      selector: {
        'meta.profileId': this.profileId,
        'content.id': id
      }
    });
    if(!doc) {
      const err = new Error('Verifiable Credential not found.');
      err.name = 'NotFoundError';
      throw err;
    }
    return doc;
  }

  /**
   * Gets all verifiable credential instances that match the given parameters.
   *
   * @param {object} options - The options to use.
   * @param {boolean} [options.displayable] - Flag used for if credential is
   *   displable or not.
   * @param {string} [options.parentId] - ID of the parent credential.
   * @param {string} [options.type] - The credential type.
   *
   * @returns {Promise<Array>} List of matching VCs.
   */
  async find({displayable, parentId, type}) {
    const selector = {
      'meta.profileId': this.profileId
    };
    if(type) {
      selector['content.type'] = type;
    }
    if(parentId) {
      selector['meta.parentId'] = parentId;
    }
    if(displayable) {
      selector['meta.displayable'] = displayable;
    }
    const docs = await this.encryptedDb.find({
      selector
    });
    // filters out unwanted db data by just returning content & meta
    return docs.map(({content, meta}) => ({content, meta}));
  }

  /**
   * Stores a verifiable credential in remote private storage.
   *
   * @param {object} options - The options to use.
   * @param {object} options.credential - The verifiable credential.
   * @param {object} options.meta - The meta data associated with the
   *   credential.
   *
   * @returns {Promise<object>} Resolves with a confirmation of storage.
   */
  async insert({credential, meta = {}}) {
    meta.issuer = this._getIssuer({credential});
    meta.profileId = this.profileId;
    const doc = await this.encryptedDb.insert({
      meta,
      credential
    });
    return doc;
  }

  /**
   * Removes a verifiable credential identified by its ID.
   *
   * @param {object} options - The options to use.
   * @param {string} options.id - The ID of the credential.
   *
   * @returns {Promise<object>} Resolves with a confirmation of removal.
   */
  async delete({id}) {
    try {
      const selector = {
        'meta.profileId': this.profileId,
        'content.id': id
      };
      return this.encryptedDb.delete({selector});
    } catch(e) {
      if(e.response.status === 404) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Finds the best matching verifiable credential for the given query.
   *
   * @param {object} options - The options to use.
   * @param {object} options.query - The query used to find the match.
   *
   * @returns {Promise<Array>} List of matching VCs.
   */
  async match({query}) {
    if(!query) {
      throw new TypeError('"query" is a required parameter.');
    }
    const {type} = query;
    let results;
    if(type === 'QueryByExample') {
      const {credentialQuery} = query;
      results = await this._queryByExample({
        credentialQuery, profileId: this.profileId
      });
    } else {
      throw new Error(`Unsupported query type: "${type}"`);
    }
    return results;
  }

  _getIssuer({credential}) {
    const {issuer} = credential;
    if(!issuer) {
      throw new Error('A verifiable credential MUST have an issuer property.');
    }
    if(!(typeof issuer === 'string' || typeof issuer.id === 'string')) {
      throw new Error('The value of the issuer property MUST be either a URI ' +
        'or an object containing an "id" property.');
    }
    return typeof issuer === 'string' ? issuer : issuer.id;
  }

  async _queryByExample({credentialQuery, profileId}) {
    if(!credentialQuery) {
      throw new Error(
        '"credentialQuery" is needed to execute a QueryByExample.');
    }
    if(typeof credentialQuery !== 'object') {
      throw new Error('"credentialQuery" must be an object or an array.');
    }

    // normalize query to be an array
    const query = Array.isArray(credentialQuery) ? credentialQuery :
      [credentialQuery];

    const _query = async ({example, trustedIssuer = []}) => {
      const {type} = example;
      // normalize trusted issuers to be an array
      const trustedIssuers = Array.isArray(trustedIssuer) ? trustedIssuer :
        [trustedIssuer];

      const issuers = trustedIssuers.map(({id}) => {
        if(!id) {
          const error = new Error(
            'trustedIssuer without an "id" is unsupported.');
          error.name = 'NotSupportedError';
          throw error;
        }
        return id;
      });
      const types = Array.isArray(type) ? type : [type];

      const selector = [];
      types.map(type => {
        if(issuers.length !== 0) {
          issuers.map(issuer => (
            selector.push({
              'meta.profileId': profileId,
              'content.type': type,
              'meta.issuer': issuer
            })));
        } else {
          selector.push({
            'meta.profileId': profileId,
            'content.type': type
          });
        }
      });

      const docs = await this.encryptedDb.find({
        selector
      });
      return docs.map(({content, meta}) => ({content, meta}));
    };

    // only look for credentials that are required
    const requiredCredentials = await pMap(
      query,
      _query,
      {concurrency: 5});

    // flatten results
    const credentials = requiredCredentials
      .reduce((acc, val) => acc.concat(val), []);
    return credentials;
  }
}
