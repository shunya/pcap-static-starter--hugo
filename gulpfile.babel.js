import gulp from "gulp";
import {spawn} from "child_process";
import hugoBin from "hugo-bin";
import gutil from "gulp-util";
import sass from "gulp-sass";
import postcss from "gulp-postcss";
import cssImport from "postcss-import";
import cssnext from "postcss-cssnext";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";

const options = require('yargs')
  .usage('Usage $0 <input> [options]')
  .describe('css-output-style', 'CSS output style')
  .choices('css-output-style', ['nested', 'expanded', 'compact', 'compressed'])
  .describe('css-source-comments', 'Include debug info')
  .boolean('css-source-comments')
  .alias('h', 'help')
  .help('h')
  .argv;

const browserSync = BrowserSync.create();

// Hugo arguments
const hugoArgsDefault = ["-d", "../dist", "-s", "site", "-v"];
const hugoArgsPreview = ["--buildDrafts", "--buildFuture"];

// Development tasks
gulp.task("hugo", (cb) => buildSite(cb));
gulp.task("hugo-preview", (cb) => buildSite(cb, hugoArgsPreview));

// Build/production tasks
gulp.task("build", ["sass", "js"], (cb) => buildSite(cb, [], "production"));
gulp.task("build-preview", ["sass", "js"], (cb) => buildSite(cb, hugoArgsPreview, "production"));

// Compile SASS into CSS & auto-inject into browsers
gulp.task('sass', () => {
  let sassOptions = {};
  sassOptions.outputStyle = options['css-output-style'] ? options['css-output-style'] : 'compact';
  sassOptions.sourceComments = options['css-source-comments'] ? options['css-source-comments'] : false;

  return gulp.src('./src/sass/**/*.scss')
    .pipe(sass(sassOptions).on('error', sass.logError))
    .pipe(gulp.dest('./dist/css'))
    .pipe(browserSync.stream());
});

// Compile Javascript
gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      colors: true,
      progress: true
    }));
    browserSync.reload();
    cb();
  });
});

// Development server with browsersync
gulp.task("server", ["hugo", "sass", "js"], () => {
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch('./src/sass/**/*.scss', ['sass']);
  gulp.watch("./site/**/*", ["hugo"]);
});

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = "development") {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}
