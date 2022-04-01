const process = require('process');
const path = require('path');
const gulp = require('gulp');
const uglify = require('gulp-uglify-es').default;
const useref = require('gulp-useref');
const rename = require('gulp-rename');
const mocha = require('gulp-mocha');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const shell = require('gulp-shell');

const observableSlimPath = './observable-slim.js';
const proxyPath = './proxy.js';
const testPath = './test/test.js';
const coverallsCoverageDirPath = './coverage';
const coverallsCoverageLcovPath = `${coverallsCoverageDirPath}/lcov.info`;
const coverallsBinPath = './node_modules/coveralls/bin/coveralls.js';
const coverallsCommand = (process.platform === 'win32')
// Windows (we have to resolve the paths).
	? `nyc report --reporter=lcov`
	+ ` && type ${path.resolve(coverallsCoverageLcovPath)} | ${path.resolve(coverallsBinPath)}`
	+ ` && rmdir /s /q ${path.resolve(coverallsCoverageDirPath)}`
// Linux.
	: `nyc report --reporter=lcov`
	+ ` && cat ${coverallsCoverageLcovPath} | ${coverallsBinPath}`
	+ ` && rm -rf ${coverallsCoverageDirPath}`;

gulp.task('default', (done) => gulp.src([observableSlimPath, proxyPath])
	.pipe(babel({
		presets: ['@babel/preset-env'],
		sourceType: 'script' // Prevent insertion of "use strict".
	}))
	.pipe(useref())
	.pipe(uglify())
	.pipe(rename({
		suffix: '.min' // Add .min to the minified filename.
	}))
	.pipe(gulp.dest('./')) // Write it to the current directory.
	.on('end', done)
);

gulp.task('test', (done) => gulp.src([testPath])
	.pipe(mocha({
		compilers: babel
	}))
	.on('end', done)
);

gulp.task('coveralls', shell.task([coverallsCommand]));

gulp.task('lint', (done) => gulp.src([observableSlimPath, proxyPath, testPath])
	.pipe(eslint())
	.pipe(eslint.format())
	.pipe(eslint.failOnError()) // Brick on failure to be super strict.
	.on('end', done)
);
