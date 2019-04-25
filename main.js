'use strict'

const path = require('path');
const {app, BrowserWindow} = require('electron');
const {launchServer} = require('./localServer');
const global = require('./config/config');

let win = null;

function launchApp(){
    win = new BrowserWindow({width: 600, height: 600});

    //Start local server; needed for login redirect
    console.log('\x1b[34m', 'Starting Development Server on ' + global.url + '...', '\x1b[0m');
    try {
        launchServer();
    }catch(e) {
        console.log('Failed to initialize application:\n' + e);
    }

    //win loads application address
    win.loadURL('http://' + global.url);

    //Graceful display of renderer window
    win.once('ready-to-show', () => {
        win.show();
    })
}

//Launch app on ready
app.on('ready', launchApp);

//Exit process when user closes all GUI
app.on('window-all-closed', () => {
    app.quit();
});