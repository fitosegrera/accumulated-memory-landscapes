var express = require('express');
var app = express();
var exec = require('child_process').exec
var fs = require('fs');

//Serve static files (index,html)
app.use('/', express.static(__dirname + '/public'));

///////////////
//Image Stuff//
///////////////
/*
NOTE: ImageMagick NEEDS to be installed on the server
*/

//Merge each new saved image int he server's folder with composed.png

function merge() {
    fs.exists('public/textures/users/imgs/testUser_1/composed.png', function(exists) {
        if (!exists) {
            exec("convert -size 2048x2048 xc:white public/textures/users/imgs/testUser_1/composed.png", function(err, stdout, stderr) {
                if (err) {
                    console.log(err);
                }
            });
        }
        fs.watch('public/textures/users/imgs/testUser_1', function(event, filename) {
            if (event == 'change' && filename != 'composed.png') {
                console.log(filename);
                var command = "convert -resize 2048x2048 public/textures/users/imgs/testUser_1/" + filename + " public/textures/users/imgs/testUser_1/composed.png -compose multiply -composite -contrast-stretch 0.1% -colorspace Gray public/textures/users/imgs/testUser_1/composed.png";
                exec(command, function(err, stdout, stderr) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        });
    });
}

merge();

////////////////
//Start Server//
////////////////

app.listen(3000, function() {
    console.log('listening on port 3000')
});