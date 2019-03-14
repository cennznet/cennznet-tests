const NodeEnvironment = require('jest-environment-node');

class Environment extends NodeEnvironment {
    constructor(config) {
        super(
            Object.assign({}, config, {
                globals: Object.assign({}, config.globals, {
                    Uint8Array: Uint8Array,     // to sovle the Uint8Array issue
                    ArrayBuffer: ArrayBuffer,
                }),
            })
        );
    }
}

module.exports = Environment;

