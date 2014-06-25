/**
 * global_requires.js
 *
 * File that globally includes a variety of required libraries for later use 
 * through out K3.  The goal here is to reduce the number of program-wide 
 * require statements and to reduce namespace clutter.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

//-------------------------- Node-Webkit Requires ------------------------------
var gui;
try {
    gui = require('nw.gui');
} catch (e) {
    console.error('Failed to load nw.gui');
}

//-------------------------- NPM Requires --------------------------------------
var async = require('async');
var handlebars = require('handlebars');
var q = require('q');
var dict = require('dict');

//-------------------------- LabJack Specific Requires -------------------------
var fs_facade = require('./fs_facade');

var device_controller = null;
try {
    device_controller = require('./device_controller');
} catch (e) {
    showPrematureAlert(
        '<b>Failed to load JSON constants file or LJM on your machine. Please '+
        'check the install and restart Kipling</b>. Original error: '+
        e.toString()
    );
}

