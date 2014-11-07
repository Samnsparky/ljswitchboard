var fs = require('fs');             //Load File System module
var os = require('os');             //Load OS module
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// Make this modune an event-emitter:
// module.exports = new EventEmitter();
// to emmit an event:
// module.exports.emit('ready');

var q;
var dict;
var async;
var exposedLibs;
var task_manager;

var task_state = '';
var isStarted = false;
var startDefered;
var updateIntervalHandled;
var dataBuffersDict;
var bufferModifications;
var activeDataBuffersDict;
var dataBuffers;

function createNewBuffer(initData) {
	this.bufferInfo = {};
	this.dataBuffers = [];

	// values that get initialized
	this.key = '';
	this.maxNumRows = 65535;
	this.curNumRows = 0;
	this.writeDelay = 1;
	this.curDelay = 1;
	this.activeBuffer = 0;
	this.inactiveBuffer = 1;
	
	var init = function(data) {
		var keys = Object.keys(data);

		// Default values
		var newBufferInfo = {
			'formatting': {
				'lineEnding': '\r\n',
				'valueSeparation': ', ',
				'misingValue': '0.000000001'
			},
			'maxNumRows': 65535,
			'writeDelay': 1,
			'curDelay': 1,
			'activeBuffer': 0,
			'inactiveBuffer': 1
		};
		keys.forEach(function(givenKey) {
			newBufferInfo[givenKey] = data[givenKey];
		});
		var transferKeys = [
			'key',
			'maxNumRows',
			'writeDelay',
			'curDelay',
			'activeBuffer',
			'inactiveBuffer'
		];
		transferKeys.forEach(function(transferKey) {
			self[transferKey] = newBufferInfo[transferKey];
			newBufferInfo[transferKey] = undefined;
			delete newBufferInfo[transferKey];
		});
		var keysList = newBufferInfo.dataKeys;
		var lastKey = keysList[keysList.length - 1];
		newBufferInfo.lastKey = lastKey;
		newBufferInfo.currentFileName = newBufferInfo.fileName;
		newBufferInfo.numFilesCreated = 0;
		self.bufferInfo = newBufferInfo;
		self.dataBuffers = [[],[]];
	};

	

	var getNextBuffer = function(cur) {
		var retInt = cur + 1;
		if(retInt > 1) {
			retInt = 0;
		}
		return retInt;
	};
	this.initFile = function() {
		var defered = q.defer();
		self.numFilesCreated += 1;
		defered.resolve();
		return defered.promise;
	};
	this.manageActiveFile = function() {
		var defered = q.defer();
		if(self.numFilesCreated === 0) {
			self.initFile()
			.then(defered.resolve);
		} else {
			defered.resolve();
		}
		return defered.promise;
	};
	var convertDataToString = function(dataType, data, curLineCount, maxLineCount) {
		var retObj = [''];
		var curIndex = 0;
		var addLine = function(str) {
			str += self.bufferInfo.formatting.lineEnding;
			retObj[curIndex] += str;
		};
		var handleSingleType = function(newData) {
			var newLine = '';
			self.bufferInfo.dataKeys.forEach(function(dataKey) {
				var newStr = '';
				if(newData[dataKey]) {
					newStr += newData[dataKey];
				} else {
					newStr += self.bufferInfo.formatting.misingValue;
				}
				if(dataKey !== self.bufferInfo.lastKey) {
					newStr += self.bufferInfo.formatting.valueSeparation;
				}
				newLine += newStr;
			});
			addLine(newLine);
		};
		if(dataType === 'raw') {
			var rawStr = '';
			rawStr = data.toString();
			var splitStr = rawStr.split(self.bufferInfo.formatting.lineEnding);
			splitStr.forEach(function(str) {
				addLine(str);
			});
		} else if(dataType === 'single') {
			handleSingleType(data);
		} else if(dataType === 'multiple') {
			var sortedResults = [];
			self.bufferInfo.dataKeys.forEach(function(dataKey) {
				if(data[dataKey]) {
					if(sortedResults.length === 0) {
						data[dataKey].forEach(function(dataPoint) {
							var newDataPoint = {};
							newDataPoint[dataKey] = dataPoint;
							sortedResults.push(newDataPoint);
						});
					} else {
						var i = 0;
						if(data[dataKey].length === sortedResults.length) {
							for(i; i < sortedResults.length; i++) {
								sortedResults[i][dataKey] = data[dataKey][i];
							}
						} else {
							var firstLen = 0;
							var secondLen = 0;
							if(data[dataKey].length > sortedResults.length) {
								firstLen = data[dataKey].length;
								secondLen = sortedResults.length;
								for(i; i < firstLen; i++) {
									sortedResults[i][dataKey] = data[dataKey][i];
								}
								for(i; i < secondLen; i++) {
									sortedResults[i][dataKey] = 0;
								}
							} else {
								firstLen = data[dataKey].length;
								for(i; i < firstLen; i++) {
									sortedResults[i][dataKey] = data[dataKey][i];
								}
							}
							throw new Error('Error adding data to buffer, mis-matched size');
						}
					}
				}
			});
			sortedResults.forEach(function(sortedResult) {
				handleSingleType(sortedResult);
			});
		}
		return retObj;
	};
	this.bufferAndWriteData = function() {
		var defered = q.defer();
		if(self.curDelay <= 0) {
			var activeIndex = self.activeBuffer;
			var inactiveIndex = self.inactiveBuffer;
			console.log('Processing Buffer:', self.key, activeIndex, inactiveIndex, self.curNumRows);
			if(self.dataBuffers[activeIndex].length > 0) {
				// Swap the active buffer and then save its data
				self.activeBuffer = getNextBuffer(activeIndex);
				self.inactiveBuffer = getNextBuffer(inactiveIndex);

				// Save the buffer's data locally and empty the buffers contents
				var newData = self.dataBuffers[activeIndex];
				self.dataBuffers[activeIndex] = [];
				var filesData = [''];
				var curIndex = 0;
				var addDataToFilesData = function(newFileData) {
					if(newFileData.length === 1) {
						filesData[curIndex] += newFileData.pop();
					} else {
						filesData[curIndex] += newFileData.pop();
						curIndex += 1;
						filesData.push('');
						addDataToFilesData(newFileData);
					}
				};
				newData.forEach(function(newDataObj) {
					var data = newDataObj.data;
					var dataType = newDataObj.dataType;
					console.log(dataType, Array.isArray(data));
					if(Array.isArray(data)) {
						data.forEach(function(dataPoint) {
							var newConvertedData = convertDataToString(dataType, dataPoint);
							addDataToFilesData(newConvertedData);
						});
					} else {
						var newConvertedData = convertDataToString(dataType, data);
						addDataToFilesData(newConvertedData);
					}
					
				});
				// console.log('newData', newData);
				console.log('filesData', filesData);
				filesData.forEach(function(fileData) {
					console.log(fileData);
				});
				
				self.curNumRows += numNewRows;
			}
			self.curDelay = self.writeDelay;
		} else {
			self.curDelay -= 1;
		}
		defered.resolve();
		return defered.promise;
	};
	this.executeStep = function() {
		var defered = q.defer();
		self.manageActiveFile()
		.then(self.bufferAndWriteData)
		.then(defered.resolve);
		return defered.promise;
	};
	this.flushBuffer = function(callback) {
		console.log('in flushBuffer');
		callback();
	};
	this.saveDataToBuffer = function(data) {
		var bufIndex = self.activeBuffer;
		self.dataBuffers[bufIndex] = self.dataBuffers[bufIndex].concat(data);
	};
	this.write = function(dataType, data) {
		// var newStr = convertDataToString(dataType, data);
		var newDataPoint = {'dataType': dataType, 'data': data};
		self.saveDataToBuffer(newDataPoint);
	};
	this.writeArray = function(dataType, data) {
		//var newStr = '';
		//data.forEach(function(dataPoint) {
		//	var tempStr = convertDataToString(dataType, dataPoint);
		//	newStr += tempStr;
		//});
		var newData = [];
		data.forEach(function(dataPoint) {
			var newDataPoint = {'dataType': dataType, 'data': data};
			newData.push(newDataPoint);
		});
		self.saveDataToBuffer(newData);
	};
	var self = this;
	init(initData);
}

/**
 * getTaskState makes it possible for the taskManager to know the status of each
 *  created task.
 * @return {string} the state of the task.  Is hopefully a standard state, but 
 *                      can be an arbitrary string if necessary.
 */
exports.getTaskState = function() {
	return task_state;
};
/**
 * includeTask is the function that the task_manager will call just after 
 * "requiring" the task in order to pass available libraries to the sub-tasks 
 * so that they don't have to require them and create new references to them.
 */
exports.includeTask = function(exposedLibs) {
	exposedLibs = exposedLibs;
	q = exposedLibs['q'];
	dict = exposedLibs['dict'];
	async = exposedLibs['async'];
	task_manager = exposedLibs['task_manager'];

	// Set state to 'included'
	task_state = task_manager.task_state_options[0];

	// set the interval handler to null
	updateIntervalHandler = undefined;
	isStarted = false;
	startDefered = undefined;
	dataBuffersDict = undefined;
	activeDataBuffersDict = undefined;
	bufferModifications = undefined;

	// console.log('exposedLibs', Object.keys(exposedLibs));
	// console.log('task_manager tasks', task_manager.taskList.size);
};

/**
 * initTask is called by the task_manager when this task needs to be 
 * initialized.  This function should be able to re-set the task to its starting
 * state.  
 * 
 * @return {promise} q-promise
 */
var initTask = function() {
	var defered = q.defer();

	// set the interval handler to null
	updateIntervalHandler = undefined;
	isStarted = false;
	startDefered = undefined;
	dataBuffersDict = dict();
	activeDataBuffersDict = dict();
	bufferModifications = [];

	// Set state to 'initialized'
	task_state = task_manager.task_state_options[1];
	defered.resolve();
	return defered.promise;
};
exports.initTask = initTask;
/**
 * isInitialized is a function used specifically for testing.  It allows the 
 * task to report whether or not it was properly initialized.  Making sure that 
 * all libraries are defined, variables initialized, etc.
 * 
 * @return {Boolean} Boolean indicating if the task was initialized properly
 */
exports.isInitialized = function() {
	var is_initialized = true;
	if(typeof(q) === 'undefined' || typeof(q) === 'null' ) {
		is_initialized = false;
	}
	if(typeof(dict) === 'undefined' || typeof(dict) === 'null' ) {
		is_initialized = false;
	}
	if(typeof(async) === 'undefined' || typeof(async) === 'null' ) {
		is_initialized = false;
	}
	// Make sure that the current state isn't invalid or included
	if(task_state === task_manager.task_state_options[0] || task_state === '' ) {
		is_initialized = false;
	}
	// make sure that the updateIntervalHandler is null
	if(typeof(updateIntervalHandler) !== 'undefined') {
		is_initialized = false;
	}
	if(typeof(startDefered) !== 'undefined') {
		is_initialized = false;
	}
	if(isStarted !== false) {
		is_initialized = false;
	}
	if(dataBuffersDict.size !== 0) {
		is_initialized = false;
	}
	if(activeDataBuffersDict.size !== 0) {
		is_initialized = false;
	}
	if(!is_initialized) {
		console.log('task_state', task_state);
		console.log('updateIntervalHandler', updateIntervalHandler);
		console.log('startDefered', startDefered);
		console.log('isStarted', isStarted);
		console.log('dataBuffersDict',dataBuffersDict.size);
		console.log('activeDataBuffersDict',activeDataBuffersDict.size);
	}
	return is_initialized;
};

exports.startTask = function() {
	var taskDefered = q.defer();
	if(task_state === task_manager.task_state_options[1]) {
		task_state = task_manager.task_state_options[2];
		isStarted = false;
		startDefered = taskDefered;
		updateIntervalHandler = setInterval(updateDataBuffers, 1000);
	} else {
		taskDefered.reject();
	}
	return taskDefered.promise;
};

exports.stopTask = function() {
	var taskDefered = q.defer();
	if(typeof(updateIntervalHandler) !== 'undefined') {
		clearInterval(updateIntervalHandler);
		updateIntervalHandler = undefined;
	}
	console.log('Stopping data_buffer.js Task',dataBuffersDict.size, activeDataBuffersDict.size);
	if((dataBuffersDict.size === 0)&&(activeDataBuffersDict.size === 0)) {
		initTask().then(taskDefered.resolve, taskDefered.reject);
	} else {
		var buffersToFlush = [];
		dataBuffersDict.forEach(function(dataBuffer, key) {
			buffersToFlush.push(key);
		});
		async.each(
			buffersToFlush,
			function(key, callback) {
				bufferModifications.push({
					'operation': 'delete',
					'key': key,
					'next': callback
				});
			}, function(err) {
				console.log('Finished Flushing all buffers');
				if(err) {
					taskDefered.reject(err);
				} else {
					taskDefered.resolve();
				}
			}
		);

		
	}
	
	return taskDefered.promise;
};
var getFinishedFlushingBuffer = function(mod) {
	return function() {
		var key = mod.key;
		dataBuffersDict.delete(key);
		activeDataBuffersDict.delete(key);
		mod.next();
	};
};
var updateActiveBuffers = function() {
	//  Perform any active buffer modifications so that operations are thread 
	//  safe.
	if(bufferModifications.length > 0) {
		while(bufferModifications.length > 0) {
			var bufferModification = bufferModifications.pop();
			var key = bufferModification.key;
			if (bufferModification.operation === 'add') {
				activeDataBuffersDict.set(key,dataBuffersDict.get(key));
				// execute the callback indicating that the buffer has been created and added
				bufferModification.next(dataBuffersDict.get(key));
			} else if (bufferModification.operation === 'delete') {
				dataBuffersDict.get(key).flushBuffer(
					getFinishedFlushingBuffer(bufferModification)
				);
			}
		}
	}
};
var updateDataBuffers = function() {
	if (!isStarted) {
		isStarted = true;
		startDefered.resolve();
	}
	if (activeDataBuffersDict.size !== 0) {
		// Set state to active, there are one or more active file buffers
		task_state = task_manager.task_state_options[3];
		var activeBuffers = [];
		activeDataBuffersDict.forEach(function(activeBuffer, key) {
			activeBuffers.push(activeBuffer);
		});
		async.each(
			activeBuffers,
			function(activeBuffer, callback) {
				var getR = function(data) {
					return function(res) {
						console.log('Buffer Update finished', data, res);
					};
				};
				try {
					activeBuffer.executeStep()
					.then(function() {
						callback();
					});
				} catch(err) {
					console.log('Error in data_buffer.js updateDataBuffers', err);
					throw new Error('Error in data_buffer.js updateDataBuffers', err);
				}
			}, function(err) {
				updateActiveBuffers();
			});
	} else {
		// Set state to idle, there are no active file buffers
		task_state = task_manager.task_state_options[2];
		updateActiveBuffers();
	}
};

exports.addOutputBuffer = function(newBufferInfo) {
	var defered = q.defer();
	var requiredKeys = ['key', 'type', 'dataKeys'];
	var localFileKeys = ['location', 'fileName', 'fileEnding'];
	// Formatting should have .csv (comma and semicolon separated) .tsb (tab separated)
	// Should be able to configure time stamp: (http://www.epochconverter.com/epoch/batch-convert.php)
	//     1. Unix/Epoc timestamp (Seconds since Jan 1 1970)
	//     2. Human-Readable %Y-%m-%d %H:%M:%S
	//     3. ISO 8601 format e.g. 2014-11-04T02:35:36+00:00
	// maxNumRows should default to 65535 with options to go larger or smaler
	var remoteFileKeys = ['service'];
	var givenKeys = Object.keys(newBufferInfo);
	var isValidInput = true;

	if (givenKeys.indexOf('type') >= 0) {
		if (newBufferInfo.type === 'localFile') {
			localFileKeys.forEach(function(localFileKey) {
				requiredKeys.push(localFileKey);
			});
		} else if (newBufferInfo.type === 'remote'){
			remoteFileKeys.forEach(function(localFileKey) {
				requiredKeys.push(localFileKey);
			});
		} else {
			isValidInput = false;
			console.error('Invalid type key', newBufferInfo.type);
		}
	}
	requiredKeys.forEach(function(requiredKey) {
		if(givenKeys.indexOf(requiredKey) < 0) {
			isValidInput = false;
			console.error('Missing Key:', requiredKey);
		}
	});
	
	if(isValidInput) {
		// create a new buffer object
		var newBuffer = new createNewBuffer(newBufferInfo);

		// Initialize data buffer
		dataBuffersDict.set(newBuffer.key, newBuffer);
		bufferModifications.push({
			'operation': 'add',
			'key': newBuffer.key,
			'next': defered.resolve
		});
	} else {
		defered.reject('Invalid Arguments');
	}
	return defered.promise;
};
exports.removeOutputBuffer = function(key) {
	var defered = q.defer();
	if(dataBuffersDict.has(key)) {
		bufferModifications.push({
			'operation': 'delete',
			'key': key,
			'next': defered.resolve
		});
		// defered.resolve();
	} else {
		console.log('Buffer does not exist', key);
		defered.reject();
	}
	return defered.promise;
};
