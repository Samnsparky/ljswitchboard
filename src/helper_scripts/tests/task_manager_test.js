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
		taskManager.init()
		.then(function(res) {
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('testOn Error', err);
			test.ok(false);
			test.done();
		}, function(err) {
			console.log('testOn syntax Error', err);
			test.ok(false);
			test.done();
		});
	},
	includeAllTasks: function (test) {
		taskManager.includeAllTasks()
		.then(function(res) {
			taskManager.printTaskList();
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('includeAllTasks Error', err);
			test.ok(false);
			test.done();
		}, function(err) {
			console.log('includeAllTasks syntax Error', err);
			test.ok(false);
			test.done();
		});
	},
	initializeAllTasks: function (test) {
		taskManager.initializeAllTasks()
		.then(function(res) {
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('initializeAllTasks Error', err);
			test.ok(false);
			test.done();
		}, function(err) {
			console.log('initializeAllTasks syntax Error', err);
			test.ok(false);
			test.done();
		});
	}
};