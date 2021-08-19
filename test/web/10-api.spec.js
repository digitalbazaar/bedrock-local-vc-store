/*!
 * Copyright (c) 2019-2020 Digital Bazaar, Inc. All rights reserved.
 */
import {LocalVerifiableCredentialStore} from 'bedrock-web-local-vc-store';
import mock from './mock.js';
import credentials from './credentials.js';
import {queryWithMatchingTrustedIssuer} from './query.js';
import PouchDB from 'pouchdb';
import pouchFind from 'pouchdb-find';
import pouchAdapter from 'pouchdb-adapter-memory';

PouchDB.plugin(pouchFind);
PouchDB.plugin(pouchAdapter);

const profileId = '123456';
const {AlumniCredential} = credentials;

describe('LocalVerifiableCredentialStore', () => {
  let invocationSigner;
  let keyResolver;
  let db;
  before(async () => {
    await mock.init();
    invocationSigner = mock.invocationSigner;
    keyResolver = mock.keyResolver;
  });

  beforeEach(async () => {
    db = new PouchDB('bedrock-web-local-vc-store-test', {
      adapter: 'memory'
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  after(async () => {
    mock.server.shutdown();
  });

  it('should insert a credential', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    const result = await localVcStore.insert({
      credential: AlumniCredential
    });

    result.should.be.an('object');
    result.ok.should.equal(true);
  });

  it('should get a credential', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});
    const {content: credential} = await localVcStore.get({
      id: AlumniCredential.id
    });

    credential.should.be.an('object');
    credential.should.deep.equal(AlumniCredential);
  });

  it('should find a credential using a string for type', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});
    const type = 'AlumniCredential';
    const [credential] = await localVcStore.find({type});
    const {content} = credential;

    content.should.be.an('object');
    content.should.deep.equal(AlumniCredential);
  });

  it('should find a credential using an array for type', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});
    const type = ['AlumniCredential', 'VerifiableCredential'];

    const [credential] = await localVcStore.find({type});
    const {content} = credential;

    content.should.be.an('object');
    content.should.deep.equal(AlumniCredential);
  });

  it('should fail to find a credential for a non-existent type', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});
    const type = 'KingCredential';
    const results = await localVcStore.find({type});
    const [credential] = results;

    results.length.should.equal(0);
    should.not.exist(credential);
  });

  it('should find a credential for a given parentId', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });
    const parentId = '1234';
    const meta = {
      parentId
    };

    await localVcStore.insert({credential: AlumniCredential, meta});

    const [credential] = await localVcStore.find({parentId});

    const {content} = credential;
    content.should.be.an('object');
    content.should.deep.equal(AlumniCredential);
  });

  it('should fail to find a credential for a non-existent parentId',
    async () => {
      const hub = await mock.createEdv({keyResolver});
      const localVcStore = new LocalVerifiableCredentialStore({
        db, edv: hub, invocationSigner, profileId
      });
      const parentId = '2345';

      await localVcStore.insert({credential: AlumniCredential});
      const results = await localVcStore.find({parentId});
      const [credential] = results;

      results.length.should.equal(0);
      should.not.exist(credential);
    });

  it('should not find credential when querying for an AlumniCredential ' +
    'with an issuer different from the issuer on the credential', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});

    const newCred = Object.assign({}, AlumniCredential, {id: 'foo'});
    await localVcStore.insert({credential: newCred});

    const queryWithNonMatchingTrustedIssuer =
      JSON.parse(JSON.stringify(queryWithMatchingTrustedIssuer));
    // Intentionally change the trustedIsser to a non matching one.
    queryWithNonMatchingTrustedIssuer.credentialQuery[0].trustedIssuer = [{
      id: 'urn:some:unmatching:issuer'
    }];
    const credentials = await localVcStore.match({
      query: queryWithNonMatchingTrustedIssuer
    });

    credentials.length.should.equal(0);
  });

  it('should throw error if "id" of a trustedIssuer is undefined', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});

    const newCred = Object.assign({}, AlumniCredential, {id: 'foo'});
    await localVcStore.insert({credential: newCred});

    const queryWithTrustedIssuerWithoutId =
      JSON.parse(JSON.stringify(queryWithMatchingTrustedIssuer));
    queryWithTrustedIssuerWithoutId.credentialQuery[0].trustedIssuer = [{}];
    let credentials;
    let err;
    try {
      credentials = await localVcStore.match({
        query: queryWithTrustedIssuerWithoutId
      });
    } catch(e) {
      err = e;
    }

    should.exist(err);
    err.name.should.equal('NotSupportedError');
    should.not.exist(credentials);
  });

  it('should find credential when querying for an AlumniCredential ' +
    'with a matching issuer', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});
    const credentials = await localVcStore.match({
      query: queryWithMatchingTrustedIssuer
    });

    credentials.length.should.equal(1);
    credentials[0].content.should.deep.equal(AlumniCredential);
  });

  it('should find credential when querying for an AlumniCredential ' +
    'with any issuer', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});
    const queryWithoutTrustedIssuer =
      JSON.parse(JSON.stringify(queryWithMatchingTrustedIssuer));
    delete queryWithoutTrustedIssuer.credentialQuery[0].trustedIssuer;

    const credentials = await localVcStore.match({
      query: queryWithoutTrustedIssuer
    });

    credentials.length.should.equal(1);
    credentials[0].content.should.deep.equal(AlumniCredential);
  });

  it('should delete an existing credential', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    await localVcStore.insert({credential: AlumniCredential});

    const result = await localVcStore.delete({id: AlumniCredential.id});

    result.ok.should.equal(true);
    let err;
    try {
      await localVcStore.get({id: AlumniCredential.id});
    } catch(e) {
      err = e;
    }
    should.exist(err);
    err.name.should.equal('NotFoundError');
  });

  it('should fail to delete a non-existent credential', async () => {
    const hub = await mock.createEdv({keyResolver});
    const localVcStore = new LocalVerifiableCredentialStore({
      db, edv: hub, invocationSigner, profileId
    });

    const result = await localVcStore.delete({id: AlumniCredential.id});
    result.should.equal(false);
  });
});
