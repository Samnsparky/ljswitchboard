/**
 * task_manager.js for LabJack Switchboard.  Provides Kipling with the ability
 * to have monitored background tasks that allow for easier implementation of
 * ideas that don't require user feedback but depend on other events happening.
 * Turning these into "tasks" that run independently from each other makes 
 * implementing them easier, more modular, and testable.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

var dict = require('dict');
var q = require('q');
var rewire = require('rewire');
var async = require('async');
var handlebars = require('handlebars');
var device_controller = require('./../../device_controller');

var task_manager = rewire('../task_manager.js');
var taskManager = task_manager.getTaskManager({
		'device_controller': device_controller,
		'handlebars': handlebars
	});

// Tasks to test:
dataOutputBufferTaskName = 'task_data_output_buffer';
validTasks = [dataOutputBufferTaskName];

module.exports = {
	setUp: function (callback) {
		callback();
	},
	initializeDeviceController: function (test) {
		console.log('device_controller', device_controller);
		test.done();
	}
};