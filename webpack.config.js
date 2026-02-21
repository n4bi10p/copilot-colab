/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
require("dotenv").config();

/** @type {import('webpack').Configuration[]} */
module.exports = [
  // ── Extension Host (Node / VS Code context) ──────────────────────────────
  {
    name: "extension",
    target: "node",
    mode: "none",
    entry: "./src/extension/index.ts",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "extension.js",
      libraryTarget: "commonjs2",
    },
    externals: { vscode: "commonjs vscode" },
    resolve: { extensions: [".ts", ".js"] },
    // Strip all comments (incl. //# sourceMappingURL) from bundled dependencies
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: { format: { comments: false } },
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [{ loader: "ts-loader", options: { configFile: "tsconfig.extension.json" } }],
          exclude: /node_modules/,
        },
      ],
    },
  },
  // ── Webview (Browser context) ────────────────────────────────────────────
  {
    name: "webview",
    target: "web",
    mode: "none",
    entry: "./src/webview/index.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "webview.js",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      fallback: {
        process: require.resolve("process/browser"),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: "ts-loader",
              options: { configFile: "tsconfig.webview.json" },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            "postcss-loader",
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: "webview.css" }),
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
        __SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL || ""),
        __SUPABASE_ANON_KEY__: JSON.stringify(process.env.SUPABASE_ANON_KEY || ""),
      }),
    ],
  },
];
