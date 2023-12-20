[![Test](https://github.com/serprex/openEtG/workflows/.github/workflows/cargo-test.yml/badge.svg)](https://github.com/serprex/openEtG/actions?query=workflow%3A.github%2Fworkflows%2Fcargo-test.yml)

# openEtG

openEtG is an open source fork of the Flash ccg [Elements](http://elementsthegame.com).

## Developer Instructions

Copy `config-sample.json` to `config.json`, & `wsconfig-sample.json` to `wsconfig.json`

Configure `config.json` to connect your instance of postgresql.

_Note: following instructions have not been updated to include postgresql_

### Dependencies

1. git
1. node
1. postgresql
1. rustup
1. `cargo install wasm-bindgen-cli`

1. Clone the repository: `git clone https://github.com/serprex/openEtG && cd openEtG`
1. Install atlas files: `curl --compressed 'https://etg.dek.im/assets/{atlas.json,atlas.webp,atlas.css}' -o 'assets/#1'`

