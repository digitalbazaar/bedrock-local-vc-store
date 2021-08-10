/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import PouchDB from 'pouchdb';
import pouchFind from 'pouchdb-find';

// enable for debugging purposes only
import debugPouch from 'pouchdb-debug';
debugPouch(PouchDB);
PouchDB.debug.enable('pouchdb:find');

PouchDB.plugin(pouchFind);

export class EncryptedDb {
  constructor({db, dbName, edv, invocationSigner}) {
    this.edv = edv;
    this.invocationSigner = invocationSigner;
    this.db = db || new PouchDB(dbName);
    // This needs to handle encrypted indexes
    // this.db.createIndex({
    //   index: {
    //     fields: [
    //       'indexed.hmac.id',
    //       'indexed.attributes.name',
    //       'indexed.attributes.value'
    //     ]
    //   }
    // });
    this.db.createIndex({
      index: {
        fields: [
          'indexed'
        ]
      }
    });
  }

  /**
   * Gets all verifiable credential instances that match the given parameters.
   *
   * @param {object} options - The options to use.
   * @param {string} options.selector - The fields to query.
   *
   * @returns {Promise<Array>} List of matching VCs.
   */
  async find({selector}) {
    const response = await this._findEncryptedDocs({selector});

    const docs = await Promise.all(response.docs.map(
      async doc => {
        return this.edv._decrypt({
          encryptedDoc: {...doc, id: doc._id},
          keyAgreementKey: this.edv.keyAgreementKey
        });
      }
    ));

    return docs;
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
    const recipients = [{
      header: {
        kid: this.edv.keyAgreementKey.id,
        // only supported algorithm
        alg: 'ECDH-ES+A256KW'
      }
    }];

    const encryptedDoc = await this.edv._encrypt({
      doc: {
        meta,
        content: credential
      },
      recipients,
      keyResolver: this.edv.keyResolver,
      hmac: this.edv.hmac
    });
    const doc = await this.db.post(encryptedDoc);
    return doc;
  }

  /**
   * Removes a verifiable credential identified by its ID.
   *
   * @param {object} options - The options to use.
   * @param {string} options.selector - The fields to query.
   *
   * @returns {Promise<object>} Resolves with a confirmation of removal.
   */
  async delete({selector}) {
    try {
      const {docs: [doc]} = await this._findEncryptedDocs({selector});
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

  async _findEncryptedDocs({selector}) {
    const equals = Array.isArray(selector) ? selector : [selector];
    selector = await this.edv.indexHelper.buildQuery({
      equals,
      hmac: this.edv.hmac
    });

    const name = Object.keys(selector.equals[0])[0];
    const value = Object.values(selector.equals[0])[0];

    return this.db.find({
      selector: {
        indexed: {
          $elemMatch: {
            attributes: {
              $elemMatch: {
                name: {$eq: name},
                value: {$eq: value}
              }
            },
            'hmac.id': {$eq: selector.index}
          },
        },
      },
      // selector: {
      //   'indexed.attributes.name': {$eq: name},
      //   'indexed.attributes.value': {$eq: value},
      //   'indexed.hmac.id': {$eq: selector.index}
      // },
      include_docs: true,
      attachments: true
    });
  }
}
