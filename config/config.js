//TUDO: Do we want to make this a stateful configuration? I was thinking maybe we can store accounts here?
class Config {
    constructor() {
        
        //Backend Connection
        this.address = 'localhost';
        this.port = '3000';
        this.url = 'http://' + this.address + ':' + this.port;
        //Google API
        this.clientID = '591099849229-64p9t235epvh8t48ruirt0n2ag8qs502.apps.googleusercontent.com';
        this.clientSecret = 'I31wkLGps8aQDQnleIvp_Qv2';
        this.scopes = ['https://www.googleapis.com/auth/drive'];
        
        //Main Window configuration
        this.winConfig = {
            width: 800,
            height: 500,
            show: false
        }
        //BrowserWindow Object Symbolic Linking? TUDO
        this.windows = {
            win: null
        }
    }
}

module.exports = new Config();