[![Test](https://github.com/serprex/openEtG/workflows/.github/workflows/cargo-test.yml/badge.svg)](https://github.com/serprex/openEtG/actions?query=workflow%3A.github%2Fworkflows%2Fcargo-test.yml)

# openEtG

openEtG is an open source fork of the Flash ccg [Elements](http://elementsthegame.com).

## Developer Instructions

### Getting Started
1. Download all dependencies listed below
2. Clone the repository:
   ```bash
   git clone https://github.com/serprex/openEtG && cd openEtG
3. Install atlas files:
   ```bash
   curl --compressed 'https://etg.dek.im/assets/{atlas.json,atlas.webp,atlas.css}' -o 'assets/#1'
4. Copy sample configuration files:
   ```bash
   cp config-sample.json config.json
   cp wsconfig-sample.json wsconfig.json
5. Configure `config.json` to connect your instance of postgresql
   - Specify the http port you will listen on for web service requests
     - This should match your `wsconfig.json` `wsport`
   - Specify the user to connect your postgres server
     - Ensure that you created the user on your postgres server and provided proper permissions
       - `postgres` is default administrative account
       - `initdb.sql` script will generate a userrole `Codesmith` by default to enable special in-game commands
       - You can verify your specified DB was created with:
         ```bash
         psql -d postgres -c "select * from pg_database;"
   - Specify the host of your postgres server
   - Specify the port number of your postgres server
   - Specify the database name you created on your postgres server
   - If certificates are required to access your instance, they can be included under the `certs` key
6. Build
   - Compile to WebAssembly using Rust's compiler/package manager
     ```bash
     cargo build --release --manifest-path ../openEtG/src/rs/server/Cargo.toml --target wasm32-unknown-unknown
   - Generate JavaScript and TypeScript bindings to the output directories
     - This will generate:
       1. `_bg.js` in `./pkg` as the translator between JS and WAsm
       2. `_bg.wasm` in `./pkg` as a background support for the WAsm
       3. The primary `.wasm` file in the `./release` folder
       ```bash
       wasm-bindgen --no-typescript --weak-refs --out-dir ./src/rs/pkg ./src/rs/target/wasm32-unknown-unknown/release/etg.wasm
   - Tell Webpack to build the Javascript and other assets specified in `webpack.config.js` for a specific distribution mode
     ```bash
     webpack --mode=production
8. Clean up hanging build files to prevent build-caching issues (optional)
   ```bash
   cargo sweep ../openEtG/src/rs/server -i

### Testing

1. Add unit tests to `lib.rs` and tag them with `[#test]`. _When generating tests, apply the MVP philosophy to keep lib.rs small_
2. To run unit tests:
   ```bash
   cargo test --lib --manifest-path=../openEtG/src/rs/Cargo.toml
3. To run a fully test:
   ```bash
   cargo test --manifest-path==../openEtG/src/rs/Cargo.toml

## Dependencies

1. git
1. nodejs
1. postgresql
1. rustup
   - Install
	   ```bash
	   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
	   ```
   - Update your terminals environment parameters, or reboot
	   ```bash
	   source "$HOME/.cargo/env"
1. rust's JavaScript type translation which allows JavaScript to call Rust APIs and Rust functions to catch JavaScript exceptions
   ```bash
   cargo install wasm-bindgen-cli

### Optional

1. cargo sweep helps to clean up caching issues between builds 
   ```bash
   cargo install cargo-sweep
