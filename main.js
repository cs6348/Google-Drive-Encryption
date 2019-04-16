const {app, BrowserWindow} = require('electron');

let win = null;

app.on('ready', () => {
    win = new BrowserWindow({
        width: 1000,
        height: 850
    })

    win.loadURL('https://google.com');
})