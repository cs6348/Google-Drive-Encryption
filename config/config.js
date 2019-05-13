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

    // local web paths
    this.paths =
        {index: '/index', drive: '/drive', login: '/login', direct: '/direct'};

    // Google Auth
    this.scopes = ['https://www.googleapis.com/auth/drive.appfolder'];
    this.urlRedirect = this.url + this.paths.direct;
    this.loginURL = null;

    // Main Window configuration
    this.winConfig = {
      width: 750,
      height: 800,

      show: false,
      webPreferences: {nodeIntegration: true}
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

          // this.handleCloud();
          // this.handleDocuments();
        });
  }

  handleCloud() {
    console.log('HANDLECLOUD RUNNING')
    var self = this;
    // one initial get - only need to download files that are newer than
    // whats on disk last update timestamp will be stored on disk in
    // .timestamp file we will use that to only download new content
    const drive = google.drive({version: 'v3', auth: this.auth});



    // read timestamp file - if it doesnt exist assume its way in past (fresh
    // install - download everything)

    fs.stat('.timestamp', function(err, stats) {
      if (err) {
        if (err.code == 'ENOENT') {  // if file doesnt exist
          console.log('TIMESTAMP DOESNT EXIST - CREATING')
          // then we need to create it and download everything
          drive.changes.getStartPageToken({}, function(err, res) {
            console.log('Start token:', res.data.startPageToken);
            console.dir(res)
            fs.writeFile('.timestamp', res.data.startPageToken, function(err) {
              if (err) throw err
                // timestamp created - download all cloud files to disk and
                // decrypt them
                console.log(
                    'Timestamp did not exist on disk - Downloading all files to get synced with cloud.')
                for (let obj of folder) {
                  self.downloadfile(obj[1])
                }
            })
          });

        } else {
          console.log(err)
          console.log('fatal err')
          throw err
        }
      } else {
        console.log('FILE EXISTS - READING')
        fs.readFile('.timestamp', function(err, rawfilecontents) {
          if (err) {
            console.log(err)
            console.log('fatel error reading file that should exist')
            throw err
          }
          // now we have the timestamp
          console.log('timestamp ' + rawfilecontents)

          // get changes
          drive.changes.list(
              {spaces: 'appDataFolder', pageToken: rawfilecontents.toString()},
              (err, res) => {
                if (err) {
                  console.log('Error getting changed files ' + err);
                  return;
                }
                // const response = res.data.files;
                // console.log('got a list of file changes:')
                // console.dir(res)
                let newversion = res.data.newStartPageToken
                console.log('new cloud version ' + newversion)
                fs.writeFile(
                    '.timestamp', new Buffer(res.data.newStartPageToken),
                    function(err) {
                      if (err) throw err
                        console.log(
                            res.data.changes.length.toString() +
                            ' files have changed since we last checked')
                        // console.log('individual changes:')
                        // console.dir(res.data.changes)
                        for (let change of res.data.changes) {
                          // console.dir(change)
                          if (!change.removed) {
                            console.log(
                                'Cloud copy of ' + change.file.name +
                                ' is newer - downloading')
                            self.downloadfile(change.fileId)
                          }
                        }
                    })
              })
        })
      }
    })


    // after intial get - setup watching changes
    // watching changes
  }


  downloadfile(fileid) {
    var self = this;
    const drive = google.drive({version: 'v3', auth: this.auth});

    drive.files
        .get({
          fileId: fileid,
          fields:
              'name, parents, appProperties, createdTime, modifiedTime, modifiedByMeTime'

        })
        .then(function(file) {
          if (!file.data.name.endsWith('.metadata')) {
            justDownloaded.push(file.data.name)
            console.log('Downloaded: ' + file.data.name);
            // console.dir(file)
            let iv = Buffer.from(file.data.appProperties.IV, 'base64')
            console.log('GOT THE IV HERE')
            console.log(iv)
            let timestamp = file.data.modifiedTime
            drive.files.get({fileId: fileid, alt: 'media'})
                .then(function(filewithdata) {
                  let metadataname = file.data.name + '.metadata'
                  drive.files.list(
                      {
                        name: metadataname,
                        parents: file.data.parents,
                        spaces: 'appDataFolder',
                        pageSize: 50,
                        fields: 'nextPageToken, files(name,id)'
                      },
                      (err, res) => {
                        if (err) {
                          console.log('Error getting drive listing' + err);
                          return;
                        }
                        const response = res.data.files;
                        let foundfile = [];
                        if (response.length) {
                          // foundfile = response[0].id
                          for (let resp of response) {
                            if (resp.name == metadataname) {
                              foundfile = resp.id
                            }
                          }
                        } else {
                          console.log('No Files :(');
                        }

                        drive.files.get({fileId: foundfile, alt: 'media'})
                            .then(function(metadatafile) {
                              // console.log('METADATA FILE CONTENTS:')
                              // console.log(metadatafile.data)
                              let symkeyencrypted;
                              let metadatalines = metadatafile.data.split('\n')
                              for (let lineindex in metadatalines) {
                                // console.log('looking at ')
                                // console.dir(metadatalines[lineindex])
                                if (metadatalines[lineindex] == 'nathan') {
                                  console.log(
                                      'found the sym key that was encrypted for us:')
                                  // console.dir(metadatalines[lineindex])
                                  console.dir(
                                      metadatalines[parseInt(lineindex) + 1])
                                  symkeyencrypted = new Buffer(
                                      metadatalines[parseInt(lineindex) + 1],
                                      'base64')
                                }
                              }
                              self.getMyPrivateKey(function(priv) {
                                console.log('ENCRYPTED FILE CONTENTS:')
                                console.dir(filewithdata.data)
                                var symkey = crypto.privateDecrypt(
                                    priv, symkeyencrypted);
                                // console.log(symkey)
                                // console.log(iv)
                                let decipher = crypto.createDecipheriv(
                                    'aes-256-gcm', symkey, iv)
                                let cleartext = decipher.update(
                                    filewithdata.data, 'binary', 'binary')
                                console.log('CLEARTEXT: ' + cleartext)
                                fs.writeFile(
                                    './Documents/' + file.data.name, cleartext,
                                    {encoding: 'binary'}, function(err) {
                                      if (err) {
                                        console.log('error writing to file ')
                                        console.log(
                                            './Documents/' + file.data.name)
                                        throw err
                                      } else {
                                        console.log('WRITTEN TO FILE')
                                      }
                                    })
                              })
                            })
                      });
                })
                .catch(function(err) {
                  console.log('Error during second download', err);
                })
          }
        })
        .catch(function(err) {
          console.log('Error during download', err);
        })
  }


  deleteFile(fileID, callback){
    const drive = google.drive({version: 'v3', auth: this.auth});
    drive.files.delete({fileId: fileID},
    (err) => {
      if (err){
        console.log('Error DELETING drive listing: ' + err);
        return;
      }
      callback();
    });
    
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
                  'Uploaded file \"' + fileName + '\", File Id: ', file.fileId);

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

  encryptFileForGroup(filename, group) {
    console.log('encrypt for group called')

    let self = this;  // so we can get `this` inside anonymous functions
    this.getMyPrivateKey(function(key) {
      console.log('got private key')
      fs.readFile('./Documents/' + filename, function(err, rawfilecontents) {
        if (err) {
          console.log('error opening the file ./Documents/' + filename)
          console.dir(err)
          throw err
        }

        let iv = crypto.randomBytes(16)
        let symkey = crypto.randomBytes(32)
        let cipher = crypto.createCipheriv('aes-256-gcm', symkey, iv)

        let ciphertext = cipher.update(rawfilecontents, 'binary', 'binary')



        let metadata = '';
        for (let person of group) {
          console.log('encrypting sym key for ' + person)
          let pubkey = fs.readFileSync('./contacts/' + person + '.publickey')
          let cipher = crypto.publicEncrypt(pubkey, symkey)
          metadata += person + '\n'
          metadata += cipher.toString('base64') + '\n'
        }
        console.log(metadata)
        self.uploadfile(filename, ciphertext, iv, function() {
          console.log('FILE UPLOADED')
          self.uploadfile(filename + '.metadata', metadata, iv, function() {
            console.log('metadata uploaded')
          })
        })
      })
    })
  }


  getMyPrivateKey(callback) {
    fs.stat('.privatekey', function(err, stats) {
      if (err) {
        if (err.code == 'ENOENT') {  // if key doesnt exist, make it
          crypto.generateKeyPair(
              'rsa', {
                modulusLength: 4096,
                publicKeyEncoding: {type: 'spki', format: 'pem'},
                privateKeyEncoding: {
                  type: 'pkcs8',
                  format: 'pem',
                  cipher: 'aes-256-cbc',
                  passphrase: 'top secret'
                }
              },
              (err, publicKey, privateKey) => {
                // Handle errors and use the generated key pair.
                // let key = crypto.randomBytes(32);
                console.log('GENERATED KEY PAIR')
                console.log(publicKey)
                fs.writeFile('.privatekey', privateKey, function(err) {
                  if (err) throw err;
                })
                fs.writeFile('.publickey', publicKey, function(err) {
                  if (err) throw err;
                })
                return callback(publickey);
              });

        } else
          throw err  // throw other errors
      }
      fs.readFile(
          '.privatekey',
          function(err, rawfilecontents) {  // if file exists read key
            if (err) throw err
              let actualkey = crypto.createPrivateKey(
                  {key: rawfilecontents, passphrase: 'top secret'})
              return callback(actualkey)
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
    this.encryptFileForGroup(filename, ['alice', 'bob', 'nathan'])
    // let self = this;  // so we can get `this` inside anonymous functions
    // this.getSecretKey(function(key) {
    //   fs.readFile('./Documents/' + filename, function(err, rawfilecontents) {
    //     if (err) {
    //       console.log('error opening the file ./Documents/' + filename)
    //       console.dir(err)
    //       throw err
    //     }

    //     let iv = crypto.randomBytes(16)
    //     let cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    //     let ciphertext = cipher.update(rawfilecontents, 'binary', 'binary')


    //     self.uploadfile(filename, ciphertext, iv, function() {
    //       console.log('FINISHED AN UPLOAD')
    //     })

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
    //     //we can store it on google drive with  "custom file
    //     properties", basically metadata
    //     https://developers.google.com/drive/api/v3/properties
    //     //but not sure how to get it to there?

    // })
    //   })
    // })
  }


  handleDocuments() {
    let self = this;  // so we can get `this` inside anonymous functions
    fs.mkdir('./Documents', function() {
      // this initial one-time read isnt recursive (yet)
      // fs.readdir('./Documents', {withFileTypes: false}, function(err, files)
      // {
      //   // get the encryption key and encrypt files
      //   for (var file of files) {
      //     // console.log(file)
      //     // open the file:
      //     self.encryptFile(file)
      //   }
      //   self.reload();
      // })
      // setup watch on filedirectory
      console.log('Setup File watch!')
      var diskchanges = [];
      // var justDownloaded = [];  // re-empty this list just in case. only
      // need to track these while the watch-er is running.

      fs.watch('./Documents', {recursive: true}, function(eventname, filename) {
        console.log(
            'CHANGE DETECTED OF TYPE ' + eventname + ' ON FILE ' + filename)
        // change means file contents changed
        // rename means creation/deletion/rename
        if (eventname == 'change') {
          // These events always seem to be triggered twice. so we log them
          // the first time so that we can ignore them the second

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

  setListeners(eventVal){
    event = eventVal;
    this.handleCloud();
    this.handleDocuments();
  }

  // reloads the gui of the folder page.
  reload() {
    event.sender.send('actionReply', folder);
    console.log('reloaded')
  }
}



module.exports = new Config();