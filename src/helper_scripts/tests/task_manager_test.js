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

var task_manager = rewire('../task_manager.js');
var taskManager = task_manager.getTaskManager();

module.exports = {
	setUp: function (callback) {
		callback();
	},

	testOn: function (test) {
		console.log('taskManager', taskManager);
		test.ok(true);
		test.done();
	},

	testOnOverwrite: function (test) {
		test.done();
	}
};