/*
 * grunt-cmd-pack
 *
 *
 * Copyright (c) 2014 xiaoxiong zhulin
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    var _ = require('underscore');
    var pack = require('../src/cmdpacker.js');
    // Merge task-specific and/or target-specific options with these defaults.

    var path = require('path');
    var cwd = process.cwd();

  grunt.registerTask('cmd_pack', 'cmd packer', function () {
      var options = this.options({
        root : './test/fixtures/',
        entry_point : './test/fixtures/index.js',
        target_point : './tmp/result.js',
         moduelJsPath : "/src/modules.js"
      });
      var argus = _.values(options).map(function (p) {
        return path.join(cwd, p);
      });
      pack.apply(this, argus);
  });


};
