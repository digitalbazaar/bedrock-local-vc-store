# Bedrock Local Verifiable Credentials Store _(bedrock-web-local-vc-store)_

> A Javascript library for locally storing Verifiable Credentials for Bedrock web apps

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Background

TBD

See also (related specs):

* [Verifiable Credentials Data Model](https://w3c.github.io/vc-data-model/)

## Install

To install locally (for development):

```
git clone https://github.com/digitalbazaar/bedrock-local-vc-store.git
cd bedrock-local-vc-store
npm install
```

## Usage

```js
import {LocalVerifiableCredentialStore} from 'bedrock-web-local-vc-store';

const dbName = 'example-db';
const localVcStore = new LocalVerifiableCredentialStore({dbName});


await localVcStore.insert({credential, meta});
```

## Contribute

See [the contribute file](https://github.com/digitalbazaar/bedrock/blob/master/CONTRIBUTING.md)!

PRs accepted.

Small note: If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Commercial Support

Commercial support for this library is available upon request from
Digital Bazaar: support@digitalbazaar.com

## License

[Bedrock Non-Commercial License v1.0](LICENSE.md) © Digital Bazaar
