//TUDO: Do we want to make this a stateful configuration? I was thinking maybe we can store accounts instances here?
class Config {
    constructor() {
        
        //Backend Connection
        this.address = 'localhost';
        this.port = '3000';
        this.url = 'http://' + this.address + ':' + this.port;
        //Google API
        this.clientAPI = '';
        this.clientSecret = '';
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