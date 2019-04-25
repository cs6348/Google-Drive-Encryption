
class Config {
    constructor() {
        
        //Backend Connection
        this.address = 'localhost';
        this.port = '8881';
        this.url = this.address + ':' + this.port;
        //Google API
        this.clientAPI = '';
        this.clientSecret = '';
        //BrowserWindow Object Linking TUDO
        this.windows = {
            win: null
        }
    }
}

module.exports = new Config();