const {google} = require('googleapis');

//TUDO: Do we want to make this a stateful configuration? I was thinking maybe we can store accounts here?
class Config {
    constructor() {
        
        //Backend
        this.address = 'localhost';
        this.port = '3000';
        this.url = 'http://' + this.address + ':' + this.port;
        //Google API
        this.auth = null;
        this.clientID = '591099849229-64p9t235epvh8t48ruirt0n2ag8qs502.apps.googleusercontent.com';
        this.clientSecret = 'I31wkLGps8aQDQnleIvp_Qv2';
        this.clientCode = null;
        this.clientToken = null;
        
        //local web paths
        this.paths = {
            index: '/index',
            drive: '/drive',
            login: '/login',
            direct: '/direct'
        };

        //Google Auth
        this.scopes = ['https://www.googleapis.com/auth/drive.readonly'];
        this.urlRedirect = this.url + this.paths.direct;
        this.loginURL = null;
        
        //Main Window configuration
        this.winConfig = {
            width: 700,
            height: 800,
            show: false
        }
        //BrowserWindow Object  S-Linking? TUDO
        this.windows = {
            win: null
        }
    }
    //Get/Set client code sent by Google
    setCode(code){ this.clientCode = code }
    getCode(){ return this.clientCode }

    //Generate an Auth request url from Google Api Console
    generateAuth(){
        this.auth = new google.auth.OAuth2(
            this.clientID,
            this.clientSecret,
            this.urlRedirect
        );
        let url = this.auth.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: this.scopes
        });
        this.loginURL = url;    
    }

    generateToken(callback){
        this.auth.getToken(this.clientCode, (err, token) => {
            if (err) 
                return console.error('Error retrieving token: ' + err);
            else {
                this.auth.credentials = token;
                this.clientToken = token;
                //this.listFiles();
                callback();
            }
        });
    }

    listFiles(callback){
        //Test Output
        const drive = google.drive({version: 'v3', auth: this.auth});
        var folder = [];
        drive.files.list({
            pageSize: 51,
            fields: 'nextPageToken, files(id, name, thumbnailLink, iconLink)'
        }, 
        (err, res) => {
            if (err) {
                console.log('Error getting drive listing' + err);
                return;
            }
            const response = res.data.files;
                if(response.length){
                    //console.log('Files:\n-----------------------------------------');
                    response.map((file) => {
                        //console.log(`${file.name} : (${file.id})`);
                        folder.push([file.name,file.id, file.thumbnailLink, file.iconLink]);
                    });
                    callback(folder);
                } else {
                    console.log('No Files :(');
                }
        });
    }
}

module.exports = new Config();