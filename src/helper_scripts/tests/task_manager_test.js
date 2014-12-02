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
	initializeTaskManager: function (test) {
		taskManager.init()
		.then(function(res) {
			var expectedTasks = validTasks;
			var foundTasks = [];
			taskManager.taskList.forEach(function(task, taskKey) {
				foundTasks.push(taskKey);
			});
			test.deepEqual(foundTasks, expectedTasks, 'taskManager.taskList does not match expectedTasks list');
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
			taskManager.taskList.forEach(function(task, taskKey) {
				var cur_task_state  = taskManager.getTaskState(taskKey);
				var expected_state = taskManager.task_state_options[0];
				var mesg = 'task: ' + taskKey + ', was not included';
				test.strictEqual(cur_task_state, expected_state, mesg);
			});
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
			taskManager.taskList.forEach(function(task, taskKey) {
				var cur_task_state  = taskManager.getTaskState(taskKey);
				var expected_state = taskManager.task_state_options[1];
				var mesg = 'task: ' + taskKey + ', was not initialized';
				test.strictEqual(cur_task_state, expected_state, mesg);
				var initStatus = taskManager.checkTaskInit(taskKey);
				mesg = 'task: ' + taskKey + ', was not initialized properly';
				test.ok(initStatus, mesg);
			});
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
	},
	initializeAllTasksIndependently: function(test) {
		var taskNames = [];
		taskManager.taskList.forEach(function(task, taskKey) {
			taskNames.push(taskKey);
		});
		async.each(
			taskNames,
			function(taskName, callback) {
				taskManager.initializeTask(taskName)
				.then(function() {
					callback();
				}, function(err) {
					callback(err);
				});
			}, function(err) {
				if(err) {
					test.ok(false);
				} else {
					taskManager.taskList.forEach(function(task, taskKey) {
						var cur_task_state  = taskManager.getTaskState(taskKey);
						var expected_state = taskManager.task_state_options[1];
						var mesg = 'task: ' + taskKey + ', was not initialized';
						test.strictEqual(cur_task_state, expected_state, mesg);
						var initStatus = taskManager.checkTaskInit(taskKey);
						mesg = 'task: ' + taskKey + ', was not initialized properly';
						test.ok(initStatus, mesg);
					});
				}
				test.done();
			});
	},
	/**
	 * Executing the startAllTasks function should start any task that should be
	 * automatically which is determined by the module either not declaring the 
	 * "startTime" attribute in its module.json or defining it to be "auto".
	 *
	 * This test will call the function and then make sure that each task with 
	 * the aforementioned qualities statuses aren't: '', 'included', or 
	 * 'initialized'.
	 */
	startAllTasks: function(test) {
		taskManager.startAllTasks()
		.then(function(res) {
			taskManager.taskList.forEach(function(task, taskKey) {
				var isStarted = false;
				var taskData = task.taskData;
				// Check to see if the task should have been started.
				if(typeof(taskData.startTime) !== 'undefined') {
					if(taskData.startTime === 'auto') {
						isStarted = true;
					}
				}
				var cur_task_state  = taskManager.getTaskState(taskKey);
				if(isStarted) {
					// Build list of invalid states for tasks that should have
					// been started.
					var invalidStates = [
						taskManager.task_state_options[0],
						taskManager.task_state_options[1],
						''
					];
					invalidStates.forEach(function(invalidState) {
						var mesg = 'task: ' + taskKey + ', in an invalid state';
						test.notStrictEqual(cur_task_state, invalidState, mesg);
					});
				} else {
					var expected_state = taskManager.task_state_options[1];
					var mesg = 'task: ' + taskKey + ', was not initialized';
					test.strictEqual(cur_task_state, expected_state, mesg);
					var initStatus = taskManager.checkTaskInit(taskKey);
					mesg = 'task: ' + taskKey + ', was not initialized properly';
					test.ok(initStatus, mesg);
				}
			});
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
	},
	testDataOutputBufferTask: function(test) {
		// Make sure that the task exists:
		var taskName = dataOutputBufferTaskName;
		var dataOutputBuffer = taskManager.getTask(taskName);
		test.notStrictEqual(dataOutputBuffer, null);
		test.notStrictEqual(dataOutputBuffer, undefined);
		
		var bufferInfo = {
			'key': 'outputTest',
			'type': 'localFile',
			'fileName': 'outputTest',
			'fileEnding': '.csv',
			'location': '/Users/chrisjohnson/git/Kiplingv3/kiplingTesting/dataOutputBufferTest',
			'dataKeys': ['time','AIN0','AIN1','AIN2'],
			'maxNumRows': 65000,
		};
		var testBuffer;
		var getR = function(data) {
			return function(res) {
				console.log('finished', data, res);
			};
		};
		dataOutputBuffer.addOutputBuffer(bufferInfo)
		.then(function(dataBuffer) {
			// console.log('dataBuffer', dataBuffer);
			testBuffer = dataBuffer;
			testBuffer.write('raw', '!abcde!'); // good
			testBuffer.write('single', {'time': '1', 'AIN0': '0'}); // good
			testBuffer.write('multiple', {'time':['3','4'], 'AIN0': ['2','3']}); // good
			testBuffer.writeArray('single', [{'time': '1', 'AIN0': '0'}]);	// good
			testBuffer.writeArray('multiple', [{'time': ['1','2'], 'AIN0': ['0','1']}]); //good
			testBuffer.writeArray('single', [{'time': '1', 'AIN0': '0', 'AIN1': '69', 'AIN2': '96'}]);	// good
			testBuffer.writeArray('single', [{'time': '1', 'AIN0': '0'},{'time': '1', 'AIN0': '0'}]);	// good
			setTimeout(runProgram,10);
		}, function(err) {
			console.log('Error in addOutputBuffer', err);
		}).then(getR(1),getR(2), getR(3));

		var numIterations = 0;
		var runProgram = function() {
			if(numIterations < 1000) {
				numIterations += 1;
				if(typeof(testBuffer) !== 'undefined') {
					// console.log('Writing data', numIterations);
					for (var i = 0; i < 100; i++) {
						// testBuffer.write('single', {'time': '1', 'AIN0': '0'});
						// testBuffer.write('multiple', {'time':['3','4'], 'AIN0': ['2','3']});
						var dataArray = [];
						var numValues = 100;
						for(var j = 0; j < numValues; j++) {
							var newStr = numIterations.toString() + '-' + i.toString() + '-' + j.toString();
							dataArray.push({
								'time':newStr,
								'AIN0':'0_' + newStr,
								'AIN1':'1_' + newStr,
								'AIN2':'2_' + newStr,
							});
						}
						testBuffer.writeArray('single', dataArray);

						testBuffer.writeArray('multiple', [
							{
								'time': ['1','2','3','4','5','6','7','8','9','10'],
								'AIN0': ['0','1','2','3','4','6','7','8','9','10'],
								'AIN1': ['0','1','2','3','4','6','7','8','9','10'],
								'AIN2': ['0','1','2','3','4','6','7','8','9','10']
							},
							{
								'time': ['1','2','3','4','5','6','7','8','9','10'],
								'AIN0': ['0','1','2','3','4','6','7','8','9','10'],
								'AIN1': ['0','1','2','3','4','6','7','8','9','10'],
								'AIN2': ['0','1','2','3','4','6','7','8','9','10']
							}
						]);
					}
				} else {
					console.log('Skipping write');
				}
				setTimeout(runProgram, 100);
			} else {
				finishTest();
			}
		};
		var finishTest = function() {
			console.log('Finished writing data');
			try {
				dataOutputBuffer.removeOutputBuffer(bufferInfo.key)
				.then(function() {
					console.log('Removed output buffer');
					test.done();
				}, function(err) {
					console.log('Error removing output buffer', err);
				});
			} catch(err) {
				console.log('ERERE',err);
				test.ok(false);
				test.done();
			}
		};
		
		
	},
	stopAllTasks: function(test) {
		taskManager.stopAllTasks()
		.then(function(res) {
			taskManager.taskList.forEach(function(task, taskKey) {
				var cur_task_state  = taskManager.getTaskState(taskKey);
				var expected_state = taskManager.task_state_options[1];
				var mesg = 'task: ' + taskKey + ', was not stopped';
				test.strictEqual(cur_task_state, expected_state, mesg);
			});
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