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

// Require 3rd party libaries
var rmdir = require('rimraf');

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
var fs_facade;
try {
    fs_facade = require('./../fs_facade');
} catch (err) {
    fs_facade = require('./fs_facade');
}

function globalDataManager() {
    var PRINT_FOLDER_CREATION_INFO = false;
    var gdmVersion = '0.0.1';
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

    var LJ_TEMPORARY_FILE_PATH;
    var PATH_TXT = '/';
    var K3_TEMPORARY_FILE_PATH;
    var K3_FOLDER = 'K3';
    var DATA_FOLDER = 'gdm';
    var DATA_FILE = 'gdm.json';
    var MODULES_FOLDER = 'modules';
    var K3_DATA_FILE_PATH;

    // Required folders object will look something like:
    // ["<os-path>/LabJack","<os-path>/LabJack/K3","<os-path>/LabJack/K3/data"]
    var requiredFolders = [];
    var modules = [];
    this.gdmData = {};

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
    K3_MODULES_DATA_FILE_PATH = K3_DATA_FILE_PATH + PATH_TXT + MODULES_FOLDER;
    GDM_FILE_PATH = K3_DATA_FILE_PATH + PATH_TXT + DATA_FILE;

    // Define any required folders
    var addFolder = function(isRequired, path) {
        var newInfo = {'path':path,'isRequired':isRequired};
        requiredFolders.push(newInfo);
    };
    var addActiveModule = function(moduleData) {
        var folderPath = K3_MODULES_DATA_FILE_PATH + PATH_TXT + moduleData.name;
        var versionStr;
        if(moduleData.version) {
            versionStr = moduleData.version.split('.').join('_');
        } else {
            versionStr = '0.0.1';
        }
        var dataPath = folderPath + PATH_TXT + moduleData.name + '.json';
        modules.push({'name':moduleData.name,'folderPath':folderPath, 'dataPath':dataPath, 'moduleData':moduleData});
        addFolder(false,folderPath);
    };

    addFolder(true, LJ_TEMPORARY_FILE_PATH);
    addFolder(false, K3_TEMPORARY_FILE_PATH);
    addFolder(false, K3_DATA_FILE_PATH);
    addFolder(false, K3_MODULES_DATA_FILE_PATH);
    this.requiredFolders = requiredFolders;

    // Define variables that are necessary for determining if the 
    // globa_data_manager has been successfully initialized.
    this.isComplete = false;
    this.isError = false;
    this.savedError = null;

    // This dict holds data that is persistent to reboots.
    this.nonVolatileData = dict();
    this.nonVolatileDataInfo = dict();
    this.addNonVolatileData = function(location, key, data) {
        self.nonVolatileDataInfo.set(key, location);
        self.nonVolatileData.set(key,data);
    };

    this.printNonVolatileData = function() {
        self.nonVolatileData.forEach(function(data,key) {
            console.log('key:',key,data);
        });
    };

    // This dict holds data that is only valid during the current instance of K3
    this.volatileData = dict();
    
    this.availableFolders = [];
    this.missingFolders = [];
    this.initializeFolderStructure = function() {
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
                if(PRINT_FOLDER_CREATION_INFO) {
                    self.log('missing',self.missingFolders);
                    self.log('found',self.availableFolders);
                }
                defered.resolve();
            });
        return defered.promise;
    };

    /*
     * getInstalledModules
     * Goals: populate required folders list so that there is one for each 
     * module.
     */
    this.getInstalledModules = function() {
        var defered = q.defer();

        fs_facade.getLoadedModulesInfo(function(err) {
            self.pErr('fs_facade getModules err',err);
            defered.reject();
        }, function(modules) {
            modules.forEach(function(module) {
                if(module.active) {
                    fs_facade.getModuleInfo(module.name,function(err) {
                        self.pErr('fs_facade getInfo err',err);
                    }, function(moduleData){
                        addActiveModule(moduleData);
                    });
                    
                }
            });
            defered.resolve();
        });
        return defered.promise;
    };

    /*
     * initializeFileStructure
     * Goals: initialize the basic files in which data will be stored.
     * 1. a gdm.json file that stores basic version info & serves as a "check" 
     * to see if things are corrupt as well as empty files for all found 
     * modules.
     */
    this.initializeGDMFile = function() {
        var defered = q.defer();
        var tempData = {'version':gdmVersion,'data':[]};
        var initGDMFile = function(resolve, reject) {
            var tempStr = JSON.stringify(tempData);
            fs.writeFile(GDM_FILE_PATH,tempStr,function(err) {
                if (err) {
                    isError = true;
                    errors.push(err);
                    reject();
                }
                resolve();
            });
            self.gdmData = tempData;
        };

        fs.exists(GDM_FILE_PATH,function(exists) {
            if(exists) {
                // Try to read the file
                fs.readFile(GDM_FILE_PATH, function(err, data) {
                    if(err) {
                        self.pErr('Error reading gdm.json file, re-initializing file');
                        initGDMFile(defered.resolve, defered.reject);
                    } else {
                        // if successfully read the file, try to parse its contents.
                        self.gdmData = tempData;
                        try {
                            self.gdmData = JSON.parse(data);
                            defered.resolve();
                        } catch (error) {
                            // if the contents are corrupt, re-init the gdm.json file
                            self.pErr('Corrupt gdm .json file, re-initializing file');
                            initGDMFile(defered.resolve, defered.reject);
                        }
                    }
                });
            } else {
                // if the file doesn't exist, then re-init the gdm.json file
                self.pErr("gdm.json file doesn't exist, re-initializing file");
                initGDMFile(defered.resolve, defered.reject);
            }
        });
        return defered.promise;
    };

    this.initializeModuleFileStructure = function() {
        var defered = q.defer();
        var isError = false;
        var errors = [];
        async.each(
            modules,
            function(moduleData,callback) {
                //Check to see if the file currently exists
                fs.exists(moduleData.dataPath,function(exists) {
                    if(exists) {
                        callback();
                    } else {
                        var tempData = {};
                        var tempStr = JSON.stringify(tempData);
                        fs.writeFile(moduleData.dataPath,tempStr,function(err) {
                            if (err) {
                                isError = true;
                                errors.push(err);
                            }
                            callback();
                        });
                    }
                });
            }, function(err) {
                if(err) {
                    defered.reject(err);
                } else {
                    defered.resolve();
                }
            });
        return defered.promise;
    };

    this.loadGDMData = function() {
        var defered = q.defer();
        self.gdmData.data.forEach(function(data) {
            if(data.key) {
                if(data.data) {
                    self.addNonVolatileData('gdm.json',data.key, data.data);
                }
            }
        });
        defered.resolve();
        return defered.promise;
    };
    /*
     * loadGlobalModuleData
     * Goals: opens and parses all of the module .json files that have now been 
     * initialized.  Saves the data into the gdm "nonVolatileData" dict object.
     */
    this.loadGlobalModuleData = function() {
        var defered = q.defer();
        async.each(
            modules,
            function(moduleData, callback) {
                fs.readFile(moduleData.dataPath, function(err, data) {
                    var createBackup = false;
                    var dataObj = {};
                    if(err) {
                        data = '{}';
                    } else {
                        try {
                            dataObj = JSON.parse(data);
                        } catch (error) {
                            dataObj = {};
                            createBackup = true;
                        }
                    }
                    if(createBackup) {
                        self.pErr('Corrupt .json file',moduleData);
                        var timeStr = new Date().getTime().toString();
                        fs.writeFile('backup_'+timeStr+'_'+moduleData.dataPath);
                    }
                    self.nonVolatileData.set(moduleData.moduleData.name,dataObj);
                    self.addNonVolatileData(moduleData.dataPath,moduleData.moduleData.name,dataObj);
                    callback();
                });
            }, function(err) {
                if(err) {
                    defered.reject();
                } else {
                    console.log('Loaded Data', self.nonVolatileData.size);
                    defered.resolve();
                }
            });
        return defered.promise;
    };
    

    /*
     * finishInitialization
     * Goals: save the state of the initialization routine to the self object
     * for init-now/check-and-block later type running.  
     */
    this.finishInitialization = function(data) {
        var defered = q.defer();
        self.isDataComplete = true;
        defered.resolve(data);
        return defered.promise;
    };

    /*
     * initializeData should be called on startup.  It loads a static file that 
     * holds persistent data between reboots and loads it into the startupData 
     * object.  It then transfers that data into the activeData object.
     */
    this.initializeData = function() {
        var defered = q.defer();
        var initError = function(bundle) {
            self.pErr('HERE!',bundle,bundle.stack);
            var errDefered = q.defer();
            self.isError = true;
            errDefered.reject(bundle);
            return errDefered.promise;
        };

        // Initialize K3 folder structure
        var initFuncs = [
            // Get a list of the installed modules
            self.clearData,
            self.getInstalledModules,
            self.initializeFolderStructure,
            self.initializeGDMFile,
            self.initializeModuleFileStructure,
            self.loadGDMData,
            self.loadGlobalModuleData,
            self.finishInitialization
        ];
        // self.activeModuleList()
        // .then(self.initializeFolderStructure(),initError)
        // .then(defered.resolve,defered.reject);
        // return defered.promise;
        return initFuncs.reduce(function (curFunc, nextFunc) {
            return curFunc.then(nextFunc, initError);
        }, q());
    };

    this.clearData = function() {
        var defered = q.defer();
        var files = ['gdm','data'];
        var filePaths = [];
        files.forEach(function(file) {
            filePaths.push(K3_TEMPORARY_FILE_PATH + PATH_TXT + file);
        });
        async.eachSeries(
            filePaths,
            function(filePath,callback) {
                rmdir('/usr/local/share/LabJack/K3/gdm',callback);
            },
            function(error) {
                if(error) {
                    self.pErr('Error Clearing Data',error);
                } else {
                    self.log('Successfully cleared data');
                }
                defered.resolve();
            }
        );
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
        console.log('*GDM, html version*');
    } else {
        console.log('*GDM NODE_WEBKIT_INSTANCE not defined*');
    }
} catch(err) {
    // Configure fs_facade for non-node-webkit use
    fs_facade.setIsNodeWebkitInstance(false);

    console.log('*GDM nodejs version*');
    var GDM = new globalDataManager();
    GDM.initializeData();
    GDM.waitForData()
    .then(function(data) {
        GDM.printNonVolatileData();
        console.log('waitFunc success!',data);
    }, function(err) {
        console.log('waitFunc err',err,ljsError.getNumErrors());
    });
}

