const {google} = require('googleapis');
const fs = require('fs');
const crypto = require('crypto');
var folder;
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

  listFiles(callback) {
    // Test Output
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
        });
  }

  uploadfile(fileName, ciphertext, iv, callback) {
    const drive = google.drive({version: 'v3', auth: this.auth});
    var fileId = "";
    var fileMetadata;
    var media = {mimeType: 'application/octet-stream', body: ciphertext};
    var i;
    for(i = 0; i<folder.length; i++)
    { 
      if(fileName == folder[i][0])
        {
          //console.log("Match: "+folder[i][0]);
          fileId = folder[i][1];
          i = folder.length;
        }
    }
    if(fileId != "")
    {
      fileMetadata = {'name': fileName, 'IV': iv};
      console.log(fileId);
      drive.files.update({fileId: fileId, resource: fileMetadata, media: media, fields: 'id'})
    }
    else
    {
      fileMetadata = {'name': fileName, 'parents': ['appDataFolder'], 'IV': iv};
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

  shareFile(filename, user){
    //download filename's key file of username user

    //download key sharing file 

    //decrypt the symmetric key with your private key pair

    //fetch user's public key from the public key folder

    //encrypt symmetric key with user's public key

    //append to the filename's key file

    //overwrite key file with new key file
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

        console.log('cipher is of type' + typeof (ciphertext))
        
        
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
          console.log(file)
          // open the file:
          self.encryptFile(file)
        }
      })
      // setup watch on filedirectory
      fs.watch('./Documents', {recursive: true}, function(eventname, filename) {
        console.log(
            'CHANGE DETECTED OF TYPE ' + eventname + ' on file ' + filename)
        // change means file contents changed
        // rename means creation/deletion/rename
        if (eventname == 'change') {
          self.encryptFile(
              filename,
          )
        }
      })
    })
  }
}



module.exports = new Config();