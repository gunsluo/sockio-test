var app = require('express')();
var session = require('express-session');
var cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(session({
    genid: function(req) {
        return genUuid(); // use UUIDs for session IDs
    },
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');
function genUuid(callback) {
  if (typeof(callback) !== 'function') {
    return uuidFromBytes(crypto.randomBytes(16));
  }

  crypto.randomBytes(16, function(err, rnd) {
    if (err) return callback(err);
    callback(null, uuidFromBytes(rnd));
  });
}

function uuidFromBytes(rnd) {
  rnd[6] = (rnd[6] & 0x0f) | 0x40;
  rnd[8] = (rnd[8] & 0x3f) | 0x80;
  rnd = rnd.toString('hex').match(/(.{8})(.{4})(.{4})(.{4})(.{12})/);
  rnd.shift();
  return rnd.join('-');
}

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.get('/ping', function(req, res){
    res.sendFile(__dirname + '/ping.html');
});

function __send(socket, mark, msg){
    if (!socket || !mark) {
        return;
    }
    if (!msg) {
        socket.emit(mark);
    } else if( typeof msg === 'object') {
        try{
            socket.emit(mark, JSON.stringify(msg));
        }catch(ex){
            console.log("send exception ", ex);
        }
    } else if (typeof msg === "string") {
        msg = msg || '';
        socket.emit(mark, msg);
    }
}

function parseCookie(headers){
    if(!headers || !headers.cookie){
        return null;
    }
    var cookiesArray = headers.cookie.split(';');
    var cookies = {};
    for(var i in cookiesArray){
        var parts = cookiesArray[i].match(/(.*?)=(.*)$/);
        cookies[parts[1].trim()] = (parts[2] || '').trim();
    }
    return cookies;
}

_G = {
    OFFLINE_DEVIATION_TIME:2000,
    sockets:{},
    onlineSockets:{},
    offlineSockets:{},
};
function __newSocketNode(sid, socket){
    return {sid:sid,socket:socket, onlineTime: new Date().getTime(), offlineTime:0};
}
function __newSocketsBlock(userid){
    return {userid:userid, onlineCount:0, offlineCount:0, onlines:{}, offlines:{}};
}

function __addSocket2List(userid, socketNode, list, flag){
    var socketsBlock = list[userid];
    if(!socketsBlock){
        socketsBlock = __newSocketsBlock(userid);
        list[userid] = socketsBlock;
    }
    var sockets = flag ? socketsBlock.onlines : socketsBlock.offlines;
    sockets[socketNode.socket.id] = socketNode;
    if(flag){
        socketsBlock.onlineCount++;
    }else{
        socketsBlock.offlineCount++;
    }

    return socketsBlock;
}
function __removeSocket2List(userid, socketId, list, flag){
    var socketsBlock = list[userid];
    var socketNode = null;
    if(socketsBlock){
        var sockets = flag ? socketsBlock.onlines : socketsBlock.offlines;
        if(sockets[socketId]){
            socketNode = sockets[socketId];
            delete sockets[socketId];
            if(flag){
                socketsBlock.onlineCount--;
            }else{
                socketsBlock.offlineCount--;
            }
        }
    }
    return socketNode;
}

function __addSocket(socket){
    var userid = socket.handshake.query.userid || '';
    var cookies = parseCookie(socket.handshake.headers);
    var sid = cookies['connect.sid']; 
    var socketNode = __newSocketNode(sid, socket);
    var socketsBlock = __addSocket2List(userid, socketNode, _G.sockets, true);
    console.log("<----------------------------------new connection---------------------------------->");
    console.log("socket.id:", socket.id, "\tuserid:", userid, "\tsid:", sid, "\tonline time:", socketNode.onlineTime);
    return socketsBlock;
}
function __markOfflineSocket(userid, socketId){
    var socketNode = __removeSocket2List(userid, socketId, _G.sockets, true);
    if(socketNode){
        socketNode.offlineTime = new Date().getTime();
        __addSocket2List(userid, socketNode, _G.sockets, false);
    }
    return socketNode;
}

function __offlienCheck(socketsBlock){
    if(socketsBlock.offlineCount === 0) return;
    var sockets = socketsBlock.offlines;
    var now = new Date().getTime();
    for(var socketId in sockets){
        var socket = sockets[socketId];
        if(socket.offlineTime + _G.OFFLINE_DEVIATION_TIME >= now){
            delete sockets[socketId];
            socketsBlock.offlineCount--;
        }
    }
}
function __offlineTimer(){
    var socketsBlocks = _G.sockets;
    for(var userid in socketsBlocks){
        if(socketsBlocks.hasOwnProperty(userid)){
            var socketsBlock = socketsBlocks[userid];
            if(socketsBlock.offlineCount > 0){
                __offlienCheck(socketsBlock);
            }
            if(socketsBlock.offlineCount === 0 && socketsBlock.onlineCount === 0){
                console.log("<----------------------------------user offline---------------------------------->");
                console.log("userid:", userid, "\toffline time:", new Date().getTime());
                delete socketsBlocks[userid];
            }
        }
    }
}
/*
io.on('authorization', function(socket, cb){
    //console.log('a user connected', socket.id, socket.request);
    cb(null,true)
});
*/

io.on('connection', function(socket){
    var socketsBlock = __addSocket(socket);
    //socket.broadcast.emit('hi');
    socket.on('disconnect', function(){
        socketNode = __markOfflineSocket(socketsBlock.userid, socket.id);
        console.log("<----------------------------------dis connection---------------------------------->");
        console.log("socket.id:", socketNode.socket.id, "\tuserid:", socketsBlock.userid, "\tsid:", socketNode.sid, "\tofflineTime:", socketNode.offlineTime);
    });
    
    socket.on('chat message', function(msg){
        //io.emit('chat message', msg);
        __send(socket, 'chat message', msg);
        console.log('message: ' + msg);
    });

    socket.on('ping', function(msg){
        console.log("--ping--");
        __send(socket, 'pong');
    });
});

http.listen(10000, function(){
    console.log('listening on *:10000');
});

/*定时检查offlineSockets*/
function offline(){
    __offlineTimer();
    setTimeout(function(){
        offline();
    },2000);
}
offline();
