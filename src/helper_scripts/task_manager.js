/**
 * task_manager.js for LabJack Switchboard.  Provides Kipling with the ability
 * to have monitored background tasks that allow for easier implementation of
 * ideas that don't require user feedback but depend on other events happening.
 * Turning these into "tasks" that run independently from each other makes 
 * implementing them easier, more modular, and testable.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

var fs = require('fs');             //Load File System module
var os = require('os');             //Load OS module
var path = require('path');
var ch = require('child_process');

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
var fs_facade;
try {
    fs_facade = require('./../fs_facade');
} catch (err) {
    fs_facade = require('./fs_facade');
}
var device_controller;

var nodePath = path.join(path.dirname(process.execPath), 'node');
if (process.platform === 'win32') {
    nodePath += ".exe";
}

var $;
function taskManager() {
    var registeredName = 'TM';
    this.registeredName = registeredName;

    // Define console.log type functions
    var printer = dataPrinter.makePrinter(registeredName);
    this.log = printer.log;
    this.pWarn = printer.pWarn;
    this.pErr = printer.pErr;

    this.enableGuiTasks = null;


    // The tasks can be in two different states, "inactive" and  "active".
    this.task_state_options = ['included', 'initialized', 'idle', 'active'];

    this.taskList = dict();
    this.printTaskList = function() {
        console.log("task_manager tasks:");
        var i = 0;
        self.taskList.forEach(function(task, taskKey){
            console.log(i.toString()+',', taskKey, task);
        });
    };

    /*
     * initTaskList
     * Goals: populate a list of tasks that can be controlled by the task 
     * manager.
     */
    this.initTaskList = function() {
        var defered = q.defer();

        fs_facade.getLoadedModulesInfo(function(err) {
            self.pErr('fs_facade getModules err',err);
            defered.reject();
        }, function(modules) {
            var asyncErrors = [];
            async.each(
                modules,
                function(module, asyncCallback) {
                    if(module.active) {
                        if(module.isTask) {
                            fs_facade.getModuleInfo(module.name,function(err) {
                                self.pErr('fs_facade getInfo err',err);
                                asyncCallback();
                            }, function(moduleData){
                                var taskObj = {};
                                taskObj.taskData = moduleData;
                                taskObj.obj = null;
                                self.taskList.set(moduleData.name, taskObj);
                                asyncCallback();
                            });
                        } else {
                            // self.log('skipping module', module);
                            asyncCallback();
                        }
                    } else {
                        // self.log('module not active', module);
                        asyncCallback();
                    }
                },
                function(isError) {
                    if(isError) {
                        defered.reject(isError);
                    }
                    else {
                        defered.resolve();
                    }
                }
            );
        });
        return defered.promise;
    };
    this.getSharedLibs = function() {
        return {
            'requireBasePath': process.cwd() + '/node_modules/',
            'q':q,
            'async':async,
            'dict':dict,
            '$': $,
            'ljsError': ljsError,
            'dataPrinter': dataPrinter,
            'fs_facade': fs_facade,
            'task_manager': TASK_MANAGER,
            'device_controller': device_controller
        };
    };
    this.setTaskLibs = function(task) {
        task.includeTask(self.getSharedLibs());
    };
    this.includeAllTasks = function() {
        var defered = q.defer();
        self.taskList.forEach(function(task, taskKey){
            console.log('execPath',process.execPath,'cwd', process.cwd());
            var activePath = task.taskData.activePath;
            var basePath = path.dirname(activePath);
            var taskLocation = path.join(basePath,'data_buffer.js');
            console.log('activePath', activePath, 'basePath', basePath);
            try {
                // console.log('HERE', taskObject);
                var taskObject = require(taskLocation);
                task.obj = taskObject;
                self.setTaskLibs(task.obj);
            } catch(err) {
                self.pErr('error requiring task:', task.taskData.name, 'err:', err);
            }
            self.taskList.set(taskKey, task);
        });
        defered.resolve();
        return defered.promise;
    };
    this.initializeTask = function(taskKey) {
        var defered = q.defer();
        if(self.taskList.has(taskKey)) {
            self.taskList.get(taskKey).obj.initTask();
            defered.resolve();
        } else {
            self.log('task does not exist', taskKey);
            defered.reject();
        }
        return defered.promise;
    };
    this.initializeAllTasks = function() {
        var defered = q.defer();
        var initFuncs = [];
        self.taskList.forEach(function(task, taskKey){
            initFuncs.push(task.obj.initTask);
        });
        async.each(
            initFuncs,
            function(initFunc, callback) {
                initFunc()
                .then(function() {
                    callback();
                }, function(err) {
                    callback(err);
                }, function(err) {
                    self.pErr('Error in initializeAllTasks',err);
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
    this.getStartTask = function(taskName) {
        var startTaskFunc = function() {
            var innerDeferred = q.defer();
            self.startTask(taskName)
            .then(innerDeferred.resolve, innerDeferred.reject);
            return innerDeferred.promise;
        };
        return startTaskFunc;
    };
    this.startTask = function(taskName) {
        var taskDefered = q.defer();
        if(self.taskList.has(taskName)) {
            self.taskList.get(taskName).obj.startTask()
            .then(taskDefered.resolve, taskDefered.reject);
        } else {
            taskDefered.reject();
        }
        return taskDefered.promise;
    };
    this.startAllTasks = function() {
        var defered = q.defer();
        var startFuncs = [];
        self.taskList.forEach(function(task, taskKey){
            startFuncs.push(self.getStartTask(taskKey));
        });
        async.each(
            startFuncs,
            function(startFunc, callback) {
                startFunc()
                .then(function() {
                    callback();
                }, function(err) {
                    callback(err);
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
    this.getStopTask = function(taskName) {
        var stopTaskFunc = function() {
            var defered = q.defer();
            self.stopTask(taskName)
            .then(defered.resolve, defered.reject);
            return defered.promise;
        };
        return stopTaskFunc;
    };
    this.stopTask = function(taskName) {
        var defered = q.defer();
        if(self.taskList.has(taskName)) {
            self.taskList.get(taskName).obj.stopTask()
            .then(defered.resolve, defered.reject);
        } else {
            defered.reject();
        }
        return defered.promise;
    };
    this.stopAllTasks = function() {
        var defered = q.defer();
        var stopFuncs = [];
        self.taskList.forEach(function(task, taskKey){
            stopFuncs.push(self.getStopTask(taskKey));
        });
        async.each(
            stopFuncs,
            function(stopFunc, callback) {
                stopFunc()
                .then(function() {
                    callback();
                }, function(err) {
                    callback(err);
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

    this.getTask = function(taskName) {
        if(self.taskList.has(taskName)) {
            try {
                return self.taskList.get(taskName).obj;
            } catch(err) {
                self.pErr('Error getting task state', taskName, err);
                return;
            }
        } else {
            return;
        }
    };
    this.getTaskState = function(taskName) {
        if(self.taskList.has(taskName)) {
            try {
                return self.taskList.get(taskName).obj.getTaskState();
            } catch(err) {
                self.pErr('Error getting task state', taskName, err);
                return;
            }
        } else {
            return;
        }
    };
    this.checkTaskInit = function(taskName) {
        if(self.taskList.has(taskName)) {
            try {
                return self.taskList.get(taskName).obj.isInitialized();
            } catch(err) {
                self.pErr('Error checking init', taskName, err);
                return false;
            }
        } else {
            return false;
        }
    };

    this.init = function() {
        var defered = q.defer();
        self.initTaskList()
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };

    this.testA = function() {
        return $('.device-pane').html();
    };
    this.testB = function(str) {
        return $(str);
    };


    var self = this;
}
var TASK_MANAGER = new taskManager();

exports.getTaskManager = function(libs, enableGuiTasks) {
    $ = libs['$'];
    device_controller = libs['device_controller'];
    handlebars =  libs['handlebars'];
    return TASK_MANAGER;
};

