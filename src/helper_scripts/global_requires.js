/**
 * global_requires.js
 *
 * File that globally includes a variety of required libraries for later use 
 * through out K3.  The goal here is to reduce the number of program-wide 
 * require statements and to reduce namespace clutter.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

//-------------------------- Node-Webkit Requires ------------------------------
var gui;
try {
	gui = require('nw.gui');
} catch (e) {
	console.error('Failed to load nw.gui');
}

//-------------------------- NPM Requires --------------------------------------
var async = require('async');
var handlebars = require('handlebars');
var q = require('q');
var dict = require('dict');

//-------------------------- LabJack Specific Requires -------------------------
var fs_facade = require('./fs_facade');

var device_controller = null;
try {
	device_controller = require('./device_controller');
} catch (e) {
	try {
		showPrematureAlert(
			'<b>Failed to load JSON constants file or LJM on your machine. Please '+
			'check the install and restart Kipling</b>. Original error: '+
			e.toString()
		);
	} catch(err) {
		console.error('Error calling showPrematureAlert global_requires.js',e,e.getStack(),err,err.getStack());
	}
}

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

var task_manager;
var TASK_MANAGER;
try {
	task_manager = require('./helper_scripts/task_manager');
	TASK_MANAGER = task_manager.getTaskManager({
		'$': $,
		'device_controller': device_controller,
		'handlebars': handlebars,
		'gui': gui
	}, true);

	TASK_MANAGER.init()
	.then(TASK_MANAGER.includeAllTasks)
	// .then(TASK_MANAGER.initializeAllTasks);
	.then(function(data) {
		console.log('Finished starting TASK_MANAGER', data);
	})
} catch (err) {
	try {
		task_manager = require('./task_manager');
		TASK_MANAGER = task_manager.getTaskManager({
			'$': $,
			'device_controller': device_controller,
			'handlebars': handlebars,
			'gui': gui
		}, true);

		TASK_MANAGER.init()
		.then(TASK_MANAGER.includeAllTasks)
		// .then(TASK_MANAGER.initializeAllTasks);
		.then(function(data) {
			console.log('Finished starting TASK_MANAGER', data);
		})
	} catch(innerError) {
		console.error('task_manager not found');
	}
}

