'use strict'

import { join } from 'path';
import { app, BrowserWindow } from 'electron';

let win = null;

//TUDO: get user prefs from some config file
const getUserSettings = {
    width: 1000,
    height: 650,
    show: false
}

//TUDO: change to render process
function launchApp(){
    win = new BrowserWindow(getUserSettings)
    win.loadFile(join(__dirname,'src','index.html'))

    //Graceful display of renderer window
    win.once('ready-to-show', () => {
        win.show();
    })
}

//Launch app on ready
app.on('ready', launchApp)

//Exit process when user closes all GUI
app.on('window-all-closed', () => {
    app.quit();
})