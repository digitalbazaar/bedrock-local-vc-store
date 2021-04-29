/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {LocalVerifiableCredentialStore} from 'bedrock-web-local-vc-store';
import PouchDB from 'pouchdb';
import pouchFind from 'pouchdb-find';
import pouchAdapter from 'pouchdb-adapter-memory';

PouchDB.plugin(pouchFind);
PouchDB.plugin(pouchAdapter);

const db = new PouchDB('bedrock-web-local-vc-store-test', {adapter: 'memory'});
const localVcStore = new LocalVerifiableCredentialStore({db});

describe('local vc store API', () => {
  describe('some API', () => {
    describe('authenticated request', () => {
      it('does something incorrectly', async () => {
        let result;
        let err;
        try {
          result = await localVcStore.get();
        } catch(e) {
          err = e;
        }
        should.not.exist(result);
        should.exist(err);
      });
    }); // end authenticated request
  }); // end create
});
