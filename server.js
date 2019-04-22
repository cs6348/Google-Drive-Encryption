const static = require('node-static');
var file = new static.Server('src/pages');

require('http').createServer(function(request, response){
    request.addListener('end', function () {
        file.serve(request,response);
    }).resume();
}).listen(8881);