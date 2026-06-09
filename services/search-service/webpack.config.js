const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

/** Externalize every node_modules package except workspace libs (@org/*). */
function externals({ request }, callback) {
  // Bundle: relative, Unix absolute, Windows absolute paths, and workspace libs.
  if (/^([./]|[a-zA-Z]:[/\\])/.test(request)) return callback();
  if (request.startsWith('@org/')) return callback();
  // Everything else (node_modules) is required at runtime.
  return callback(null, 'commonjs2 ' + request);
}

module.exports = {
  externals: [externals],
  resolve: {
    conditionNames: ['@org/source', 'require', 'node', 'default'],
  },
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      mergeExternals: true,
    }),
  ],
};
