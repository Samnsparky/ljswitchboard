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
    var registeredName = 'GDM';
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
            console.log(i.toString()+',', taskKey);
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



    this.startTask = function(taskName) {

    };

    this.init = function() {
        var defered = q.defer();
        initTaskList()
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

