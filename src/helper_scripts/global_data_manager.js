/**
 * global_data_manager.js for LabJack Switchboard.  Provides Kipling and all
 * modules with the ability to save state between module loads as well as 
 * kipling restarts.  Essentially acting like a global data manager.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

var fs = require('fs');             //Load File System module
var os = require('os');             //Load OS module
var path = require('path');
var q = require('q');

function globalDataManager(fs_facade_obj) {
    var fs_facade = fs_facade_obj;
    var LJ_TEMPORARY_FILE_PATH;
    var PATH_TXT = '/';
    var K3_TEMPORARY_FILE_PATH;
    var K3_FOLDER = 'K3';
    var DATA_FOLDER = 'data';
    var K3_DATA_FILE_PATH;

    var requiredFolders = [];

    // Switch based off platform type
    if (process.platform === 'win32') {
        PATH_TXT = '\\';
        var modernPath = process.env.ALLUSERSPROFILE + '\\LabJack';
        var xpPath = process.env.ALLUSERSPROFILE + '\\Application Data\\LabJack';
        var filePath = fs.existsSync(modernPath);
        if (filePath) {
            LJ_TEMPORARY_FILE_PATH = modernPath;
        }
        else {
            LJ_TEMPORARY_FILE_PATH = xpPath;
        }
    } else {
        LJ_TEMPORARY_FILE_PATH = '/usr/local/share/LabJack';
    }

    // Define K3 temporary file path & others
    K3_TEMPORARY_FILE_PATH = LJ_TEMPORARY_FILE_PATH + PATH_TXT + K3_FOLDER;
    K3_DATA_FILE_PATH = K3_TEMPORARY_FILE_PATH + PATH_TXT + DATA_FOLDER;

    // Define any required folders
    requiredFolders.push(LJ_TEMPORARY_FILE_PATH);
    requiredFolders.push(K3_TEMPORARY_FILE_PATH);
    requiredFolders.push(K3_DATA_FILE_PATH);

    // This dict holds data that is persistent to reboots.
    this.startupData = dict();

    // This dict holds data that is only valid during the current instance of K3
    this.activeData = dict();

    /*
     * initializeData should be called on startup.  It loads a static file that 
     * holds persistent data between reboots and loads it into the startupData 
     * object.  It then transfers that data into the activeData object.
     */
    this.initializeData = function() {

    };

    /*
     * initializeStartupData is called by the initializeData function.  It loads
     * data from a static & unprotected file and saves the data to the 
     * startupData object.
     */
    this.initializeStartupData = function() {

    };

    /**
     * initializeActiveData is called after the startupData object has been 
     * initialized.  It transfers that information into the activeData object so
     * that all of the information remains in one location.
     */
    this.initializeActiveData = function() {

    };

    var self = this;
}

