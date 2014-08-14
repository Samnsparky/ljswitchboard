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

// Require npm
var q = require('q');
var dict = require('dict');
var async = require('async');

// Require ljswitchboard libs
var ljsError;
try {
    ljsError = require('./helper_scripts/error_handler');
} catch (err) {
    ljsError = require('./error_handler');
}
var dataPrinter;
try {
    dataPrinter = require('./helper_scripts/data_printer');
} catch (err) {
    dataPrinter = require('./data_printer');
}

function globalDataManager(fs_facade_obj) {

    var registeredName = 'GDM';
    this.registeredName = registeredName;

    // Define console.log type functions
    var printer = dataPrinter.makePrinter(registeredName);
    this.log = printer.log;
    this.pWarn = printer.pWarn;
    this.pErr = printer.pErr;

    // Define error handling/creation functions
    this.criticalError = function(errorName, options) {
        return ljsError.criticalError(self.registeredName, errorName, options);
    };

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
    var addFolder = function(isRequired, path) {
        var newInfo = {'path':path,'isRequired':isRequired};
        requiredFolders.push(newInfo);
    };
    addFolder(true, LJ_TEMPORARY_FILE_PATH);
    addFolder(false, K3_TEMPORARY_FILE_PATH);
    addFolder(false, K3_DATA_FILE_PATH);
    this.requiredFolders = requiredFolders;

    // Define variables that are necessary for determining if the 
    // globa_data_manager has been successfully initialized.
    this.isComplete = false;
    this.isError = false;
    this.savedError = null;

    // This dict holds data that is persistent to reboots.
    this.startupData = dict();

    // This dict holds data that is only valid during the current instance of K3
    this.activeData = dict();
    
    /*
     * initializeData should be called on startup.  It loads a static file that 
     * holds persistent data between reboots and loads it into the startupData 
     * object.  It then transfers that data into the activeData object.
     */
    this.availableFolders = [];
    this.missingFolders = [];
    this.initializeData = function() {
        var defered = q.defer();

        var errors = [];
        async.eachSeries(self.requiredFolders,
            function(requiredFolder,callback) {
                fs.exists(requiredFolder.path,function(exists) {
                    if(!exists) {
                        self.missingFolders.push(requiredFolder);
                        if(requiredFolder.isRequired) {
                            // missing required folder
                            var options = {'data': requiredFolder};
                            var errorObj = self.criticalError(
                                'missingReqDir',
                                options
                            );
                            errors.push(errorObj);
                            callback();
                        } else {
                            fs.mkdir(requiredFolder.path,function(e) {
                                console.log('HERE!',e);
                                if (!e || (e && e.code === 'EEXIST')) {
                                    callback();
                                } else {
                                    var options = {'data': requiredFolder};
                                    var errorObj = self.criticalError(
                                        'failedMakeDir',
                                        options
                                    );
                                    errors.push(errorObj);
                                }
                            });
                        }
                    } else {
                        self.availableFolders.push(requiredFolder);
                        callback();
                    }
                });
            }, function(err) {
                if(err) {
                    self.pErr('Error',err);
                } else if (errors.length > 0) {
                    self.pErr('Errors',errors);
                } else {

                }
                self.log('missing',self.missingFolders);
                self.log('found',self.availableFolders);
                defered.resolve();
            });
        return defered.promise;
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

    /**
     * waitForData should be called after initialization is started so that an 
     * asynchronous initialization routine can be performed upon initialization 
     * of the program. A non-asynchronous routine.
     * @return {[type]} [description]
     */
    this.waitForData = function() {
        var defered = q.defer();
        var checkInterval = 100;
        var iteration = 0;
        var maxCheck = 10;

        // Define a function that can delays & re-calls itself until it errors
        // out or resolves to the defered q object.
        var isComplete = function() {
            return !(self.isDataComplete || self.isError);
        };
        var finishFunc = function() {
            // console.log('version_manager.js - Num Iterations',iteration);
            if(self.isError) {
                defered.reject(self.errorInfo);
            } else {
                defered.resolve(self.infoCache);
            }
        };
        var waitFunc = function() {
            if(isComplete()) {
                if (iteration < maxCheck) {
                    self.log('Checking...',iteration);
                    iteration += 1;
                    setTimeout(waitFunc,checkInterval);
                } else {
                    defered.reject('Max Retries Exceeded');
                }
            } else {
                finishFunc();
            }
        };

        // if the data isn't complete then 
        if(isComplete()) {
            setTimeout(waitFunc,checkInterval);
        } else {
            finishFunc();
        }
        return defered.promise;
    };

    var self = this;
}
try {
    if(NODE_WEBKIT_INSTANCE) {
        console.log('GDM, html version');
    } else {
        console.log('GDM NODE_WEBKIT_INSTANCE not defined');
    }
} catch(err) {
    console.log('GDM nodejs version');
    var fs_facade_temp = function () {
        var self = this;
    };
    var fs_facade_obj = new fs_facade_temp();
    var GDM = new globalDataManager(fs_facade_obj);
    GDM.initializeData();
    GDM.waitForData()
    .then(function(data) {
        console.log('waitFunc succ',data);
    }, function(err) {
        console.log('waitFunc err',err,ljsError.getNumErrors());
    });
}

