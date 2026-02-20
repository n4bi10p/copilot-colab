/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

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
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [{ loader: "ts-loader", options: { configFile: "tsconfig.json" } }],
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
    resolve: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
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
    ],
  },
];
