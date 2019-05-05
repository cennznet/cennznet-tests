/**
 * Prepare things before all tests.
 * Note:
 *      @ This file is configed in the 'scripts' section of package.json
 */

const { cryptoWaitReady } = require('@cennznet/util');

before( async () => {
    // init for simplyKeyring()
    await cryptoWaitReady()
})