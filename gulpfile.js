const gulp = require('gulp');
const inlinesource = require('gulp-inline-source');

gulp.task('inlinesource', function () {
    return gulp.src('./dist/*.html')
        .pipe(inlinesource({
            attribute: false,
            compress: false
        }))
        .pipe(gulp.dest('./build'));
});