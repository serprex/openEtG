[![Test](https://github.com/serprex/openEtG/workflows/.github/workflows/cargo-test.yml/badge.svg)](https://github.com/serprex/openEtG/actions?query=workflow%3A.github%2Fworkflows%2Fcargo-test.yml)

openEtG is an open source fork of the Flash ccg [Elements the Game](http://elementsthegame.com).

## Developer Instructions

### Getting Started
1. Download all dependencies listed below
2. Clone the repository:
   ```sh
   git clone https://github.com/serprex/openEtG && cd openEtG
   ```
3. Install packages:
   ```sh
   npm install
   ```
4. Generate asset atlas:
   ```sh
   npm run build-atlas
   ```
5. Copy sample configuration files:
   ```sh
   cp config-sample.json config.json
   cp wsconfig-sample.json wsconfig.json
   ```
6. Configure `config.json` to connect your instance of postgresql
   - Specify the http port you will listen on for web service requests
     - This should match your `wsconfig.json` `wsport`
   - Specify the user to connect your postgres server
     - Ensure that you created the user on your postgres server and provided proper permissions
   - Specify the host of your postgres server
   - Specify the port number of your postgres server
   - Specify the database name you created on your postgres server
   - If certificates are required to access your instance, they can be included under the `certs` key
7.
   - `psql -f scripts/initdb.sql` will generate initial schema
8. Install WASM rust target
   ```sh
   rustup target add wasm32-unknown-unknown
   ```
9. Build
   ```sh
   npm run build
   ```
10. Run server
   ```sh
   cd ./src/rs/server
   cargo run
   ```
### Testing

1. Add unit tests to `lib.rs`
2. To run unit tests:
   ```sh
   cargo test --manifest-path=./src/rs/Cargo.toml
   ```

## Dependencies

1. [git](http://git-scm.com)
1. [nodejs](https://nodejs.org)
1. [postgresql](https://www.postgresql.org/)
1. [rustup](https://rustup.rs)
1. [wasm-bindgen-cli](https://rustwasm.github.io/wasm-bindgen/reference/cli.html)
1. [cwebp](https://developers.google.com/speed/webp/docs/cwebp)
