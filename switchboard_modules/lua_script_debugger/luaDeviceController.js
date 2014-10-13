/**
 * An accessory file for the Lua script debugger module that defines the
 * luaDeviceController object.
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
**/


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
    var codeEditorHeight = 0;
    var debuggingLogHeight = 0;

    this.DEBUG_START_EXECUTIONS = false;
    this.DEBUG_HIGH_FREQ_START_EXECUTIONS = false;
    var MAX_ARRAY_PACKET_SIZE = 32; //Set packet size to be 32 bytes

    this.catchError = function(err) {
        var errDeferred = q.defer();
        console.log('luaControllerErr:',err);
        errDeferred.reject();
        return errDeferred.promise;
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
    };
    this.print = function(data) {
        if(self.DEBUG_START_EXECUTIONS) {
            console.log(data);
        }
    };
    this.isLuaCodeError = function() {
        var isError = false;
        var errors = $('#lua-code-editor .ace_error');
        if(errors.length > 0) {
            isError = true;
        }
        return isError;
    };
    this.getErrorLine = function() {
        var lineNum = '';
        var errors = $('#lua-code-editor .ace_error');
        if(errors.length > 0) {
            lineNum = errors.text();
        }
        return lineNum;
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
    this.getAndAddDebugData = function(numBytes) {
        self.printHighFreq('reading & saving to LUA_DEBUG_DATA');
        var innerDeferred = q.defer();
        var numBytesInBuffer = numBytes+1;
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
            packetSizes.push((numBytesInBuffer % maxPacketSize));
        }
        
        // ------- Debugging Code ------
        // var numBytesBeingRead = 0;
        // for(i = 0; i < packetSizes.length; i++) {
        //     numBytesBeingRead += packetSizes[i];
        // }
        // if(packetSizes.length > 1) {
        //     console.log('Num Packets',packetSizes.length);
        //     console.log('Num Bytes:',numBytes);
        //     console.log('Check- Num Bytes',numBytesBeingRead);
        // }
        // ------- Debugging Code ------

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
                            if(newChar !== 0) {
                                textData += String.fromCharCode(newChar);
                            } else {

                            }
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
    this.checkForCodeErrors = function() {
        var codeDeferred = q.defer();
        if(self.isLuaCodeError()) {
            showMinAlert('Check Script for Errors, line: '+self.getErrorLine());
            codeDeferred.reject();
        } else {
            codeDeferred.resolve();
        }
        return codeDeferred.promise;
    };
    this.saveScriptToFlash = function() {
        self.print('loading & saving lua script to flash');
        var innerDeferred = q.defer();

        // Check LUA Script for Errors
        self.checkForCodeErrors()

        // Disable the LUA script
        .then(self.stopLuaScript, self.catchError)

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
    this.moveDebuggingCursorToEnd = function() {
        var defered = q.defer();
        self.debuggingLog.editor.navigateFileEnd();
        defered.resolve();
        return defered.promise;
    };

    this.loadAndStartScript = function() {
        self.print('loading & starting Lua script');
        var ioDeferred = q.defer();

        // Check LUA Script for Errors
        self.checkForCodeErrors()
        
        // Disable the LUA script
        .then(self.stopLuaScript, self.catchError)

        // Set the LUA Source Size
        .then(self.writeLuaSourceSize, self.catchError)

        // Write the LUA script
        .then(self.writeLuaScript, self.catchError)
        
        // Enable Debugging
        .then(self.enableLuaDebugging, self.catchError)

        // Enable Debugging Default
        .then(self.enableLuaDebuggingDefault, self.catchError)

        // Move debuggingLog cursor to the end of the file
        .then(self.moveDebuggingCursorToEnd, self.catchError)

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

        // Check LUA Script for Errors
        self.checkForCodeErrors()
        
        // Disable the LUA script
        .then(self.stopLuaScript, self.catchError)

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

        // Load Script File
        fs_facade.readModuleFile(
            filePath,
            function(err) {
                var scriptLoadErMessage = "Error loading example script: ";
                scriptLoadErMessage += filePath + ". Error Message: ";
                scriptLoadErMessage += err.toString();

                console.log(scriptLoadErMessage,err);
                self.codeEditorDoc.setValue(scriptLoadErMessage);
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

    this.saveLoadedScriptAs = function() {
        self.print('Saving Lua Script as...');
        var fileIODeferred = q.defer();

        var chooser = $(fs_facade.getFileSaveAsID());
        chooser.attr('nwworkingdir',fs_facade.getDefaultFilePath());
        var onChangedSaveToFile = function(event) {
            var fileLoc = $(fs_facade.getFileSaveAsID()).val();
            var scriptData = self.codeEditorDoc.getValue();
            self.print('Selected Lua File',fileLoc);

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

        // Return q instance
        return fileIODeferred.promise;
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
                var fileLoc = $(fs_facade.getFileSaveAsID()).val();
                var scriptData = self.codeEditorDoc.getValue();

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
        self.debuggingLog.editor.setReadOnly(true);
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

