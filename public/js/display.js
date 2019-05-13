var ipc = require('electron').ipcRenderer;
var file = [];
function printFiles(folder) {
  var i
  for (i = 0; i < folder.length; i++) {
    // file.push(document.createElement("tr"));
    // file[i].setAttribute('class', 'drive-item');
    // file[i].id = i;
    // file[i].innerHTML = `
    // <div class="item-inner">
    // <img class="thumb" src=${folder[i][2]}
    // onerror="this.onerror=null;this.src='../icons/fileicon.png';">
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
        <td class="col-actions"> ${
        (folder[1][2]) ? '<img src="' + folder[1][2] + '">' :
                         '<i class="fas fa-lock"></i>'} </td>
        <td> ${folder[i][0]} </td>
        <td class="align-bottom col-actions">
            <button onClick="getInfo('${folder[i][1]}')">
                <i class="fas fa-info-circle">
                </i>
            </button>
            <button onClick="remoteAction('share', '${folder[i][0]}')">
              <i class="fas fa-share"></i>
            </button>
            ${
              (!folder[i][0].endsWith('.metadata')) ? `
              <button onClick="remoteAction('download', '${folder[i][1]}')"> 
                <i class="fas fa-file-download"></i>
              </button>` : '<button disabled><i style = "opacity: 0.6;" class="fas fa-file-download"></i></button>'
            }
            <button class="danger-button" onClick="remoteAction('delete', '${folder[i][1]}')"> 
                <i class="fas fa-trash"></i>
            </button>
        </td>
        `;

    document.getElementById('fileCollection').appendChild(file[i]);

    // file[i].addEventListener ("click", function() {
    //     alert("Download ID: "+folder[this.id][1]);
    // });
  }
}

function remoteAction(action, id) {
  ipc.send('driveAction', [action, id]);
}

function getInfo(info) {
  alert(`Download ID: ${info}`);
}

ipc.on('actionReply', function(event, response) {
  printFiles(response);
});

ipc.send('driveListeners');
ipc.send('initial');
