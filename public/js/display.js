var ipc = require('electron').ipcRenderer;
var file = [];
function printFiles(folder)
{
    var i
    for(i = 0; i<folder.length; i++)
    {
        console.log(folder[i][1]);
        file.push(document.createElement("button"));
        file[i].id = i;
        file[i].innerHTML = '<img src="../icons/fileicon.png" /> <br></br>'+folder[i][0];
        var box = document.getElementById("folder");
        document.body.appendChild(file[i]);
        file[i].addEventListener ("click", function() {

            alert("Download ID: "+folder[this.id][1]);
        });
    }
}
    ipc.once('actionReply', function(event, response){
        printFiles(response);
    })
    ipc.send('invokeAction', 'someData');

