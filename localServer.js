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
async function launchServer() {
    //Use public directory - required if we want to serve styles/js in seperate sub-directories
    app.use(express.static(path.join(__dirname, 'public')));
    //Root
    app.use('/', express.static(path.join(__dirname, 'public', 'pages')));
    //Custom middleware on GET request to Google sign on
    app.get('/login', generateOAuth);
    //Set path aliases for other pages
    app.use('/login', express.static(path.join(__dirname, 'public', 'pages/login.html')));
    app.use('/drive', express.static(path.join(__dirname, 'public', 'pages/drive.html')));

    app.listen(config.port, (res, req) => {
        console.log('\033c');
        console.log('\x1b[34m', 'Local Server running on ' + config.url, '\x1b[0m');
    });
}

module.exports.launchServer = launchServer;