/**
 * persistent_data_manager.js for LabJack Switchboard.  Provides Kipling and all
 * modules with the ability to save state between module loads as well as 
 * kipling restarts.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

var fs = require('fs');             //Load File System module
var os = require('os');             //Load OS module
var path = require('path');

function persistentDataManager() {
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
