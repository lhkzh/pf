const gulp = require('gulp');
const rollup = require('rollup');
const ts = require('gulp-typescript');
const dts = require('dts-bundle');
const tsProject = ts.createProject('tsconfig.json', { declaration: true });

const model_name = JSON.parse(require("fs").readFileSync("./package.json","utf-8")).name;

gulp.task('buildJs', () => {
    return tsProject.src().pipe(tsProject()).pipe(gulp.dest('./build'));
})
gulp.task("rollupCjs", async function () {
    let config = {
        input: "build/index.js",
        external: [],
        output: {
            file: 'index.cjs',
            format: 'cjs',
            extend: true,
            name: model_name,
        }
    };
    const subTask = await rollup.rollup(config);
    await subTask.write(config);
});
gulp.task("rollup", async function () {
    let config = {
        input: "build/index.js",
        external: [],
        output: {
            file: 'index.mjs',
            format: 'esm',
            extend: true,
            name: model_name,
        }
    };
    const subTask = await rollup.rollup(config);
    await subTask.write(config);
});

gulp.task('buildDts', function () {
    return new Promise(function (resolve, reject) {
        dts.bundle({ name: model_name, main: "./build/index.d.ts", out: "../index.d.ts" });
        resolve();
    });
})

gulp.task('build', gulp.series(
    'buildJs',
    'rollupCjs',
    'rollup',
    'buildDts'
))