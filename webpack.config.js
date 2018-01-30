const CopyWebpackPlugin = require("copy-webpack-plugin");
const MinifyPlugin = require("babel-minify-webpack-plugin");
const path = require("path");
const UnzipsfxPlugin = require("unzipsfx-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  target: "node",
  externals: {
    "electron": "electron",
    "original-fs": "original-fs"
  },
  output: {
    path: path.join(__dirname, "build", "local-storage"),
    filename: "index.js"
  },
  plugins: [
    new CopyWebpackPlugin([{from: "package.json"}]),
    new MinifyPlugin(),
    new ZipPlugin({
      path: path.join(__dirname, "build"),
      filename: "local-storage"
    }),
    new UnzipsfxPlugin({
      outputPath: path.join(__dirname, "build"),
      outputFilename: "local-storage"
    })
  ]
};
