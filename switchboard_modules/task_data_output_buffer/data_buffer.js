var fs = require('fs');             //Load File System module
var os = require('os');             //Load OS module
var path = require('path');

// Require npm
var q;
var dict;
var async;
var exposedLibs;
try {
	q = require('q');
	dict = require('dict');
	async = require('async');
} catch(err) {
	
}
exports.setExposedLibs = function(exposedLibs) {
	exposedLibs = exposedLibs;
	q = exposedLibs['q'];
	dict = exposedLibs['dict'];
	async = exposedLibs['async'];
};

exports.initTask = function() {
	var defered = q.defer();
	console.log('in data_buffer.js');
	defered.resolve();
	return defered.promise;
};