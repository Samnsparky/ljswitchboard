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
    this.DEBUG_START_EXECUTIONS = true;
    var MAX_ARRAY_PACKET_SIZE = 32; //Set packet size to be 32 bytes

    this.catchError = function(err) {
        console.log('luaControllerErr:',err);
    };
    this.printInfo = function() {
        console.log('Device Name',self.device.cachedName);
        console.log('Num Lines',self.codeEditorDoc.getLength());
        console.log('Num Bytes',self.codeEditorDoc.getValue().length);
    };
    this.print = function(data) {
        if(self.DEBUG_START_EXECUTIONS) {
            console.log(data);
        }
    }

    this.stopLuaScript = function() {
        // console.log('stopping script');
        var innerDeferred = q.defer();
        // Disable the LUA script
        self.device.qWrite('LUA_RUN',0)

        // Handle errors & return
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.writeLuaSourceSize = function() {
        // console.log('setting luaSourceSize');
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
        // console.log('writing luaSource');
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
            // var msb, lsb;
            // if((srcData.length % 2) === 0) {
            //     for (j = 0; j < srcData.length; j+=2) {
            //         msb = srcData.charCodeAt(j) << 8;
            //         lsb = srcData.charCodeAt(j + 1);
            //         binaryData.push(msb | lsb);
            //     }
            // } else {
            //     for (j = 0; j < srcData.length-1; j+=2) {
            //         msb = srcData.charCodeAt(j) << 8;
            //         lsb = srcData.charCodeAt(j + 1);
            //         binaryData.push(msb | lsb);
            //     }
            //     msb = srcData.charCodeAt(j) << 8;
            //     lsb = 0;
            //     binaryData.push(msb | lsb);
            // }
            
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
                // console.log('length: ',data.length,', data to send:',data);
                // Perform Device IO
                self.device.qWriteArray('LUA_SOURCE_WRITE',data)
                .then(
                    function(data) {
                        callback();
                    },
                    function(err) {
                        console.log('Error on SRC write',err);
                        console.log('Check .json for "type" of UINT16');
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
    this.readDebugData = function() {

    };
    this.getAndAddDebugData = function(numBytes) {
        console.log('Num Bytes',numBytes);
        var innerDeferred = q.defer();
        var numBytesInBuffer = numBytes;
        var numPackets = 0;
        var numFullPackets = 0;
        var luaSource = self.codeEditorDoc.getValue();
        var luaSourceBuf = luaSource;
        var luaSourceSize = luaSource.length;
        var maxPacketSize = MAX_ARRAY_PACKET_SIZE;

        var i,j;
        var packetSizes[];

        // Determine how many chunks of data should be read
        numPackets = (numBytesInBuffer - (numBytesInBuffer % maxPacketSize));
        numPackets = numPackets / maxPacketSize;
        numFullPackets = numPackets;
        for (i = 0; i < numFullPackets; i++) {
            packetSizes.push(maxPacketSize);
        }

        // Determine if an extra packet of a smaller size should be sent
        if ((luaSourceSize % maxPacketSize) !== 0) {
            numPackets += 1;
            packetSizes.push(luaSourceSize % maxPacketSize);
        }



        // Synchronously read each packet of data to the device
        async.eachSeries(
            packetSizes,
            function(numBytes, callback) {
                // console.log('length: ',data.length,', data to send:',data);
                // Perform Device IO
                // self.device.qWriteArray('LUA_SOURCE_WRITE',data)
                // .then(
                //     function(data) {
                //         callback();
                //     },
                //     function(err) {
                //         console.log('Error on SRC write',err);
                //         console.log('Check .json for "type" of UINT16');
                //         callback(err);
                //     }
                // );
                console.log('reading...',numBytes);
                callback();
            },
            function(err) {
                innerDeferred.resolve();
            }
        );
        return innerDeferred.promise;
    };
    this.enableLuaDebugging = function() {
        // console.log('setting enablingLuaDebugging');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_DEBUG_ENABLE',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.enableLuaScript = function() {
        // console.log('starting Lua script');
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

    }
    this.enableStartupLuaScript = function() {
        self.print('enabling lua startup script');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_STARTUP_CONFIG',1)
        .then(innerDeferred.resolve, self.handleNoScriptError)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.disableStartupLuaScript = function() {
        self.print('disabling lua startup script');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_STARTUP_CONFIG',0)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    this.saveScriptToFlash = function() {
        self.print('saving lua script to flash');
        var innerDeferred = q.defer();

        // Perform Device IO
        self.device.qWrite('LUA_SAVE_TO_FLASH',1)
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
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

        // Handle errors & return
        .then(ioDeferred.resolve, ioDeferred.reject);

        // Return q instance
        return ioDeferred.promise;
    }
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

    var handleIOError = function(onSuccess) {
        return function(err) {
            console.log('LSD Error',err);
            onSuccess();
        };
    };
    this.handleIOError = handleIOError;

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
        self.luaVariables = framework.moduleConstants.luaVariables;
        self.viewConstants = framework.moduleConstants.viewData;

        // Initialize Device module context obj
        moduleContext.device = {};

        var setDeviceData = function(classStr, result) {
            // Initialize variables
            var title = "";
            var icon = "";
            var buttonTitle = "";
            var buttonIcon = "";
            var index = 0;

            var val = result.result;

            if(val > 1) {
                val = 1;
            }

            title = self.luaVariables[classStr].title[val];
            icon = self.luaVariables[classStr].icon[val];
            buttonTitle = self.luaVariables[classStr].buttonTitle[val];
            buttonIcon = self.luaVariables[classStr].buttonIcon[val];

            moduleContext.device[classStr] = {};
            moduleContext.device[classStr].title = title;
            moduleContext.device[classStr].icon = icon;
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
            console.log('execBranch',execTrue);
            if(execTrue) {
                trueFunc()
                .then(function(){
                    // Change icon & title
                    icon.removeClass(trueIcon);
                    icon.addClass(falseIcon);
                    button.attr('title',falseTitle);
                    console.log('finished executing true branch');
                    onSuccess();
                },self.handleIOError(onSuccess));
            } else {
                falseFunc()
                .then(function(){
                    // Change icon & title
                    icon.removeClass(falseIcon);
                    icon.addClass(trueIcon);
                    button.attr('title',trueTitle);
                    console.log('finished executing false branch');
                    onSuccess();
                },self.handleIOError(onSuccess));
            }
        }
        var runPauseLuaScript = function(data, onSuccess) {
            console.log('runPause button pressed');

            var constants = self.luaVariables.runStatus;
            conditionalExecution(
                constants,
                self.luaController.loadAndStartScript,
                self.luaController.stopScript,
                onSuccess
            );
        };
        var uploadLuaScript = function(data, onSuccess) {
            self.luaController.loadLuaScript()
            .then(function(){
                console.log('Script Loaded');
                onSuccess();
            },self.handleIOError(onSuccess));
        };
        var enableStartupScript = function(data, onSuccess) {
            console.log('enableStartupScript button pressed');

            var constants = self.luaVariables.startupStatus;
            conditionalExecution(
                constants,
                self.luaController.enableStartupLuaScript,
                self.luaController.disableStartupLuaScript,
                onSuccess
            );
        };
        var saveScriptToFlash = function(data, onSuccess) {
            console.log('saveScriptToFlash button pressed');

            self.luaController.saveScriptToFlash()
            .then(function(){
                console.log('Script Saved');
                onSuccess();
            },self.handleIOError(onSuccess));
        };
        var setIconData = function(constants, val) {
            var icon = $('#' + constants.iconID);
            icon.attr('class', constants.icon[val]);
            icon.attr('title', constants.title[val]);
        };
        var isLuaRunning = function(data, onSuccess) {
            setIconData(self.luaVariables.runStatus, data.value);
            onSuccess();
        };
        var isConfiguredForStartup = function(data, onSuccess) {
            setIconData(self.luaVariables.startupStatus, data.value);
            onSuccess();
        };
        var numDebugBytes = function(data, onSuccess) {
            self.luaController.getAndAddDebugData(data.value)
            .then(function() {
                // onSuccess
                onSuccess();
            }, function() {
                // onError
                onSuccess();
            });
        };
        var smartBindings = [
            {
                bindingName: 'LUA_RUN', 
                smartName: 'readRegister',
                iterationDelay: 9,
                configCallback: saveConfigRunStatus,
                periodicCallback: isLuaRunning
            }, {
                bindingName: 'LUA_STARTUP_CONFIG', 
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
                // Define binding to handle script-upload button presses.
                bindingName: 'upload-lua-script-to-device-button', 
                smartName: 'clickHandler',
                callback: uploadLuaScript
            }, {
                // Define binding to handle save-to-flash button presses.
                bindingName: 'save-script-to-flash-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
            }, {
                // Define binding to handle enable at startup button presses.
                bindingName: 'enable-script-at-startup-button', 
                smartName: 'clickHandler',
                callback: enableStartupScript
            }, {
                // Define binding to handle saving the active lua script button presses.
                bindingName: 'save-lua-script-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
            }, {
                // Define binding to handle loading user luaFile button presses.
                bindingName: 'load-lua-script-button', 
                smartName: 'clickHandler',
                callback: genericButtonPress
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
                // console.log('Successfully loaded script',data);
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
        // Initialize ace editor obj for luaEditor & debuggingLog:
        luaEditor.setupEditor(
            "lua-code-editor", 
            "ace/theme/monokai", 
            "ace/mode/lua"
        );
        debuggingLog.setupEditor(
            "lua-console-log-editor", 
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


