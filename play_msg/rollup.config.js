import typescript from 'rollup-plugin-typescript2';
import { terser } from "@chiogen/rollup-plugin-terser";
import pkg from "./package.json";

export default [
    {
        input: './src/index.ts',
        output: [{
            format: 'cjs',
            file: pkg.main
        }],
        plugins: [
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: "esnext"
                    }
                }
            })
        ],
        external: ['tslib']
    },
    {
        input: './src/index.ts',
        output: [{
            format: 'es',
            file: pkg.module
        }],
        plugins: [
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: "esnext"
                    }
                }
            })
        ],
        external: ['tslib']
    },
    {
        input: './src/index.ts',
        output: [{
            name:pkg.name,
            format: 'umd',
            file: pkg.browser
        }],
        plugins: [
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: "esnext"
                    }
                }
            }), 
            terser()
        ],
        external: ['tslib']
    }
]