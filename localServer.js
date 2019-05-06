const config = require('./config/config');
const path = require('path');
const express = require('express');
const app = express();

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
        res.redirect('/login');
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
    app.get('/login', generateOAuth);
    app.get('/direct', (req, res, next) => {
        getCode(req, res, next);
        config.generateToken(next);
    }, (req, res, next) => {
        res.redirect('/drive');
        next();
    });
    //app.get('/drive', getCode);
    //Set path aliases for other pages
    //app.use('/login', express.static(path.join(__dirname, 'public', 'pages/login.html')));
    app.use('/drive', express.static(path.join(__dirname, 'public', 'pages/drive.html')));

    app.listen(config.port, (/* req, res */) => {
        console.log('\033c');
        console.log('\x1b[34m', 'Local Server running on ' + config.url, '\x1b[0m');
    });
}

var ipc = require('electron').ipcMain;

ipc.on('invokeAction', function (event, data) {
    function sendData(data) {
        console.log(data[0][0]);
        console.log('Run Good');
        event.sender.send('actionReply', data);
    }
    config.listFiles(sendData);
});

module.exports.launchServer = launchServer;


const fs = require('fs');
const crypto = require('crypto');
handleDocuments()

async function getSecretKey(callback) { //gets the symmetric key used to store unshared docs
    fs.stat(".secretkey", function (err, stats) {
        if (err) {
            if (err.code == "ENOENT") { // if key doesnt exist, make it
                let key = crypto.randomBytes(32)
                fs.writeFile(".secretkey", key, function (err) {
                    if (err) throw err
                })
                return callback(key)
            } else throw err //throw other errors
        }
        fs.readFile(".secretkey", function (err, rawfilecontents) { // if file exists read key
            if (err) throw err
            return callback(rawfilecontents)
        })
    })
}


function encryptFile(filename) {
    getSecretKey(function (key) {
        fs.readFile("./Documents/" + filename, function (err, rawfilecontents) {
            if (err) {
                console.log("error opening the file ./Documents/" + filename)
                console.dir(err)
                throw err
            }

            let iv = crypto.randomBytes(16)
            let cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
            let ciphertext = cipher.update(rawfilecontents, 'binary', 'binary')

            console.log(typeof (ciphertext))

            fs.mkdir("./.uploading", function () {
                fs.writeFile("./.uploading/" + filename + ".encrypted", ciphertext, { encoding: 'binary' }, function (err) {
                    if (err) {
                        console.log("error writing to file ")
                        console.log("./.uploading/" + filename + ".encrypted")
                        throw err
                    }
                })
                console.log("IV for file " + filename + " is :")
                console.dir(iv)
                //TODO store IV somehow
                //we can store it on google drive with  "custom file properties", basically metadata https://developers.google.com/drive/api/v3/properties
                //but not sure how to get it to there?

            })
        })
    })
}

async function handleDocuments(aesKey) {
    fs.mkdir("./Documents", function () {
        //this initial one-time read isnt recursive (yet)
        fs.readdir("./Documents", { withFileTypes: false }, function (err, files) {
            //get the encryption key and encrypt files
            for (var file of files) {
                console.log(file)
                //open the file:
                encryptFile(file)

            }
        })
        //setup watch on filedirectory
        fs.watch("./Documents", { recursive: true }, function (eventname, filename) {
            console.log("CHANGE DETECTED OF TYPE " + eventname + " on file " + filename)
            //change means file contents changed
            //rename means creation/deletion/rename
            if (eventname == "change") {
                encryptFile(filename)
            }
        })
    })
}
