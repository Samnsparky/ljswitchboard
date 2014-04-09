/**
 * Goals for the Lua Script Debugger module.
 * This is a Lua script intro-app that performs a minimal number of scripting
 * operations.  It is simply capable of detecting whether or not a Lua script
 * is running and then prints out the debugging log to the window.  
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
 * Configuration:
 * No configuration of the device is required
 *
 * Periodic Processes:
 *     1. Read from "LUA_RUN" register to determine if a Lua script is running.
 *     2. Read from "LUA_DEBUG_NUM_BYTES" register to determine how much data is
 *         available in the debugging info buffer.
 *     3. If there is data available in the debugging buffer then get it from
 *         the device. 
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 100;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

function textEditor() {
    var editor;
    var htmlID = '';
    var editorTheme = '';
    var editorMode = '';

    this.setupEditor = function(id, theme, mode) {
        self.htmlID = id;
        self.editorTheme = theme;
        self.editorMode = mode;

        // Initialize the aceEditor instance
        self.editor = ace.edit(id);
        self.editor.setTheme(theme);
        self.editor.getSession().setMode(mode);
    };

    var self = this;
}

function luaDeviceController() {
    var device;
    var codeEditor;
    var codeEditorSession;
    var codeEditorDoc;
    var debuggingLog;
    var debuggingLogSession;
    var debuggingLogDoc;
    var scriptConstants = {};
    var curScriptFilePath = "";
    var curScriptType = "";
    var curScriptOptions;

    this.DEBUG_START_EXECUTIONS = true;
    this.DEBUG_HIGH_FREQ_START_EXECUTIONS = false;
    var MAX_ARRAY_PACKET_SIZE = 32; //Set packet size to be 32 bytes

    this.catchError = function(err) {
        console.log('luaControllerErr:',err);
    };
    this.printInfo = function() {
        console.log('Device Name',self.device.cachedName);
        console.log('Num Lines',self.codeEditorDoc.getLength());
        console.log('Num Bytes',self.codeEditorDoc.getValue().length);
    };
    this.printHighFreq = function(data) {
        if(self.DEBUG_HIGH_FREQ_START_EXECUTIONS) {
            self.print(data);
        }
    }
    this.print = function(data) {
        if(self.DEBUG_START_EXECUTIONS) {
            console.log(data);
        }
    };
    this.stopLuaScript = function() {
        self.print('disabling LUA_RUN');
        var innerDeferred = q.defer();
        // Disable the LUA script
        self.device.qWrite('LUA_RUN',0)

        // Handle errors & return
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.writeLuaSourceSize = function() {
        self.print('setting LUA_SOURCE_SIZE');
        var innerDeferred = q.defer();
        var sourceSize = self.codeEditorDoc.getValue().length;

        // Add one for a null character
        sourceSize += 2;

        // Perform Device IO
        self.device.qWrite('LUA_SOURCE_SIZE',sourceSize)
        .then(innerDeferred.resolve, innerDeferred.reject);

        return innerDeferred.promise;
    };
    this.writeLuaScript = function() {
        self.print('writing to LUA_SOURCE_WRITE');
        var innerDeferred = q.defer();
        var numPackets = 0;
        var luaSource = self.codeEditorDoc.getValue();
        var luaSourceBuf = luaSource;
        var luaSourceSize = luaSource.length;
        var packetSize = MAX_ARRAY_PACKET_SIZE;

        var packetData = [];
        var i,j;

        // Determine how many packets need to be sent
        numPackets = (luaSourceSize - (luaSourceSize % packetSize));
        numPackets = numPackets / packetSize;

        // Determine if an extra packet of a smaller size should be sent
        if ((luaSourceSize % packetSize) !== 0) {
            numPackets += 1;
        }

        // Push data into packetData array
        for (i = 0; i < numPackets; i++) {
            var subPacketSize = 0;
            var srcData = "";
            var binaryData = [];

            // Determine how much data to add to buffer, add at most the max
            // packet size
            if (luaSourceBuf.length >= packetSize) {
                subPacketSize = packetSize;
            } else {
                subPacketSize = luaSourceBuf.length;
            }

            // Get the data that should be sent
            srcData = luaSourceBuf.slice(0,subPacketSize);
            
            // Parse the string data into bytes
            for (j = 0; j < srcData.length; j++) {
                binaryData.push(srcData.charCodeAt(j));
            }
            

            // Modify the luaSourceBuf to only have what is remaining
            luaSourceBuf = luaSourceBuf.slice(subPacketSize);

            // Add the srcData to the packetData buffer
            packetData.push(binaryData);
        }

        // Synchronously write each packet of data to the device
        async.eachSeries(
            packetData,
            function(data, callback) {
                // Perform Device IO
                self.device.qWriteArray('LUA_SOURCE_WRITE',data)
                .then(
                    function(data) {
                        callback();
                    },
                    function(err) {
                        console.log('Error on SRC write',err);
                        console.log('Check .json for "type" of BYTE');
                        callback(err);
                    }
                );
            },
            function(err) {
                self.print('Finished writing to LUA_SOURCE_WRITE');
                innerDeferred.resolve();
            }
        );
        return innerDeferred.promise;
    };
    this.readDebugData = function() {

    };
    this.getAndAddDebugData = function(numBytes) {
        self.printHighFreq('reading & saving to LUA_DEBUG_DATA');
        var innerDeferred = q.defer();
        var numBytesInBuffer = numBytes;
        var numPackets = 0;
        var maxPacketSize = MAX_ARRAY_PACKET_SIZE;

        var i,j;
        var packetSizes = [];

        // Determine how many chunks of data should be read
        numPackets = (numBytesInBuffer - (numBytesInBuffer % maxPacketSize));
        numPackets = numPackets / maxPacketSize;
        numFullPackets = numPackets;
        for (i = 0; i < numFullPackets; i++) {
            packetSizes.push(maxPacketSize);
        }

        // Determine if an extra packet of a smaller size should be sent
        if ((numBytesInBuffer % maxPacketSize) !== 0) {
            numPackets += 1;
            packetSizes.push(numBytesInBuffer % maxPacketSize);
        }

        // Synchronously read each packet of data to the device
        async.eachSeries(
            packetSizes,
            function(numBytes, callback) {
                // Perform Device IO
                self.device.qReadArray('LUA_DEBUG_DATA',numBytes)
                .then(
                    // Handle successful reads
                    function(data) {
                        // Define variable to save debug-data to
                        var textData = "";

                        // Loop through read data & convert to ASCII text
                        data.forEach(function(newChar){
                            textData += String.fromCharCode(newChar);
                        });

                        // Insert data into debug-log window
                        self.debuggingLogDoc.insert(
                            {
                                row: self.debuggingLogSession.getLength(),
                                column:0
                            },
                            textData
                        );

                        // Force async to go to next loop iteration
                        callback();
                    },
                    // Handle read errors
                    function(err) {
                        // Report that an error has occurred
                        console.log('Error on LUA_DEBUG_DATA',err);
                        console.log('Check .json for "type" of BYTE');

                        // Force async to break out of the loop
                        callback(err);
                    }
                );
            },
            function(err) {
                innerDeferred.resolve();
            }
        );
        return innerDeferred.promise;
    };
    this.enableLuaDebugging = function() {
        self.print('enabling LUA_DEBUG_ENABLE');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_DEBUG_ENABLE',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.enableLuaDebuggingDefault = function() {
        self.print('enabling LUA_DEBUG_ENABLE_DEFAULT');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_DEBUG_ENABLE_DEFAULT',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.enableLuaScript = function() {
        self.print('enabling LUA_RUN');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_RUN',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.handleNoScriptError = function(err) {
        console.log('Handling error',err);
        var innerDeferred = q.defer();
        self.saveScriptToFlash()
        .then(self.enableStartupLuaScript, innerDeferred.reject)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;

    };
    this.enableLuaRunDefault = function() {
        self.print('enabling LUA_RUN_DEFAULT');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_RUN_DEFAULT',1)
        .then(function(){
                innerDeferred.resolve();
            }, self.handleNoScriptError)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.disableLuaRunDefault = function() {
        self.print('disabling LUA_RUN_DEFAULT');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_RUN_DEFAULT',0)
        .then(function(){
                innerDeferred.resolve();
            }, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.saveEnableLuaSaveToFlash = function() {
        self.print('saving LUA_SAVE_TO_FLASH');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_SAVE_TO_FLASH',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.saveScriptToFlash = function() {
        self.print('loading & saving lua script to flash');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Set the LUA Source Size
        .then(self.writeLuaSourceSize, self.catchError)

        // Write the LUA script
        .then(self.writeLuaScript, self.catchError)

        // Configure LUA_SAVE_TO_FLASH register
        .then(self.saveEnableLuaSaveToFlash, self.catchError)

        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.enableStartupLuaScript = function() {
        self.print('enabling startup script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Configure LUA_RUN_DEFAULT register
        .then(self.enableLuaRunDefault, self.catchError)

        // Configure LUA_DEBUG_ENABLE_DEFAULT register
        .then(self.enableLuaDebuggingDefault, self.catchError)

        .then(ioDeferred.resolve, ioDeferred.reject);
        return ioDeferred.promise;
    };
    this.disableStartupLuaScript = function() {
        self.print('disabling startup script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Configure LUA_RUN_DEFAULT register
        .then(self.disableLuaRunDefault, self.catchError)

        .then(ioDeferred.resolve, ioDeferred.reject);
        return ioDeferred.promise;
    };

    this.loadAndStartScript = function() {
        self.print('loading & starting Lua script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Set the LUA Source Size
        .then(self.writeLuaSourceSize, self.catchError)

        // Write the LUA script
        .then(self.writeLuaScript, self.catchError)
        
        // Enable Debugging
        .then(self.enableLuaDebugging, self.catchError)

        // Enable Debugging Default
        .then(self.enableLuaDebuggingDefault, self.catchError)

        // Enable LUA script
        .then(self.enableLuaScript, self.catchError)

        // Handle errors & return
        .then(ioDeferred.resolve, ioDeferred.reject);

        // Return q instance
        return ioDeferred.promise;
    };
    this.loadLuaScript = function() {
        self.print('loading Lua script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Set the LUA Source Size
        .then(self.writeLuaSourceSize, self.catchError)

        // Write the LUA script
        .then(self.writeLuaScript, self.catchError)

        // Enable Debugging
        .then(self.enableLuaDebugging, self.catchError)

        // Enable Debugging Default
        .then(self.enableLuaDebuggingDefault, self.catchError)

        // Handle errors & return
        .then(ioDeferred.resolve, ioDeferred.reject);

        // Return q instance
        return ioDeferred.promise;
    };
    this.stopScript = function() {
        self.print('stopping Lua script');
        var ioDeferred = q.defer();

        // Disable the LUA script
        self.stopLuaScript()

        // Handle errors & return
        .then(ioDeferred.resolve, ioDeferred.reject);

        // Return q instance
        return ioDeferred.promise;
    };
    this.loadScriptFromFile = function(filePath) {
        self.print('loading Lua Script from file');
        var ioDeferred = q.defer();

        // Update Internal Constants
        self.configureAsUserScript(filePath);

        // Load File
        fs_facade.loadFile(
            filePath,
            function(err) {
                self.print('Error loading script',err);
                ioDeferred.reject();
            },
            function(data) {
                self.print('Successfully loaded script');
                self.codeEditorDoc.setValue(data);
                ioDeferred.resolve();
            }
        );
        // Return q instance
        return ioDeferred.promise;
    };
    this.loadExampleScript = function(filePath) {
        self.print('loading example script');
        var ioDeferred = q.defer();

        // Update Internal Constants
        self.configureAsExample(filePath);

        // // Load File
        // fs_facade.loadFile(
        //     filePath,
        //     function(err) {
        //         self.print('Error loading script',err);
        //         ioDeferred.reject();
        //     },
        //     function(data) {
        //         self.print('Successfully loaded script');
        //         self.codeEditorDoc.setValue(data);
        //         ioDeferred.resolve();
        //     }
        // );
        
        ioDeferred.resolve();
        // Return q instance
        return ioDeferred.promise;
    };
    this.saveLoadedScript = function() {
        self.print('Saving Lua Script');
        var fileIODeferred = q.defer();

        var canSave = self.curScriptOptions.canSave;
        var filePath = self.curScriptFilePath;
        var scriptData = self.codeEditorDoc.getValue();

        // Determine if the script can be saved 
        // aka: switch between user script & example
        if (canSave) {
            // The script is a userScript & can be saved
            self.print('Saving Script to file');
            fs_facade.saveDataToFile(
                filePath,
                scriptData,
                function(err) {
                    // onError function
                    console.log('Failed to Save Script to file', err);
                    fileIODeferred.reject(err);
                },
                function() {
                    // onSuccess function
                    self.print('Successfuly Saved Script to File');
                    fileIODeferred.resolve();
                }
            );
        } else {
            // The script is an example & can't be saved
            self.print('Can\'t save script to file, opening file dialog');

            var chooser = $(fs_facade.getFileSaveAsID());
            chooser.attr('nwworkingdir',fs_facade.getDefaultFilePath());
            var onChangedSaveToFile = function(event) {
                console.log('onChangedSaveToFile Fired');
                var fileLoc = $(fs_facade.getFileSaveAsID()).val();
                var scriptData = self.codeEditorDoc.getValue();
                console.log('Selected Lua File',fileLoc);

                self.print('Saving Script to file');
                fs_facade.saveDataToFile(
                    fileLoc,
                    scriptData,
                    function(err) {
                        // onError function
                        console.log('Failed to Save Script to file', err);
                        fileIODeferred.reject(err);
                    },
                    function() {
                        // onSuccess function
                        self.print('Successfuly Saved Script to File');
                        
                        // Update Internal Constants
                        self.configureAsUserScript(fileLoc);

                        fileIODeferred.resolve();
                    }
                );
            };

            chooser.unbind('change');
            chooser.bind('change', onChangedSaveToFile);

            chooser.trigger('click');
        }

        // Return q instance
        return fileIODeferred.promise;
    };
    this.configureAsExample = function(filePath) {
        self.curScriptType = self.scriptConstants.types[0];
        self.curScriptOptions = self.scriptConstants[self.curScriptType];
        self.curScriptFilePath = filePath;
    };
    this.configureAsUserScript = function(filePath) {
        self.curScriptType = self.scriptConstants.types[1];
        self.curScriptOptions = self.scriptConstants[self.curScriptType];
        self.curScriptFilePath = filePath;
    };

    this.setDevice = function(device) {
        self.device = device;
    };
    this.setCodeEditor = function(codeEditor) {
        self.codeEditor = codeEditor;
        self.codeEditorSession = codeEditor.editor.session;
        self.codeEditorDoc = codeEditor.editor.session.doc;
    };
    this.setDebuggingLog = function(debuggingLog) {
        self.debuggingLog = debuggingLog;
        self.debuggingLogSession = debuggingLog.editor.session;
        self.debuggingLogDoc = debuggingLog.editor.session.doc;
    };
    this.setScriptConstants = function(constants) {
        self.scriptConstants = constants;
    };
    this.setScriptType = function(type, options, filePath) {
        self.curScriptType = type;
        self.curScriptOptions = options;
        self.curScriptFilePath = filePath;
    };
    var self = this;
}

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    var luaEditor = new textEditor();
    this.luaEditor = luaEditor;
    var debuggingLog = new textEditor();
    this.debuggingLog = debuggingLog;

    var luaController = new luaDeviceController();
    this.luaController = luaController;

    var moduleContext = {};
    this.moduleContext = moduleContext;

    var constants = {};
    this.constants = constants;
    var preBuiltScripts = {};
    this.preBuiltScripts = preBuiltScripts;
    var scriptOptions = {};
    this.scriptOptions = scriptOptions;
    var luaVariables = {};
    this.luaVariables = luaVariables;
    var viewConstants = {};
    this.viewConstants = viewConstants;

    var isScriptRunning = 0;
    this.isScriptRunning = isScriptRunning;
    var isConfiguredForStartup = 0;
    this.isConfiguredForStartup = isConfiguredForStartup;
    var isDebugEnabled = 0;
    this.isDebugEnabled = isDebugEnabled;
    var numDebugBytes = 0;
    this.numDebugBytes = numDebugBytes;

    var ENABLE_PRINTING_USER_DEBUG_INFO = true;
    this.ENABLE_PRINTING_USER_DEBUG_INFO = ENABLE_PRINTING_USER_DEBUG_INFO;

    var handleIOSuccess = function(onSuccess, debugData) {
        return function() {
            if(debugData !== null) {
                self.printUserDebugInfo(debugData);
            }
            onSuccess();
        };
    };
    this.handleIOSuccess = handleIOSuccess;

    var handleIOError = function(onSuccess, debugData) {
        return function(err) {
            console.log('LSD Error',err);
            if(debugData !== null) {
                console.log(debugData);
            }
            onSuccess();
        };
    };
    this.handleIOError = handleIOError;

    this.printUserDebugInfo = function(data) {
        if(self.ENABLE_PRINTING_USER_DEBUG_INFO) {
            console.log(data);
        }
    }

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        //Save data from loaded moduleConstants.json file
        self.constants = framework.moduleConstants.constants;
        self.preBuiltScripts = framework.moduleConstants.preBuiltScripts;
        self.scriptOptions = framework.moduleConstants.scriptOptions;
        self.luaVariables = framework.moduleConstants.luaVariables;
        self.viewConstants = framework.moduleConstants.viewData;

        // Initialize Device module context obj
        moduleContext.device = {};

        var setDeviceData = function(classStr, result) {
            // Initialize variables
            var statusTitle = "";
            var statusIcon = "";
            var buttonTitle = "";
            var buttonIcon = "";
            var index = 0;

            var val = result.result;

            if(val > 1) {
                val = 1;
            }

            statusTitle = self.luaVariables[classStr].statusTitle[val];
            statusIcon = self.luaVariables[classStr].statusIcon[val];
            buttonTitle = self.luaVariables[classStr].buttonTitle[val];
            buttonIcon = self.luaVariables[classStr].buttonIcon[val];

            moduleContext.device[classStr] = {};
            moduleContext.device[classStr].statusTitle = statusTitle;
            moduleContext.device[classStr].statusIcon = statusIcon;
            moduleContext.device[classStr].buttonTitle = buttonTitle;
            moduleContext.device[classStr].buttonIcon = buttonIcon;
        };
        var saveConfigRunStatus = function(data, onSuccess) {
            setDeviceData('runStatus',data.result);
            onSuccess();
        };
        var saveConfigBootScriptStatus = function(data, onSuccess) {
            setDeviceData('startupStatus',data.result);
            onSuccess();
        };
        var genericConfigCallback = function(data, onSuccess) {
            console.log('Binding: ',data.binding.bindingClass, data.result);
            onSuccess();
        };
        var genericPeriodicCallback = function(data, onSuccess) {
            onSuccess();
        };
        var genericButtonPress = function(data, onSuccess) {
            console.log('Pressed: ',data.binding.bindingClass);
            onSuccess();
        };
        var conditionalExecution = function(constants, trueFunc, falseFunc, onSuccess) {
            var button = $('#'+constants.buttonID);
            var trueTitle = constants.buttonTitle[0];
            var falseTitle = constants.buttonTitle[1];
            var icon = button.children();
            var trueIcon = constants.buttonIcon[0];
            var falseIcon = constants.buttonIcon[1];

            var execTrue = icon.hasClass(trueIcon);
            if(execTrue) {
                trueFunc()
                .then(function(){
                    // Change icon & title
                    icon.removeClass(trueIcon);
                    icon.addClass(falseIcon);
                    button.attr('title',falseTitle);
                    onSuccess();
                },self.handleIOError(onSuccess));
            } else {
                falseFunc()
                .then(function(){
                    // Change icon & title
                    icon.removeClass(falseIcon);
                    icon.addClass(trueIcon);
                    button.attr('title',trueTitle);
                    onSuccess();
                },self.handleIOError(onSuccess));
            }
        };
        var runPauseLuaScript = function(data, onSuccess) {
            self.printUserDebugInfo('runPause button pressed');

            var constants = self.luaVariables.runStatus;
            conditionalExecution(
                constants,
                self.luaController.loadAndStartScript,
                self.luaController.stopScript,
                self.handleIOSuccess(onSuccess,'Configured LUA_RUN')
            );
        };
        var saveScriptToFlash = function(data, onSuccess) {
            self.printUserDebugInfo('saveScriptToFlash button pressed');
            self.luaController.saveScriptToFlash()
            .then(
                self.handleIOSuccess(onSuccess,'Script Saved to Flash'),
                self.handleIOError(onSuccess,'Err: Script Not Saved to Flash')
            );
        }
        var uploadLuaScript = function(data, onSuccess) {
            self.printUserDebugInfo('uploadLuaScript button pressed');
            self.luaController.loadLuaScript()
            .then(
                self.handleIOSuccess(onSuccess,'Script Loaded'),
                self.handleIOError(onSuccess,'Err: Script Not Loaded')
            );
        };
        var enableStartupScript = function(data, onSuccess) {
            self.printUserDebugInfo('enableStartupScript button pressed');

            var constants = self.luaVariables.startupStatus;
            conditionalExecution(
                constants,
                self.luaController.enableStartupLuaScript,
                self.luaController.disableStartupLuaScript,
                self.handleIOSuccess(onSuccess,'Configured LUA_RUN_DEFAULT')
            );
        };
        var saveScriptToFlash = function(data, onSuccess) {
            self.printUserDebugInfo('saveScriptToFlash button pressed');

            self.luaController.saveScriptToFlash()
            .then(
                self.handleIOSuccess(onSuccess,'Script Saved'),
                self.handleIOError(onSuccess, 'Err: Script Not Saved')
            );


        };
        var loadLuaFile = function(data, onSuccess) {
            console.log('Loading file....');
            var chooser = $(fs_facade.getFileLoadID());
            var onChangedFile = function(event) {
                var fileLoc = $(fs_facade.getFileLoadID()).val();
                console.log('Selected Lua File',fileLoc);
                self.luaController.loadScriptFromFile(fileLoc)
                .then(
                    self.handleIOSuccess(onSuccess,'Script File Loaded'),
                    self.handleIOError(onSuccess,'Err: Script File Not Loaded')
                );
            };
            chooser.unbind('change');
            chooser.bind('change', onChangedFile);
            chooser.trigger('click');
        };
        var saveLoadedScriptToFile = function(data, onSuccess) {
            self.printUserDebugInfo('saveLoadedScriptToFile button pressed');

            self.luaController.saveLoadedScript()
            .then(
                self.handleIOSuccess(onSuccess,'Script Saved to File'),
                self.handleIOError(onSuccess, 'Err: Script Not Saved to File')
            );
        };
        var setButtonIcon = function(constants, val) {
            var button = $('#' + constants.buttonID);
            var icon = button.children();
            icon.attr('class', constants.buttonIcon[val]);
            icon.attr('title', constants.buttonTitle[val]);
        };
        var setStatusIcon = function(constants, val) {
            var icon = $('#' + constants.statusID);
            icon.attr('class', constants.statusIcon[val]);
            icon.attr('title', constants.statusTitle[val]);
        };
        var isLuaRunning = function(data, onSuccess) {
            setStatusIcon(self.luaVariables.runStatus, data.value);
            setButtonIcon(self.luaVariables.runStatus, data.value);
            onSuccess();
        };
        var isConfiguredForStartup = function(data, onSuccess) {
            setStatusIcon(self.luaVariables.startupStatus, data.value);
            setButtonIcon(self.luaVariables.startupStatus, data.value);
            onSuccess();
        };
        var numDebugBytes = function(data, onSuccess) {
            var val = data.value;
            if(val > 0) {
                self.luaController.getAndAddDebugData(val)
                .then(function() {
                    // onSuccess
                    onSuccess();
                }, function() {
                    // onError
                    onSuccess();
                });
            } else {
                onSuccess();
            }
        };
        var smartBindings = [
            {
                bindingName: 'LUA_RUN', 
                smartName: 'readRegister',
                iterationDelay: 9,
                configCallback: saveConfigRunStatus,
                periodicCallback: isLuaRunning
            }, {
                bindingName: 'LUA_RUN_DEFAULT', 
                smartName: 'readRegister',
                iterationDelay: 9,
                configCallback: saveConfigBootScriptStatus,
                periodicCallback: isConfiguredForStartup
            }, {
                bindingName: 'LUA_DEBUG_ENABLE', 
                smartName: 'readRegister',
                iterationDelay: 9,
                configCallback: genericConfigCallback,
            }, {
                bindingName: 'LUA_DEBUG_NUM_BYTES', 
                smartName: 'readRegister',
                configCallback: genericConfigCallback,
                periodicCallback: numDebugBytes
            }, {
                // Define binding to handle run/pause button presses.
                bindingName: 'run-lua-script-button', 
                smartName: 'clickHandler',
                callback: runPauseLuaScript
            }, {
                // Define binding to handle save-script-to-flash button presses.
                bindingName: 'save-script-to-flash-button', 
                smartName: 'clickHandler',
                callback: saveScriptToFlash
            }, {
                // Define binding to handle enable at startup button presses.
                bindingName: 'enable-script-at-startup-button', 
                smartName: 'clickHandler',
                callback: enableStartupScript
            }, {
                // Define binding to handle saving the active lua script button presses.
                bindingName: 'save-lua-script-button', 
                smartName: 'clickHandler',
                callback: saveLoadedScriptToFile
            }, {
                // Define binding to handle loading user luaFile button presses.
                bindingName: 'load-lua-script-button', 
                smartName: 'clickHandler',
                callback: loadLuaFile
            }, {
                // Define binding to handle loading luaExample button presses.
                bindingName: 'load-example-lua-script-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
            }, {
                // Define binding to handle show/hide deviceStatus button presses.
                bindingName: 'manage-view-device-status-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
            }, {
                // Define binding to handle  show/hide luaEditor button presses.
                bindingName: 'manage-view-lua-editor-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
            }, {
                // Define binding to handle  show/hide luaDebugger button presses.
                bindingName: 'manage-view-lua-debugger-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
            }, {
                // Define binding to handle  show/hide tableDescriptions button presses.
                bindingName: 'manage-view-table-descriptions-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
            },
        ];

        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);
        
        onSuccess();
    };
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {

        // // While configuring the device build a dict to be used for generating the
        // // module's template.
        // moduleContext.debugData = [];

        // Save device to the luaController object
        self.luaController.setDevice(device);

        framework.clearConfigBindings();
        onSuccess();
    };
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // Load configuration data & customize view
        var setViewData = function(classStr, isVisible) {
            // Initialize variables
            var title = "";
            var icon = "";
            var visibility = "";
            var index = 0;

            // Determine the appropriate state, visible == 1, invisible == 0
            if(isVisible) {
                index = 1;
            } else {
                index = 0;
            }

            // Get data from constants
            title = self.viewConstants[classStr].title[index];
            icon = self.viewConstants.icon[index];

            //Save data to module's context
            self.moduleContext.views[classStr] = {};
            self.moduleContext.views[classStr].title = title;
            self.moduleContext.views[classStr].icon = icon;
        };
        // Clear any view data
        self.moduleContext.views = {};

        // Set View Data
        setViewData('deviceStatus', self.constants.deviceStatusShownAtStartup);
        setViewData('luaEditor', self.constants.luaEditorShownAtStartup);
        setViewData('luaDebugger', self.constants.luaDebuggerShownAtStartup);
        setViewData('tableDescriptions', self.constants.tableDescriptionsShownAtStartup);
        
        // Load default startup script & complete function
        var fileName = self.constants.editor.defaultScript;
        var fileLocation;
        var scripts = self.preBuiltScripts;
        var scriptData;
        scripts.some(function(script,index){
            if(script.name == fileName){
                fileLocation = script.location;
                return true;
            }
        });

        var scriptType = self.scriptOptions.types[0];
        var scriptOptions = self.scriptOptions[scriptType];
        self.luaController.setScriptConstants(self.scriptOptions);
        self.luaController.setScriptType(
            scriptType, 
            scriptOptions, 
            fileLocation
        );

        // Load Script File
        fs_facade.readModuleFile(
            fileLocation,
            function(err) {
                console.log('Error loading script',err);
                self.moduleContext.luaScript = {
                    "name": "Failed to load file: " +fileName,
                    "code": "Failed to load file: " +fileName
                };
                framework.setCustomContext(self.moduleContext);
                onSuccess();
            },
            function(data) {
                scriptData = data;

                // Load a file & save to the module's context
                self.moduleContext.luaScript = {
                    "name": fileName,
                    "code": scriptData
                };

                // save the custom context to the framework so it can be used when
                // rendering the module's template.
                framework.setCustomContext(self.moduleContext);
                onSuccess();
            }
        );
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        $('#browse-link').click(function () {
            var chooser = $('#file-dialog-hidden');
            chooser.change(function(evt) {
                var fileLoc = $(this).val();
                console.log('FiileLoc',fileLoc);
            });

            chooser.trigger('click');
            return false;
        });
        // Initialize ace editor obj for luaEditor & debuggingLog:
        luaEditor.setupEditor(
            "lua-code-editor", 
            "ace/theme/monokai", 
            "ace/mode/lua"
        );
        debuggingLog.setupEditor(
            "lua-debugging-log-editor", 
            "ace/theme/monokai", 
            "ace/mode/text"
        );

        // Save luaEditor & debuggingLog objects to the luaController object
        self.luaController.setCodeEditor(luaEditor);
        self.luaController.setDebuggingLog(debuggingLog);

        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        // console.log('in onRegisterWrite',binding);
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        // console.log('in onRefreshed',results);
        results.forEach(function(key, value){
            // console.log('results['+value+']:',key)
        });
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        aceEditor = undefined;
        luaEditor = undefined;
        debuggingLog = undefined;
        onSuccess();
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        onHandle(true);
    };

    this.getEditor = function() {
        return aceEditor;
    };

    var self = this;
}
/*
Code Notes:

Notes about ace-editor:
set read-only:
editor.setReadOnly(true)

read num-lines visible:
editor.session.getLength()

focus on the last-visible line:
editor.gotoLine(editor.session.getLength())

focus on line #5
editor.gotoLine(5)

set text-mode:
editor.getSession().setMode("ace/mode/text")

make user-cursor look greyed out:
editor.blur()

get last row of actual text:
editor.getLastVisibleRow()

getting document object:
var cDoc = editor.getSession().getDocument()

removing lines from document:
cDoc.removeLines(6,7)

remove line #5 from editor
cDoc.removeLines(4,4)

insert text to lines 21->23:
str="abcd\r\n\r\nefg"
cDoc.insert({row:20,column:0},str)

insert text to end of document:
cDoc.insert({row:editor.session.getLength(),column:0},str)

insert text to begining of document:
cDoc.insert({row:0,column:0},str)

remove first two lines from document
cDoc.removeLines(0,1)
 */


