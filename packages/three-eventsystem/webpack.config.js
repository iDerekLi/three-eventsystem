const { version } = require("./package.json");
const path = require("path");
const webpack = require("webpack");
const WebpackBar = require("webpackbar");

const banner = `
three-eventsystem v${version}

Copyright (c) 2021-present Derek Li
Released under the MIT License - https://choosealicense.com/licenses/mit/

https://github.com/iDerekLi/three-eventsystem
`;

const isMinify = process.argv.indexOf("-p") !== -1;

module.exports = {
  entry: {
    "three-eventsystem": "./src/index.js"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    library: "THREE.EventSystem",
    libraryTarget: "umd",
    filename: isMinify ? "[name].min.js" : "[name].js",
    umdNamedDefine: true,
    // https://github.com/webpack/webpack/issues/6522
    globalObject: "typeof self !== 'undefined' ? self : this"
  },
  resolve: {
    extensions: [".js", ".ts", ".json"]
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          // enable sub-packages to find babel config
          options: {
            rootMode: "upward"
          }
        }
      }
    ]
  },
  optimization: {
    minimize: isMinify
  },
  plugins: [
    new webpack.BannerPlugin(banner.trim()),
    new WebpackBar({
      name: "Build",
      color: "#42a5f5"
    })
  ],
  devtool: "source-map"
};
