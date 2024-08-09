const path = require('path');

module.exports = {
    entry: path.resolve(__dirname, './src/index.ts'),
    // mode: 'production',
    mode: 'development',
    devtool: "inline-source-map",
    context: path.resolve(__dirname),
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: "qooando-text-parser.js"
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            }
        ]
    }
};