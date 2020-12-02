const path = require('path');

module.exports = {
  entry: './src/vuex-async-persist.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'vuex-async-persist.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
    library: 'Vuex-async-persist',
  },
};
