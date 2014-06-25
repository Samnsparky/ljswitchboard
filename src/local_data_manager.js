var fs = require('fs');             //Load File System module
var os = require('os');             //Load OS module
var path = require('path');

var LJ_TEMPORARY_FILE_LOCATION;
if (process.platform === 'win32') {
    var modernPath = process.env.ALLUSERSPROFILE + '\\LabJack\\K3';
    var xpPath = process.env.ALLUSERSPROFILE + '\\Application Data\\LabJack\\K3';
    var filePath = fs.existsSync(modernPath);
    if (filePath) {
        LJ_TEMPORARY_FILE_LOCATION = modernPath;
    }
    else {
        LJ_TEMPORARY_FILE_LOCATION = xpPath;
    }
} else {
    LJ_TEMPORARY_FILE_LOCATION = '/usr/local/share/LabJack/K3';
}