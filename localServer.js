const config = require('./config/config');
const path = require('path');
const express = require('express');
const app = express();

const generateOAuth = (req, res, next) => {
    console.log('LOGGED ' + req.method + ' REQ: ' + req.url);
    config.generateAuth();
    res.redirect(config.loginURL);
    next();
}
const getCode = (req, res, next) => {
    console.log("oriURL: " + req.originalUrl);
    let code = null;
    let index = req.originalUrl.indexOf("=");
    //TUDO: Maybe replace this index check with one that find the substring "code="
    if(req.originalUrl.indexOf("?code=") != -1) {
        code = req.originalUrl.slice(index + 1, req.originalUrl.length);
        config.setCode(code);
    } else {
        res.redirect('/login');
        //TUDO: Error message when Google does not return 
        next();
        return;
    }
    console.log("cutURL: " + code);
    console.log("configURL: " + config.clientCode);
    next();
}

async function launchServer() {
    //Use public directory - required if we want to serve styles/js in seperate sub-directories
    app.use(express.static(path.join(__dirname, 'public')));
    //Root
    app.use('/', express.static(path.join(__dirname, 'public', 'pages')));
    //Custom middleware on GET request to Google sign on
    app.get('/login', generateOAuth);
    app.get('/drive', getCode);
    //Set path aliases for other pages
    //app.use('/login', express.static(path.join(__dirname, 'public', 'pages/login.html')));
    app.use('/drive', express.static(path.join(__dirname, 'public', 'pages/drive.html')));

    app.listen(config.port, (/* req, res */) => {
        console.log('\033c');
        console.log('\x1b[34m', 'Local Server running on ' + config.url, '\x1b[0m');
    });
}

module.exports.launchServer = launchServer;