const {src, dest, parallel, series, watch} = require('gulp')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')
const { execSync, exec } = require('child_process')
// gulp
const template = require('gulp-template')
const babel = require('gulp-babel')
const uglify = require('gulp-uglify') // js代码压缩
const obfuscate = require('gulp-javascript-obfuscator') // js代码混淆
const minifyCss = require('gulp-clean-css')
const connect= require('gulp-connect')

const getProcessArgv = () => {
    const arr = process.argv;
    let obj = {}
    for (let i = 0; i < arr.length; i+=2) {
        obj[arr[i].replace(/^(\-\-)/g, '')] = arr[i+1]
    }
    return JSON.parse(JSON.stringify(obj))
}

const options = getProcessArgv();

const ENV_PATH_DEFAULT = path.resolve(__dirname, '.env');
let ENV_CONFIG = {};
if (fs.existsSync(ENV_PATH_DEFAULT)) {
    ENV_CONFIG = dotenv.parse(fs.readFileSync(ENV_PATH_DEFAULT));
}
if (options.env) {
    const _p = path.resolve(__dirname, '.env.' + options.env);
    if (fs.existsSync(_p)) {
        ENV_CONFIG = Object.assign(ENV_CONFIG, dotenv.parse(fs.readFileSync(_p)))
    }
}

function clean () {
    return new Promise((resolve) => {
        const _p = path.resolve(__dirname, './dist')
        if (fs.existsSync(_p)) {
            execSync('rm -rf ./dist')
        }
        resolve();
    })
        
}

function taskEnvFormat(devTask, prodTask) {
    if (options.env === 'production') {
        return prodTask();
    }
    return devTask();
}

function envTask () {
    return src('src/env/index.js')
    .pipe(template({
        config: JSON.stringify(ENV_CONFIG)
    }))
    .pipe(dest('dist/env/'))
}

function homePage () {
    return src('src/index.html')
    .pipe(dest('dist/'))
}

function pagesTask () {
    return src('src/pages/*.html')
    .pipe(dest('dist/pages/'))
}

function jsMiniTask() {
    return src('src/js/*.js')
    .pipe(babel({
        presets: ['@babel/preset-env']
    }))
    .pipe(uglify({}))
    .pipe(obfuscate({
        compact: true
    }))
    .pipe(dest('dist/js/'))
}
function jsDevTask () {
    return src('src/js/*.js')
    .pipe(dest('dist/js/'))
}

function cssMinifyTask () {
    return src('src/css/*.css')
    .pipe(minifyCss())
    .pipe(dest('src/css/'))
}

function cssDevTask () {
    return src('src/css/*.css')
    .pipe(dest('src/css/'))
}

function imgTask() {
    return src('src/static/*.*')
    .pipe(dest('src/static/'))
}

function cssTask() {
    return taskEnvFormat(cssDevTask, cssMinifyTask)
}

function jsTask () {
    return taskEnvFormat(jsDevTask, jsMiniTask);
}


function startServer () {
    connect.server({
        root: './dist',
        livereload: true,
        port: 8080
    })
}

function watchAssets() {
    watch('src/index.html', homePage);
    watch('src/js/*.js', jsTask)
    watch('src/css/*.css', cssTask)
    watch('src/env/index.js', envTask)
    watch('src/pages/*.html', pagesTask)
    watch('src/static/*.*', imgTask)
}

exports.build = series(clean, homePage, envTask, pagesTask, jsTask, cssTask, imgTask);;

exports.server = series(this.build, watchAssets);