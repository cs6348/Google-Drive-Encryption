var fs = require('fs');
const { dialog } = require('electron').remote

console.log(process.type);
var AES_KEY //having this as global and right at the top is probably bad practice? but just for testing. TODO change this
            //not very sure on how to best handle keys in JS

//tmp global encrypted blob
var ENCRYPTED_BLOB 

var aesAlgorithmKeyGenParams = {
    name: "AES-GCM",
    length: 256
};
var aesAlgorithmParams = {
    name: "AES-GCM",
    iv: window.crypto.getRandomValues(new Uint8Array(16)) //these IVS should probably be stored somehow? and probably different per-file?
};

//this operation is asynchronous so be careful with it. dont try to do things before key exists
//here it *should* be fine becaues its happening right at the start before any files can be added
//probably will need to change in future when the key actually gets saved/loaded 
window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("Any sort of password here"), //key is derived from this password and the salt below
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
).then(function(importedKey){
    window.crypto.subtle.deriveKey(
        { //Pbkdf2Params object - use PBKDF2 to derive the key
            name: "PBKDF2",
            hash: "SHA-512",
            salt: window.crypto.getRandomValues(new Uint8Array(16)), //something unique per user? 
            iterations: 100000
        },
        importedKey,
        aesAlgorithmKeyGenParams, //derive an AES key, that can encrypt/decrypt
        false, ["encrypt", "decrypt"] //other properties can be defined here like signing
    ).then(
        function (aesKey) {
            AES_KEY = aesKey;
        })
})

//instead of importing and doing that above password-based thing you can just generate a raw key like so:
//not sure which way is better?
// window.crypto.subtle.generateKey(aesAlgorithmKeyGenParams, true, ["encrypt", "decrypt"]).then(
//     function (aesKey) {
//         AES_KEY = aesKey;
//     })



function handleFile(file) { //gets called when new file is selected from the thing
                            //can do this sorta thing on file changes or when drag & drop or however we decide
    let reader = new FileReader()
    reader.onload = function (e) {
        let rawfilecontents = e.target.result
        console.log("ORIGINAL DATA")
        console.dir(rawfilecontents)
        window.crypto.subtle.encrypt(aesAlgorithmParams, AES_KEY, rawfilecontents).then(function (ciphertext) {
            console.log("ENCRYPTS TO")
            console.dir(ciphertext);
            ENCRYPTED_BLOB = ciphertext
            window.crypto.subtle.decrypt(aesAlgorithmParams, AES_KEY, ciphertext).then(function (clear) {
                console.log("DECODES BACK TO")
                console.dir(clear)
            }, function () { console.log("unable to decrypt") })
        }, function () { console.log("unable to encrypt") });
    }
    reader.onerror = function (e) {
        console.log("unable to read the file")
    }
    //define the callback functions above and then actually read file in w/ this function:
    reader.readAsArrayBuffer(file[0])
}


function saveencrypt() { 
    //called when you click the encrypt button
    //just saves the encrypted blob to disk as an example 
    if (ENCRYPTED_BLOB) {
        let path = dialog.showSaveDialog({ title: "Select Where to Save Encrypted Blob" })
        if (path) {
            try { fs.writeFileSync(path, new Uint8Array(ENCRYPTED_BLOB)); } //maybe doesnt work?
            catch (e) {
                alert('Failed to save the file !');
                console.dir(e);
            }
        }
    }
}