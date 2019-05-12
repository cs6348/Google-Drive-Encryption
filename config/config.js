var ipc = require('electron').ipcRenderer;
const {google} = require('googleapis');
const fs = require('fs');
const crypto = require('crypto');
var folder;
var event;
var justUploaded = [];
var justDownloaded = [];

// TUDO: Do we want to make this a stateful configuration? I was thinking maybe
// we can store accounts here?
class Config {
  constructor() {
    // Backend
    this.address = 'localhost';
    this.port = '3000';
    this.url = 'http://' + this.address + ':' + this.port;
    // Google API
    this.auth = null;
    this.clientID =
        '591099849229-64p9t235epvh8t48ruirt0n2ag8qs502.apps.googleusercontent.com';
    this.clientSecret = 'I31wkLGps8aQDQnleIvp_Qv2';
    this.clientCode = null;
    this.clientToken = null;

    this.scopes = ['https://www.googleapis.com/auth/drive.appdata'];
    this.urlRedirect = this.url + '/direct';
    this.loginURL = null;

    // Main Window configuration
    this.winConfig = {
      width: 700,
      height: 800,
      show: false
    }
                     // BrowserWindow Object  S-Linking? TUDO
                     this.windows = {
      win: null
    }
  }
  // Get/Set client code sent by Google
  setCode(code) {
    this.clientCode = code
  }
  getCode() {
    return this.clientCode
  }

  // Generate an Auth request url from Google Api Console
  generateAuth() {
    this.auth = new google.auth.OAuth2(
        this.clientID, this.clientSecret, this.urlRedirect);
    let url = this.auth.generateAuthUrl(
        {access_type: 'offline', prompt: 'consent', scope: this.scopes});
    this.loginURL = url;
  }

  generateToken(callback) {
    this.auth.getToken(this.clientCode, (err, token) => {
      if (err)
        return console.error('Error retrieving token: ' + err);
      else {
        this.auth.credentials = token;
        this.clientToken = token;
        callback();
      }
    });
  }

  listFiles(callback, eventVal) {
    // Test Output
    event = eventVal;
    const drive = google.drive({version: 'v3', auth: this.auth});
    folder = [];
    drive.files.list(
        {
          spaces: 'appDataFolder',
          pageSize: 50,
          fields: 'nextPageToken, files(id, name)'
        },
        (err, res) => {
          if (err) {
            console.log('Error getting drive listing' + err);
            return;
          }
          const response = res.data.files;
          if (response.length) {
            // console.log('Files:\n-----------------------------------------');
            response.map((file) => {
              // console.log(`${file.name} : (${file.id})`);
              folder.push([file.name, file.id]);
            });
            callback(folder);
          } else {
            console.log('No Files :(');
          }
          this.handleDocuments()
          for (let obj of folder) {
            // var dest = fs.createWriteStream('./.downloading/' + obj[0] +
            // '.dl');
            if (obj[0] == 'TESTDOWNLOAD') {
              console.log('trying to download TESTDOWNLOAD');
              this.downloadfile(obj[1])
            }
          }
        });
  }


  downloadfile(fileid) {
    var self = this;
    const drive = google.drive({version: 'v3', auth: this.auth});

    drive.files
        .get({
          fileId: fileid,
          fields:
              'name, appProperties, createdTime, modifiedTime, modifiedByMeTime'

        })
        .then(function(file) {
          justDownloaded.push(file.data.name)
          console.log('Downloaded: ' + file.data.name);
          console.dir(file)
          let iv = Buffer.from(file.data.appProperties.IV, 'base64')
          let timestamp = file.data.modifiedTime
          drive.files.get({fileId: fileid, alt: 'media'})
              .then(function(filewithdata) {
                console.log('ENCRYPTED FILE CONTENTS:')
                console.dir(filewithdata.data)
                self.getSecretKey(function(key) {
                  let decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
                  let cleartext =
                      decipher.update(filewithdata.data, 'binary', 'binary')
                  console.log('CLEARTEXT: ' + cleartext)
                  fs.writeFile(
                      './Documents/' + file.data.name, cleartext,
                      {encoding: 'binary'}, function(err) {
                        if (err) {
                          console.log('error writing to file ')
                          console.log('./Documents/' + file.data.name)
                          throw err
                        } else {
                          console.log('WRITTEN TO FILE')
                        }
                      })
                })
              })
              .catch(function(err) {
                console.log('Error during second download', err);
              })
        })
        .catch(function(err) {
          console.log('Error during download', err);
        })
  }

  uploadfile(fileName, ciphertext, iv, callback) {
    justUploaded.push(fileName)
    const drive = google.drive({version: 'v3', auth: this.auth});
    var fileId = '';
    var fileMetadata;
    var media = {mimeType: 'application/octet-stream', body: ciphertext};
    var i;
    for (i = 0; i < folder.length; i++) {
      if (fileName == folder[i][0]) {
        // console.log("Match: "+folder[i][0]);
        fileId = folder[i][1];
        i = folder.length;
      }
    }
    if (fileId != '') {
      fileMetadata = {
        'name': fileName,
        'appProperties': {'IV': Buffer.from(iv).toString('base64')}
      };
      console.log(fileId);
      drive.files.update(
          {fileId: fileId, resource: fileMetadata, media: media, fields: 'id'})
    } else {
      fileMetadata = {
        'name': fileName,
        'parents': ['appDataFolder'],
        'appProperties': {'IV': Buffer.from(iv).toString('base64')}
      };
      drive.files.create(
          {resource: fileMetadata, media: media, fields: 'id'},
          function(err, file) {
            if (err) {
              // Handle error
              console.error(err);
            } else {
              console.log(
                  'Uploaded file \"' + fileName + '\", File Id: ', file.id);
            }
          });
    }
    // Still need to attack the IV to the file
    callback()
  }

  getSecretKey(callback) {  // gets the symmetric key used to store unshared
                            // docs
    fs.stat('.secretkey', function(err, stats) {
      if (err) {
        if (err.code == 'ENOENT') {  // if key doesnt exist, make it
          let key = crypto.randomBytes(32)
          fs.writeFile('.secretkey', key, function(err) {
            if (err) throw err
          })
          return callback(key)
        } else
          throw err  // throw other errors
      }
      fs.readFile(
          '.secretkey',
          function(err, rawfilecontents) {  // if file exists read key
            if (err) throw err
              return callback(rawfilecontents)
          })
    })
  }

  shareFile(filename, user) {
    // download filename's key file of username user

    // download key sharing file

    // decrypt the symmetric key with your private key pair

    // fetch user's public key from the public key folder

    // encrypt symmetric key with user's public key

    // append to the filename's key file

    // overwrite key file with new key file
  }
  encryptFile(filename) {
    let self = this;  // so we can get `this` inside anonymous functions
    this.getSecretKey(function(key) {
      fs.readFile('./Documents/' + filename, function(err, rawfilecontents) {
        if (err) {
          console.log('error opening the file ./Documents/' + filename)
          console.dir(err)
          throw err
        }

        let iv = crypto.randomBytes(16)
        let cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
        let ciphertext = cipher.update(rawfilecontents, 'binary', 'binary')


        self.uploadfile(filename, ciphertext, iv, function() {
          console.log('FINISHED AN UPLOAD')
        })

        // fs.mkdir("./.uploading", function () {
        //     fs.writeFile("./.uploading/" + filename + ".encrypted",
        //     ciphertext, { encoding: 'binary' }, function (err) {
        //         if (err) {
        //             console.log("error writing to file ")
        //             console.log("./.uploading/" + filename + ".encrypted")
        //             throw err
        //         }
        //     })
        //     console.log("IV for file " + filename + " is :")
        //     console.dir(iv)
        //     //TODO store IV somehow
        //     //we can store it on google drive with  "custom file properties",
        //     basically metadata
        //     https://developers.google.com/drive/api/v3/properties
        //     //but not sure how to get it to there?

        // })
      })
    })
  }

  handleDocuments() {
    let self = this;  // so we can get `this` inside anonymous functions
    fs.mkdir('./Documents', function() {
      // this initial one-time read isnt recursive (yet)
      fs.readdir('./Documents', {withFileTypes: false}, function(err, files) {
        // get the encryption key and encrypt files
        for (var file of files) {
          // console.log(file)
          // open the file:
          self.encryptFile(file)
        }
        self.reload();
      })
      // setup watch on filedirectory
      console.log('Setup File watch!')
      var diskchanges = [];
      fs.watch('./Documents', {recursive: true}, function(eventname, filename) {
        console.log(
            'CHANGE DETECTED OF TYPE ' + eventname + ' ON FILE ' + filename)
        // change means file contents changed
        // rename means creation/deletion/rename
        if (eventname == 'change') {
          // These events always seem to be triggered twice. so we log them the
          // first time so that we can ignore them the second
          let wasjustchanged = false;
          let changedindex = -1;
          for (let i in diskchanges) {
            if (!wasjustchanged) {
              if (diskchanges[i] == filename) {
                wasjustchanged = true
                changedindex = i
              }
            }
          }

          if (wasjustchanged) {
            // ignoring the duplicate change
            console.log('duplicate change - ignored')
            diskchanges.splice(changedindex, 1)
          } else {
            diskchanges.push(filename)
            let wasjustdownloaded = false;
            let downloadindex = -1;
            for (let i in justDownloaded) {
              if (!wasjustdownloaded) {
                if (justDownloaded[i] == filename) {
                  wasjustdownloaded = true
                  downloadindex = i
                }
              }
            }
            if (wasjustdownloaded) {
              // remove from the list
              console.log(
                  'change detected but it was a file we just downloaded so lets ignore it')
              justDownloaded.splice(downloadindex, 1)
            } else {
              console.log('change detected and it seems to be legitimate')
              self.encryptFile(
                  filename,
              )
            }
          }
        }
      })
    })
  }
  // reloads the gui of the folder page.
  reload() {
    event.sender.send('actionReply', folder);
    console.log('reloaded')
  }
}



module.exports = new Config();