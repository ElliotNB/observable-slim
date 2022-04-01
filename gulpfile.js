const gulp = require('gulp');
const uglify = require('gulp-uglify-es').default;
const useref = require('gulp-useref');
const rename = require('gulp-rename');
const babel = require('gulp-babel');

gulp.task('default', (done) => gulp.src(['./observable-slim.js', './proxy.js'])
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
