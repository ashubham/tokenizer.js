// Karma configuration
// Generated on Tue Oct 31 2017 06:17:31 GMT-0700 (PDT)
let path = require('path');

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'source-map-support'],


    // list of files / patterns to load in the browser
    files: [
      'build/test/*.js'
    ],


    // list of files to exclude
    exclude: [
      'build/index.js'
    ],

    webpack: {
        devtool: 'inline-source-map',
        module: {
          rules: [
            {
              test: /\.js$/,
              exclude: /node_modules/,
              loader: 'istanbul-instrumenter-loader'
          }
          ]
        }
    },


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'dist/test/*.js': ['webpack', 'sourcemap']
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage-istanbul'],

    coverageIstanbulReporter: { 
      // reports can be any that are listed here: https://github.com/istanbuljs/istanbuljs/tree/aae256fb8b9a3d19414dcf069c592e88712c32c6/packages/istanbul-reports/lib
      reports: ['html', 'lcovonly', 'text-summary'],
      // base output directory. If you include %browser% in the path it will be replaced with the karma browser name
      dir: path.join(__dirname, 'coverage')
    },
    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-webpack',
      'karma-sourcemap-loader',
      'karma-source-map-support',
      'karma-coverage-istanbul-reporter'
    ]
  })
}
