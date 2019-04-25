const {google} = require('googleapis');

//TUDO: Do we want to make this a stateful configuration? I was thinking maybe we can store accounts here?
class Config {
    constructor() {
        
        //Backend
        this.address = 'localhost';
        this.port = '3000';
        this.url = 'http://' + this.address + ':' + this.port;
        //Google API
        this.clientID = '591099849229-64p9t235epvh8t48ruirt0n2ag8qs502.apps.googleusercontent.com';
        this.clientSecret = 'I31wkLGps8aQDQnleIvp_Qv2';
        this.scopes = ['https://www.googleapis.com/auth/drive'];
        this.urlRedirect = this.url + '/drive';
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

    //Generate an Auth request url from Google Api Console
    generateAuth(){
        let auth = new google.auth.OAuth2(
            this.clientID,
            this.clientSecret,
            this.urlRedirect
        );
        let url = auth.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: this.scopes
        });

        console.log('Google Login: ' + url);
        this.loginURL = url;    
    }

}

module.exports = new Config();