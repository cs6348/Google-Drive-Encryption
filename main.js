'use strict'

const path = require('path')
const {app, BrowserWindow} = require('electron')

let win = null;

const localWebConfig = {
    show: false,
    parent: win
}
//TUDO: get user prefs from some config file
const getUserSettings = {
    width: 1000,
    height: 650,
    show: false
}

//TUDO: change to render process
function launchApp(){
    win = new BrowserWindow(getUserSettings);

    //Clear Cache for changes
    const ses = win.webContents.session;
    ses.clearCache(() => {
        console.log("Cache Cleared")
    });

    //Application page now hosted on localhost
    //Because of Google Auth redirect
    let server = new BrowserWindow(localWebConfig);
    server.loadURL(path.join(__dirname,'src','renderer','server.html'));

    win.loadURL('http://localhost:8881');
    //win.loadFile(path.join(__dirname,'src','pages','index.html'));

    //Graceful display of renderer window - When Ready
    win.once('ready-to-show', () => {
        win.show();
    });

    //TUDO: Temporary - Force application to stop when main window is closed, should be a app.listener
    win.once('closed', () => {
        server.close();
        app.quit();
    })
}

//Launch app on ready
app.on('ready', launchApp);

//TODU: Make app exit more gracefully, depending on if we want a system tray or background process
//Exit process when user closes all GUI
app.on('window-all-closed', () => {
    app.quit();
})