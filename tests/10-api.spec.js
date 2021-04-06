/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import LocalVerifiableCredentialStore from 'bedrock-local-vc-store';
const dbName = 'bedrock-local-vc-store-test';
const adapter = 'memory';
const localVcStore = new LocalVerifiableCredentialStore({dbName, adapter});

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
