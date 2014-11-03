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
    var taskStateOptions = ['inactive', 'active'];

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
    this.initializeTask = function(taskKey) {
        var defered = q.defer();
        if(self.taskList.has(taskKey)) {
            self.taskList.get(taskKey).obj.setExposedLibs({
                'q':q,
                'async':async,
                'dict':dict,
                '$': $
            });
            self.taskList.get(taskKey).obj.initTask();
        } else {
            self.log('task does not exist', taskKey);
        }
        return defered.promise;
    };
    this.initializeAllTasks = function() {
        var defered = q.defer();
        var initFuncs = [];
        self.taskList.forEach(function(task, taskKey){
            task.obj.setExposedLibs({
                'q':q,
                'async':async,
                'dict':dict,
                '$': $
            });
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

    this.includeAllTasks = function() {
        var defered = q.defer();
        self.taskList.forEach(function(task, taskKey){
            self.log('HERE',taskKey);
            var activePath = task.taskData.activePath;
            var basePath = path.dirname(activePath);
            var taskLocation = path.join(basePath,'data_buffer.js');
            try {
                var taskObject = require(taskLocation);
                task.obj = taskObject;
            } catch(err) {
                self.pErr('error requiring task:', task.taskData.name, 'err:', err);
            }
            self.taskList.set(taskKey, task);
        });
        defered.resolve();
        return defered.promise;
    };


    this.startTask = function(taskName) {

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

exports.getTaskManager = function(enableGuiTasks, jqueryRef) {
    $ = jqueryRef;
    return TASK_MANAGER;
};

