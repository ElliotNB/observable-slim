var gulp = require('gulp');
var uglify = require('gulp-uglify-es').default;
var gulpIf = require('gulp-if');
var useref = require('gulp-useref');
var rename = require('gulp-rename');
var mocha = require('gulp-mocha');
var chai = require('chai');
var babel = require('gulp-babel');
var eslint = require('gulp-eslint');
var istanbul = require('gulp-istanbul');
var gutil = require('gulp-util');

gulp.task('default', function(){
	return gulp.src(['observable-slim.js','proxy.js'])
		.pipe(useref())
		// Minifies only if it's a JavaScript file
		.pipe(uglify())
		//.on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); })
		// Add .min to the minified filename
		.pipe(rename({ suffix: '.min' }))
		// Write it to the current directory
		.pipe(gulp.dest('./'))
});

gulp.task('pre-test', function () {
	return gulp.src(['observable-slim.js'])
	// Covering files
	.pipe(istanbul())
	// Force `require` to return covered files
	.pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function() {
	return gulp.src(['test/test.js'])
	.pipe(mocha({compilers:babel}))
	// Creating the reports after tests ran
    .pipe(istanbul.writeReports());
});

gulp.task('lint', function() {
	return gulp.src(['observable-slim.js','proxy.js','test/test.js'])
	.pipe(eslint())
	.pipe(eslint.format())
	// Brick on failure to be super strict
	.pipe(eslint.failOnError());
});