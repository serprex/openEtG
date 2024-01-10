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
   - Specify the host of your postgres server
   - Specify the port number of your postgres server
   - Specify the database name you created on your postgres server
   - If certificates are required to access your instance, they can be included under the `certs` key

### Dependencies

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
