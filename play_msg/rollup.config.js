// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json";

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        format: "cjs",
        file: pkg.main,
      },
    ],
    plugins: [
      typescript({
        compilerOptions: {
          declaration: false,
          declarationMap: false,
          module: "esnext",
        },
      }),
    ],
    external: ["tslib"],
  },
  {
    input: "./src/index.ts",
    output: [
      {
        format: "es",
        file: pkg.module,
      },
    ],
    plugins: [
      typescript({
        compilerOptions: {
          declaration: false,
          declarationMap: false,
          module: "esnext",
        },
      }),
    ],
    external: ["tslib"],
  },
  {
    input: "./src/index.ts",
    output: [
      {
        name: pkg.name,
        format: "umd",
        file: pkg.browser,
      },
    ],
    plugins: [
      typescript({
        compilerOptions: {
          declaration: false,
          declarationMap: false,
          module: "esnext",
        },
      }),
      terser(),
    ],
    external: ["tslib"],
  },
];
