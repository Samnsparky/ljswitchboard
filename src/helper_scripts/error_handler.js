/**
 * version_manager.js for LabJack Switchboard.  Provides Kipling with the ability
 * to query for various versions of LabJack software versions, firmeware 
 * versions, and drivers
 *
 * @author Chris Johnson (LabJack, 2014)
**/

var q = require('q');
var request = require('request');
var async = require('async');
var dict = require('dict');
var handlebars = require('handlebars');
console.log('Initializing error_handler.js');

var errorTypes = {
	'critical':		0,
	'warning':		1,
	'generic':		2
};
var errorTypesStr = {
	0: 'critical',
	1: 'warning',
	2: 'generic'
};
var UNKNOWN_ERROR = 'unknownError';
var DEFAULT_SAVE_TYPE = 'start';
var registeredNames = [
	{
		'name':'GDM',
		'saveType': 'start',
		'location': 'global_data_manager.js',
		'errorList': [
			{'name': 'missingReqDir', 'message': 'Missing a required temp directory, LJM may not be installed properly.'}
		]
	},
	{
		'name': UNKNOWN_ERROR,
		'saveType': 'start',
		'location': 'unknown'
	}
];
var savedErrors = dict();
var registeredNamesDict = dict();
registeredNames.forEach(function(registeredName) {
	var errorDict = dict();
	var errors = dict();
	if(registeredName.errorList) {
		registeredName.errorList.forEach(function(err){
			errors.set(err.name,err.message);
		});
	}
	savedErrors.set(registeredName.name,errorDict);
	registeredName.errors = errors;
	registeredNamesDict.set(registeredName.name,registeredName);
});
var numErrors = 0;
var latestError = null;
var allErrors = [];


var makeErrorObj = function(level, errorName, callerInfo, options) {
	var message;
	if(options.message) {
		message = options.message;
	} else {
		message = callerInfo.name + ': ';
		if(callerInfo.errors.has(errorName)) {
			message += callerInfo.errors.get(errorName);
		} else {
			message += errorName + ' (undefined)';
		}
	}
	var data;
	if(options.data) {
		data = options.data;
	} else {
		data = null;
	}
	var date = new Date();
	var errorObject = {
		'level': level,
		'levelStr': errorTypesStr[level],
		'type': errorName,
		'callerName': callerInfo.name,
		'location': callerInfo.location,
		'message': message,
		'data': data,
		'options': options,
		'time': date
	};
	return errorObject;
};
var saveStartError = function(callerName, errorName, newError) {
	var curErrorDict = savedErrors.get(callerName);
	var errorArray = [newError];
	curErrorDict.set(errorName, errorArray);
};
var savePushError = function(callerName, errorName, newError) {
	var curErrorDict = savedErrors.get(callerName);
	if(curErrorDict.has(errorName)) {
		var curArray = curErrorDict.get(errorName);
		curArray.push(newError);
		curErrorDict.set(errorName, curArray);
		
	} else {
		var errorArray = [newError];
		curErrorDict.set(errorName, errorArray);
	}
};

var makeError = function(level, callerName, errorName, options) {
	if(!options) {
		options = {};
	}
	if(!savedErrors.has(callerName)) {
		callerName = UNKNOWN_ERROR;
	}
	numErrors += 1;

	var curErrorDict = savedErrors.get(callerName);
	var callerInfo = registeredNamesDict.get(callerName);
	var newError = makeErrorObj(level, errorName, callerInfo, options);
	latestError = newError;
	allErrors.push(newError);

	var saveType;
	if(options.saveType) {
		saveType = options.saveType;
	} else {
		saveType = callerInfo.saveType;
	}

	if(saveType === 'start') {
		savePushError(callerName, errorName, newError);
	} else if (saveType === 'push') {
		saveStartError(callerName, errorName, newError);
	} else {
		saveStartError(callerName, errorName, newError);
	}
	return newError;
};

/**
 * Possible Options are:
 *  1. message {string} A user-readable message, if not given is auto-filled.
 *  2. data {string} User-defined data, defaults to ''.
 *  3. saveType {string} Either 'push' or 'start', defaults to start. Used to 
 *     save errors to the error stack for later retrieval.
 * @param  {[type]} callerName [description]
 * @param  {[type]} errorName  [description]
 * @param  {[type]} options    [description]
 * @return {[type]}            [description]
 */
exports.criticalError = function(callerName, errorName, options) {
	return makeError(errorTypes['critical'], callerName, errorName, options);
};
exports.warning= function(callerName, errorName, options) {
	return makeError(errorTypes['warning'], callerName, errorName, options);
};
exports.getAllErrors = function() {
	return allErrors;
};
exports.getLatestError = function() {
	return latestError;
};
exports.getNumErrors = function() {
	return numErrors;
};
exports.getSavedErrors = function() {
	return savedErrors;
};

