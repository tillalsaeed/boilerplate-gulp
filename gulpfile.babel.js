import { src, dest, watch, series, parallel } from "gulp";
import yargs from "yargs";
import cleanCss from "gulp-clean-css";
import gulpif from "gulp-if";
import postcss from "gulp-postcss";
import sourcemaps from "gulp-sourcemaps";
import autoprefixer from "autoprefixer";
import named from "vinyl-named";
import dartSass from "sass";
import gulpSass from "gulp-sass";
import imagemin from "gulp-imagemin";
import webpack from "webpack-stream";
import browserSync from "browser-sync";
import zip from "gulp-zip";
import replace from "gulp-replace";
import info from "./package.json";
import wpPot from "gulp-wp-pot";

import del from "del";

const sass = gulpSass(dartSass);
const PRODUCTION = yargs.argv.prod;

/*************************************
 *  Server Task
 * *********************************** */

const server = browserSync.create();
export const serve = (done) => {
  server.init({
    proxy: "http://localhost/yourFolderName", // put your local website link here
  });
  done();
};
export const reload = (done) => {
  server.reload();
  done();
};

/*************************************
 *  Css Task
 * *********************************** */

export const styles = () => {
  return src("src/scss/bundle.scss")
    .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
    .pipe(sass().on("error", sass.logError))
    .pipe(gulpif(PRODUCTION, postcss([autoprefixer])))
    .pipe(gulpif(PRODUCTION, cleanCss({ compatibility: "ie8" })))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(dest("dist/css"));
};

/*************************************
 *  Image Task
 * *********************************** */

export const images = () => {
  return src("src/images/**/*.{jpg,jpeg,png,svg,gif}")
    .pipe(gulpif(PRODUCTION, imagemin()))
    .pipe(dest("dist/images"));
};

/*************************************
 *  Copy Task
 * *********************************** */

export const copy = () => {
  return src([
    "src/**/*",
    "!src/{images,js,scss}",
    "!src/{images,js,scss}/**/*",
  ]).pipe(dest("dist"));
};

/*************************************
 *  Clean Task
 * *********************************** */

export const clean = () => del(["dist"]);

/*************************************
 *  Scripts Task
 * *********************************** */
export const scripts = () => {
  return src(["src/js/bundle.js", "src/js/admin.js"])
    .pipe(named())
    .pipe(
      webpack({
        module: {
          rules: [
            {
              test: /\.js$/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: [],
                },
              },
            },
          ],
        },
        mode: PRODUCTION ? "production" : "development",
        devtool: !PRODUCTION ? "inline-source-map" : false,
        output: {
          filename: "[name].js",
        },
        externals: {
          jquery: "jQuery",
        },
      })
    )
    .pipe(dest("dist/js"));
};

/*************************************
 *  Compress Task
 * *********************************** */

export const compress = () => {
  return src([
    "**/*",
    "!node_modules{,/**}",
    "!bundled{,/**}",
    "!src{,/**}",
    "!.babelrc",
    "!.gitignore",
    "!gulpfile.babel.js",
    "!package.json",
    "!package-lock.json",
  ])
    .pipe(replace("_themename", info.name))
    .pipe(zip(`${info.name}.zip`))
    .pipe(dest("bundled"));
};

/*************************************
 *  Pot Task
 * *********************************** */
export const pot = () => {
  return src("**/*.php")
    .pipe(
      wpPot({
        domain: "_themename",
        package: info.name,
      })
    )
    .pipe(dest(`languages/${info.name}.pot`));
};

/*************************************
 *  Watch Task
 * *********************************** */

export const watchForChanges = () => {
  watch("src/scss/**/*.scss", styles);
  watch("src/images/**/*.{jpg,jpeg,png,svg,gif}", images);
  watch(
    ["src/**/*", "!src/{images,js,scss}", "!src/{images,js,scss}/**/*"],
    copy
  );
  watch("src/js/**/*.js", scripts);
};

export const dev = series(
  clean,
  parallel(styles, images, copy, scripts),
  watchForChanges
);
export const build = series(
  clean,
  parallel(styles, images, copy, scripts),
  pot,
  compress
);

export default dev;
