var ipc = require('electron').ipcRenderer;
var file = [];
function printFiles(folder)
{
    var i
    for(i = 0; i<folder.length; i++)
    {
        // file.push(document.createElement("tr"));
        // file[i].setAttribute('class', 'drive-item');
        // file[i].id = i;
        // file[i].innerHTML = `
        // <div class="item-inner">
        // <img class="thumb" src=${folder[i][2]} onerror="this.onerror=null;this.src='../icons/fileicon.png';"> 
        // </br>
        // <div class="info-box">
        // <img src=${folder[i][3]}> 
        // </br> ${folder[i][0]}
        // </div>
        // </div>`;

        // var box = document.getElementById("folder");
        // box.appendChild(file[i]);

        // file[i].addEventListener ("click", function() {
        //     alert("Download ID: "+folder[this.id][1]);
        // });

        file.push(document.createElement('tr'));
        file[i].setAttribute('class', 'file-item');
        file[i].id = i;
        file[i].innerHTML = `
        <th scope="row"> ${i} </th>
        <td> <img src=${folder[i][3]}> </td>
        <td> ${folder[i][0]} </td>
        `;

        document.getElementById('fileCollection').appendChild(file[i]);

        file[i].addEventListener ("click", function() {
            alert("Download ID: "+folder[this.id][1]);
        });
    }
}
    ipc.once('actionReply', function(event, response){
        printFiles(response);
    })
    ipc.send('invokeAction', 'someData');

