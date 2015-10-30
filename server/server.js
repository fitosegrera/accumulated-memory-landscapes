var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var exec = require('child_process').exec
var fs = require('fs');

//Require socket.io and initialize server
var io = require('socket.io').listen(server);

//Serve static files (index,html) for client use --> renders the landscape
app.use('/', express.static(__dirname + '/public'));

//for access from the mobileApp --> http://servername.com:3000/users?id=....
app.post('/users', function(req, res) {
    //fs.createWriteStream('public/textures/uploaded.png').pipe(req);
    if (req.query.id == "testUser_1") {
        res.send(req.query.id + " connected!\n");
        res.send(req.query.img);
        console.log(req.query.img);
    } else if (req.query.id == "testUser_2") {
        res.send(req.query.id + " connected!");
    } else {
        res.send("Sorry... " + req.query.id + " is not a valid user!!")
    }
});

///////////////////////////////////////////////////////////
////////////Send/Receive Data to/from Client///////////////
///////////////////////////////////////////////////////////

io.on('connection', function(socket) {
    console.log('client connected!');
    socket.on('id', function(data) {
        merge(data);
    });
});

///////////////
//Image Stuff//
///////////////

//Merge each new saved image int he server's folder with composed.png

function merge(data) {
    var ts = "testUser_1";
    fs.exists('./public/textures/users/' + ts + '/imgs/composed.png', function(exists) {
        if (!exists) {
            exec("convert -size 2048x2048 xc:white ./public/textures/users/" + ts + "/imgs/composed.png", function(err, stdout, stderr) {
                if (err) {
                    console.log(err);
                }
            });
        }
        fs.watch('public/textures/users/' + ts + '/imgs', function(event, filename) {
            // console.log(filename);
            if (event == 'rename' && filename != 'composed.png') {
                console.log(filename);
                var command = "convert -resize 2048x2048 ./public/textures/users/" + ts + "/imgs/" + filename + " ./public/textures/users/" + ts + "/imgs/composed.png -compose multiply -composite -contrast-stretch 0.1% -colorspace Gray ./public/textures/users/" + ts + "/imgs/composed.png";
                setTimeout(function() {
                    exec(command, function(err, stdout, stderr) {
                        if (err) {
                            console.log(err);
                        }
                    });
                },3000);
            }
        });
    });
}

////////////////
//Start Server//
////////////////

server.listen(3000, function() {
    console.log('listening on port 3000')
});