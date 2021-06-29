# bedrock-web-local-vc-store Changelog

## 2.1.0 - 2021-TBD

### Added
- Add `meta.issuer` index field and fix `_query`.

## 2.0.0 - 2021-06-10

### Added
- Adds `profileId` param to all functions.

### Changed
- Fixes issue with indexing.

### Removed
- **BREAKING**: Removed `profileId` param from constructor.

## 1.1.0 - 2021-05-28

### Added
- Adds `match` API.
- Use `p-map@4`. v4 is being used because the ESM v5 does does not function
  properly with our tooling, specifically `mocha`.

### Changed
- Updates `find` API to accept an optional `type` parameter.

## 1.0.0 - 2021-05-06

### Added
- Initial commit.
