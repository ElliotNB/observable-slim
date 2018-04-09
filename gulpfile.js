var gulp = require('gulp');
var uglify = require('gulp-uglify');
var gulpIf = require('gulp-if');
var useref = require('gulp-useref');
var rename = require('gulp-rename');
var mocha = require('gulp-mocha');
var chai = require('chai');
var babel = require('gulp-babel');

gulp.task('default', function(){
  return gulp.src(['observable-slim.js'])
	.pipe(useref())
	// Minifies only if it's a JavaScript file
	.pipe(uglify())
	// Add .min to the minified filename
	.pipe(rename({ suffix: '.min' }))
	// Write it to the current directory
	.pipe(gulp.dest('./'))
});

gulp.task('test', function() {
	return gulp.src(['test/test.js']).pipe(mocha({compilers:babel}));
});