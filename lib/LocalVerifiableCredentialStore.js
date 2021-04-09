/*!
 * Copyright (c) 2019-2020 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Each instance of this API is associated with a single edv and performs
 * initialization (ensures required indexes are created).
 */
import PouchDB from 'pouchdb';
import pouchFind from 'pouchdb-find';
PouchDB.plugin(pouchFind);

export default class LocalVerifiableCredentialStore {
  constructor({db, dbName, profileId}) {
    this.db = db || new PouchDB(dbName);
    this.profileId = profileId;
    this.db.createIndex({
      index: {
        fields: [
          'content.id',
          'meta.parentId',
          'meta.profileId',
          'meta.displayable'
        ]
      }
    });
  }

  /**
   * Gets a verifiable credential by its ID.
   *
   * @param {string} id
   */
  async get({id}) {
    const {docs: [doc]} = await this.db.find({
      selector: {
        'meta.profileId': this.profileId,
        'content.id': id
      },
      include_docs: true,
      attachments: true
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
   * @param {boolean} displayable
   * @param {string} parentId
   *
   * @return {Promise<Array>} List of matching VCs
   */
  async find({displayable, parentId}) {
    const selector = {
      'meta.profileId': this.profileId,
    };
    if(parentId) {
      selector['meta.parentId'] = parentId;
    }
    if(displayable) {
      selector['meta.displayable'] = displayable;
    }
    const {docs} = await this.db.find({
      selector,
      include_docs: true,
      attachments: true
    });
    return docs.map(({content, meta}) => {
      return {
        content,
        meta
      };
    });
  }

  /**
   * Stores a verifiable credential in remote private storage.
   *
   * @param {object} credential
   * @param {object} meta
   */
  async insert({credential, meta = {}}) {
    meta.issuer = this._getIssuer({credential});
    meta.profileId = this.profileId;
    const doc = await this.db.post({
      meta,
      content: credential
    });
    return doc;
  }

  /**
   * Removes a verifiable credential identified by its ID.
   *
   * @param id
   */
  async delete({id}) {
    try {
      const selector = {
        'content.id': id,
        'meta.profileId': this.profileId,
      };
      const {docs: [doc]} = await this.db.find({
        selector,
        include_docs: true,
        attachments: true
      });
      if(!doc) {
        return false;
      }
      return this.db.remove(doc);
    } catch(e) {
      if(e.response.status === 404) {
        return false;
      }
      throw e;
    }
  }

  _getIssuer({credential}) {
    const {issuer} = credential;
    if(!issuer) {
      throw new Error('A verifiable credential MUST have an issuer property');
    }
    if(!(typeof issuer === 'string' || typeof issuer.id === 'string')) {
      throw new Error('The value of the issuer property MUST be either a URI' +
        ' or an object containing an id property.');
    }
    return typeof issuer === 'string' ? issuer : issuer.id;
  }
}
