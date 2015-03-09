var http = require('http');
var fs = require('fs');
var path = require('path');
var _G = {};
_G.sockets = [];
/*
_events: 
   { end: { [Function: g] listener: [Function: onend] },
     finish: [Function: onSocketFinish],
     _socketEnd: [Function: onSocketEnd],
     drain: [ [Function: ondrain], [Function: socketOnDrain] ],
     timeout: [Function],
     error: [Function],
     close: 
      [ [Function: serverSocketCloseListener],
        [Function: onServerResponseClose] ] },
*/
function newSocket(cookie, mark, req, res){
    req.on('end', function(){ console.log("request[", mark, "] end");});
    req.on('finish', function(){ console.log("request[", mark, "] finish");});
    req.on('drain', function(){ console.log("request[", mark, "] drain");});
    req.on('timeout', function(){ console.log("request[", mark, "] timeout");});
    req.on('error', function(){ console.log("request[", mark, "] error");});
    req.on('close', function(){ console.log("request[", mark, "] close");});
    req.connection.on('end', function(){ console.log("request connection[", mark, "] end");});
    req.connection.on('finish', function(){ console.log("request connection[", mark, "] finish");});
    req.connection.on('drain', function(){ console.log("request connection[", mark, "] drain");});
    req.connection.on('timeout', function(){ console.log("request connection[", mark, "] timeout");});
    req.connection.on('error', function(){ console.log("request connection[", mark, "] error");});
    req.connection.on('close', function(){ console.log("request connection[", mark, "] close");});
    res.on('end', function(){ console.log("res[", mark, "] end");});
    res.on('finish', function(){ console.log("response[", mark, "] finish");});
    res.on('drain', function(){ console.log("response[", mark, "] drain");});
    res.on('timeout', function(){ console.log("response[", mark, "] timeout");});
    res.on('error', function(){ console.log("response[", mark, "] error");});
    res.on('close', function(){ console.log("response[", mark, "] close");});
    return {cookie:cookie, mark:mark, connect:req, res: res};
}
function addSocket(socket){
    _G.sockets.push(socket);
    console.log("<-----------------------------------------");
    console.log("cookie: ", socket.cookie, "mark: ", socket.mark, "\tnew connect");
    console.log("----------------------------------------->");
}
var i = 0;
var j = 0;
function newCookie(){
    return ++i;
}
function newMark(){
    return ++j;
}

http.createServer(function (req, res) {
    //console.log("url--->",req.url);
    if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        var file = path.join(__dirname, "index.html");
        fs.exists(file, function (exists) {
            if (exists) {
                fs.createReadStream(file).pipe(res);
            }
        });
    } else if(req.url === '/favicon.ico') {
    } else {
        var socket = newSocket(newCookie(),newMark(), req, res);
        addSocket(socket);
        if (j % 3 === 0) {
            res.writeHead(200, {'Content-Type': 'text/json'});
            res.end('{"usid":"6666"}');
        }
    }
}).listen(10000);
console.log('Server running at http://127.0.0.1:10000/');
