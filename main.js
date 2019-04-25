'use strict'

const path = require('path');
const {app, BrowserWindow} = require('electron');
const {launchServer} = require('./localServer');
const config = require('./config/config');

let win = null;

function launchApp(){
    win = new BrowserWindow(config.winConfig);

    //Start local server; needed for login redirect
    //TUDO: Am I using Async correct here? lol
    try { 
        //Browser Cache keeps index.html from updated sometimes
        //Clear cache before loading server
        win.webContents.session.clearCache(() => {
                console.log('\tCleared Browser Cahce');
            }
        );
        launchServer();
    }
    catch(e) { 
        console.log('Failed to initialize application:\n' + e); 
        app.quit();
    }

    //win loads application address
    win.loadURL(config.url);

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