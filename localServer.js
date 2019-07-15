const config = require('./config/config');
const path = require('path');
const express = require('express');
const app = express();
const { dialog } = require('electron');

const generateOAuth = (req, res, next) => {
    config.generateAuth();
    res.redirect(config.loginURL);
    next();
}

const getCode = (req, res, next) => {
    let code = null;
    const index = req.originalUrl.indexOf("=");
    if (req.originalUrl.indexOf("?code=") != -1) {
        code = req.originalUrl.slice(index + 1, req.originalUrl.length);
        config.setCode(code);
    } else {
        res.redirect(config.paths.login);
        //TUDO: Error message when Google does not return 
        return;
    }
    return
}

function launchServer() {
    //Use public directory - required if we want to serve styles/js in seperate sub-directories
    app.use(express.static(path.join(__dirname, 'public')));
    //Root
    app.use('/', express.static(path.join(__dirname, 'public', 'pages')));
    //Custom middleware on GET request to Google sign on
    app.get(config.paths.login, generateOAuth);
    app.get(config.paths.direct, (req, res, next) => {
        getCode(req,res,next);
        config.generateToken(next);
    }, (req, res, next) => {
        //On Successful token generation, direct to drive page
        res.redirect(config.paths.drive);
        next();
    });
    //app.get('/drive', getCode);
    //Set path aliases for other pages
    //app.use('/login', express.static(path.join(__dirname, 'public', 'pages/login.html')));
    app.use(config.paths.drive, express.static(path.join(__dirname, 'public', 'pages' + config.paths.drive + '.html')));

    app.listen(config.port, (/* req, res */) => {
        console.log('\033c');
        console.log('\x1b[34m', 'Local Server running on ' + config.url, '\x1b[0m');
    });
}

var ipc = require('electron').ipcMain;

ipc.on('driveAction', (event, data) => {
    if(data[0].localeCompare('delete') == 0){
        config.deleteFile(data[1], () => { config.windows.win.reload() });
    }
    else if(data[0].localeCompare('download') == 0){
        config.downloadfile(data[1], () => { config.windows.win.reload() });
    }
    else if(data[0].localeCompare('share') == 0){
        config.getEmailList().forEach( (i) => {
            console.log('User: ' + i);
        });

        const emails = config.getEmailList() 

        var options = {
            buttons: emails,
        }

        dialog.showMessageBox(config.windows.win, options, (res) => {
            console.log("SHARING: " + data[1] + " with " + emails[res]);
            config.encryptFileForGroup(data[1], [emails[res]]);
        });
    }
    else{
        console.log('Unidentified Action');
    }
});

ipc.on('initial', (event) => {
    function sendData(data) {
        event.sender.send('actionReply', data);
    }
    if(config.hasRootID){
        config.listFiles(sendData, event);
    }
});

ipc.once('driveListeners', (event) => {
    function sendData(data) {
        event.sender.send('actionReply', data);
    }

    config.setListeners(event, () => {config.hasRootID = true; config.listFiles(sendData, event); });
});



module.exports.launchServer = launchServer;



