const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: './build/index.js',
    output: {
        filename: 'tokenizer.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'Tokenizer'
    },
    plugins: [
        new UglifyJSPlugin()
    ]
};
