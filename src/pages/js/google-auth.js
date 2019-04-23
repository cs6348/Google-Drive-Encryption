const {google} = require('googleapis');
const {ipcRenderer} = require('electron');

//TUDO: This is from the test Web App API on Ali's Personal Google Account, change it later.
//TUDO: Google might require us to provide a domain to the API for complete Auth, we might have to launch a local webserver and connect to localhost :(
const googleAPI = {
    clientID: '729911683689-d29b08mtouvr8hlac5hfgmjpdr9349d4.apps.googleusercontent.com',
    clientSecret: 'V-jd-R0fBpnYZyO34hHmPVmE',
    redirect: 'http://localhost:8881'
}

const scopes = [
    'https://www.googleapis.com/auth/drive'
];

function urlGoogle(){
    const auth = newAuth();
    const url = getConnectionUrl(auth);
    console.log("GOOGLE SIGN ON URL: " + url);
    ipcRenderer.send('googleRedirect', url);
    return url;
}

//TUDO: The third link is the redirect link, passing in empty for now
function newAuth(){
    return new google.auth.OAuth2(
        googleAPI.clientID,
        googleAPI.clientSecret,
        googleAPI.redirect
    )
}

function getConnectionUrl(auth){
    return auth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes
    })
}