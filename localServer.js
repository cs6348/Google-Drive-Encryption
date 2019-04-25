const static = require('node-static');
var file = new static.Server('src/pages');

async function launchServer() {
    require('http').createServer(function(request, response){
        request.addListener('end', function () {
            file.serve(request,response);
        }).resume();
    }).listen(8881);
}

module.exports.launchServer = launchServer;