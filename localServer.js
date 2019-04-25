const config = require('./config/config');
const path = require('path');
const express = require('express');
const app = express();

async function launchServer() {
    console.log('\x1b[34m', 'Starting Development Server on ' + config.url + '...', '\x1b[0m');
    app.use(express.static(path.join(__dirname, 'public')));

    //Serve Homepage (Google login)
    app.get('/', (req, res) => {
        res.redirect('pages');
    });
    //Serve personal drive page (after login)
    app.get('/drive', (req, res) => {
        res.redirect('pages/drive.html');
    })
    app.listen(config.port);
}

module.exports.launchServer = launchServer;