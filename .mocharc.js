'use strict';

// Here's a JavaScript-based config file.
// If you need conditional logic, you might want to use this type of config.
// Otherwise, JSON or YAML is recommended.

module.exports = {
  diff: true,
  extension: ['js'],
//   opts: './mocha.opts',
  package: './package.json',
  reporter: 'spec',
  slow: 75,
  timeout: 60000,
  recursive: "./integration_test/testcase/*.js",
  ui: 'bdd'
};