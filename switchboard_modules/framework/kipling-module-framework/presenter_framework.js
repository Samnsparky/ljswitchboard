/**
 * Event driven framework for easy module construction.
 *
 * @author: Chris Johnson (LabJack, 2014)
 * @author: Sam Pottinger (LabJack, 2014)
**/

var async = require('async');
var dict = require('dict');
var q = require('q');
var sprintf = require('sprintf').sprintf;

var ljmmm_parse = null;
try {
    ljmmm_parse = require('ljmmm-parse');
} catch (err) {
    console.log('error loading ljmmm_parse');
}
var fs_facade = null;
try {
    fs_facade = require('./fs_facade');
} catch (err) {
    console.log('error loading fs_facade');
}

var FADE_DURATION = 20;
var DEFAULT_REFRESH_RATE = 1000;
var CONFIGURING_DEVICE_TARGET = '#sd-ramework-configuring-device-display';
var DEVICE_VIEW_TARGET = '#device-view';

function JQueryWrapper (origJQuery) {
    this.html = function (selector, newHTML) {
        $(selector).html(newHTML);
    };
    this.bind = function(selector, event,listener) {
        $(selector).bind(event,listener);
    };
    this.unbind = function(selector, event) {
        $(selector).unbind(event);
    };
    this.on = function (selector, event, listener) {
        $(selector).on(event, listener);
        // $(selector).bind(event, listener);
        // $(selector).unbind(event, listener);
    };

    this.find = function (selector) {
        return $(selector);
    };

    this.val = function (selector) {
        return $(selector).val();
    };
    this.hide = function(selector) {
        return $(selector).hide();
    };
    this.show = function(selector) {
        // return $(selector).show();
    };
    this.fadeOut = function(selector,duration,callback) {
        return $(selector).fadeOut(duration,callback);
    };
    this.fadeIn = function(selector,duration,callback) {
        return $(selector).fadeIn(duration,callback);
    };
    this.checkFirstDeviceRadioButton = function() {
        return $('.device-selection-radio').first().prop('checked', true);
    };
    this.get = function(selector) {
        return $(selector);
    };
}


/**
 * Creates a new binding info object with the metadata copied from another.
 *
 * Creates a new binding info object, a structure with all of the information
 * necessary to bind a piece of the module GUI to a register / registers on
 * a LabJack device. This will copy the "metadata" from an existing binding
 * into a new one. Namely, it will re-use original's class, direction, and
 * event attributes but add in new binding and template values.
 * 
 * @param {Object} orginal The object with the original binding information.
 * @param {String} binding The register name to bind the GUI element(s) to.
 *      If given an LJMMM string, will be exapnded and all registers named after
 *      the expansion will be bound to the GUI. Note that this expansion
 *      is executed later in the framework and only a single binding will be
 *      returned from this function.
 * @param {String} template The template for the GUI element ID to bind. This
 *      should coorespond to a HTML element IDs. May contain LJMMM and, if
 *      given an LJMMM string, will be expanded and matched to the registers
 *      listed in binding parameter. Note that this expansion
 *      is executed later in the framework and only a single binding will be
 *      returned from this function.
 * @return {Object} New binding.
**/
function cloneBindingInfo (original, bindingClass, binding, template) {
    var retVar = {};
    try{
        retVar = {
            bindingClass: bindingClass,
            template: template,
            binding: binding,
            direction: original.direction,
            event: original.event,
            format: original.format,
            customFormatFunc: original.customFormatFunc,
            writeCallback: original.writeCallback
        };
    } catch (err) {
        console.log('ERROR: ',err);
        var retVar = {};
    }
    return retVar;
}


/**
 * Expands the LJMMM in the bindingClass, binding, and template names.
 *
 * Each binding info object has a binding attribute with the name of the
 * register on the device to bind from as well as a template attribute that
 * specifies the ID of the HTML element to bind to. So, binding AIN0 and
 * template analog-input-0 would bind the device register for AIN0 to 
 * the HTML element with the id analog-input-0. This function will exapnd
 * LJMMM names found in either the template or binding attributes. Binding
 * AIN#(0:1) will exapnd to [AIN0, AIN1] and analog-input-#(0:1) will expand
 * to [analog-input-0, analog-input-1].
 *
 * @param {Object} bindingInfo The object with info about the binding to
 *      expand.
 * @return {Array} Array containing all of the bindings info objects that
 *      resulted from expanding the LJMMM found in original binding info
 *      object's binding and template attributes. If no LJMMM was in the
 *      original binding info object's binding or template attributes, an Array
 *      with a single binding info object will be returned.
**/
function expandBindingInfo (bindingInfo) {
    var expandedBindingClasses = ljmmm_parse.expandLJMMMName(bindingInfo.bindingClass);
    var expandedBindings = ljmmm_parse.expandLJMMMName(bindingInfo.binding);
    var expandedTemplates = ljmmm_parse.expandLJMMMName(bindingInfo.template);

    if (expandedBindings.length != expandedTemplates.length) {
        throw 'Unexpected ljmmm expansion mismatch.';
    }

    var newBindingsInfo = [];
    var numBindings = expandedBindings.length;
    for (var i=0; i<numBindings; i++) {
        var clone = cloneBindingInfo(
            bindingInfo,
            expandedBindingClasses[i],
            expandedBindings[i],
            expandedTemplates[i]
        );
        newBindingsInfo.push(clone);
    }

    return newBindingsInfo;
}

function cloneSetupBindingInfo (original, bindingClass, binding) {
    var retVar = {};
    try{
        retVar = {
            bindingClass: bindingClass,
            binding: binding,
            direction: original.direction,
            defaultVal: original.defaultVal
        };
    } catch (err) {
        console.log('ERROR: ',err);
        var retVar = {};
    }
    return retVar;
}

function expandSetupBindingInfo (bindingInfo) {
    var expandedBindingClasses = ljmmm_parse.expandLJMMMName(bindingInfo.bindingClass);
    var expandedBindings = ljmmm_parse.expandLJMMMName(bindingInfo.binding);

    if (expandedBindingClasses.length != expandedBindings.length) {
        throw 'Unexpected ljmmm expansion mismatch.';
    }

    var newBindingsInfo = [];
    var numBindings = expandedBindings.length;

    for (var i=0; i<numBindings; i++) {
        var clone = cloneSetupBindingInfo(
            bindingInfo,
            expandedBindingClasses[i],
            expandedBindings[i]
        );
        newBindingsInfo.push(clone);
    }

    return newBindingsInfo;
}
/**
 * Force a redraw on the rendering engine.
**/
function runRedraw()
{
    document.body.style.display='none';
    var h = document.body.offsetHeight; // no need to store this anywhere, the reference is enough
    document.body.style.display='block';
}
function qRunRedraw() {
    var innerDeferred = q.defer();
    runRedraw();
    innerDeferred.resolve();
    return innerDeferred.promise; 
}


/**
 * Object that manages the modules using the Kipling Module Framework.
**/
function Framework() {

    // List of events that the framework handels
    var eventListener = dict({
        onModuleLoaded: null,
        onDeviceSelected: null,
        onDeviceConfigured: null,
        onTemplateLoaded: null,
        onRegisterWrite: null,
        onRegisterWritten: null,
        onRefresh: null,
        onRefreshed: null,
        onCloseDevice: null,
        onUnloadModule: null,
        onLoadError: null,
        onWriteError: null,
        onRefreshError: null,
        onExecutionError: function (params) { throw params; }
    });
    this.eventListener = eventListener;
    var deviceSelectionListenersAttached = false;
    var jquery = null;
    var refreshRate = DEFAULT_REFRESH_RATE;
    var configControls = [];

    var bindings = dict({});
    var readBindings = dict({});
    var writeBindings = dict({});

    var setupBindings = dict({});
    var readSetupBindings = dict({});
    var writeSetupBindings = dict({});

    var selectedDevices = [];
    var userViewFile = "";
    var moduleTemplateBindings = {};
    var moduleTemplateSetupBindings = {};
    var moduleName = '';
    var moduleJsonFiles = [];
    var moduleInfoObj;

    this.deviceSelectionListenersAttached = deviceSelectionListenersAttached;
    this.jquery = jquery;
    this.refreshRate = refreshRate;
    this.configControls = configControls;

    this.bindings = bindings;
    this.readBindings = readBindings;
    this.writeBindings = writeBindings;

    this.setupBindings = setupBindings;
    this.readSetupBindings = readSetupBindings;
    this.writeSetupBindings = writeSetupBindings;

    this.selectedDevices = selectedDevices;
    this.runLoop = false;
    this.userViewFile = userViewFile;
    this.moduleTemplateBindings = moduleTemplateBindings;
    this.moduleTemplateSetupBindings = moduleTemplateSetupBindings;
    this.moduleName = moduleName;
    this.moduleJsonFiles = moduleJsonFiles;
    this.moduleInfoObj = moduleInfoObj;

    var self = this;

    this._SetJQuery = function(newJQuery) {
        jquery = newJQuery;
        this.jquery = newJQuery;
    };

    this._SetSelectedDevices = function(selectedDevices) {
        selectedDevices = selectedDevices;
        self.selectedDevices = selectedDevices;
    };
    var _SetSelectedDevices = this._SetSelectedDevices;

    /**
     * Set the callback that should be called for an event.
     *
     * Indicate which function (callback) should be called when the framework
     * encounters each event. Note that previous event listeners for that event
     * will be cleared by calling this.
     *
     * @param {String} name The name of the event to register a callback for.
     * @param {function} listener The function to call when that event is
     *      encountered. Should take a single argument: an object whose
     *      attributes are parameters supplied to the event.
    **/
    this.on = function (name, listener) {
        if (!eventListener.has(name)) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
            return;
        }
        eventListener.set(name, listener);
    };
    var on = this.on;

    /**
     * Force-cause an event to occur through the framework.
     *
     * @param {String} name The name of the event to fire.
     * @param {Object} params Object whose attributes should be used as
     *      parameters for the event.
     * @param {function} onErr Function to call if an error was encountered
     *      while running event listeneres. Optional.
     * @param {function} onSuccess Function to call after the event listeners
     *      finish running. Optional.
    **/
    this.fire = function (name, params, onErr, onSuccess) {
        var noop = function () {};

        if (!params)
            params = [];

        if (!onSuccess)
            onSuccess = noop;

        if (!onErr)
            onErr = noop;

        if (!eventListener.has(name)) {
            onSuccess();
            return;
        }

        var listener = eventListener.get(name);

        if (listener !== null) {
            var passParams = [];
            passParams.push(self);
            passParams.push.apply(passParams, params);
            passParams.push(onErr);
            passParams.push(onSuccess);
            try{
                listener.apply(null, passParams);
            } catch (err) {
                console.log(
                    'Error firing: '+name, 
                    ' Error caught is: ',err.name, 
                    'message: ',err.message);
                showCriticalAlert(
                    'Error Firing: '+name+
                    '<br>--Error Type: '+err.name+
                    '<br>--Error Message: '+err.message);
                onErr(err);
            }
        } else {
            onSuccess();
        }
    };
    var fire = this.fire;

    /**
     * Function deletes various 'window.' objects that need to be removed in 
     * order for module to behave properly when switching tabs.
     * @param  {Array} moduleLibraries Array of string "window.xxx" calls that
     *      need to be deleted, (delete window.xxx) when a module gets unloaded.
     */
    this.unloadModuleLibraries = function(moduleLibraries) {
        if(moduleLibraries !== undefined) {
            moduleLibraries.forEach(function(element, index, array){
                var delStr = 'delete ' + element;
                eval(delStr);
            });
        } else {
            // console.log('presenter_framework, "third_party_code_unload" undefined');
        }
    };
    var unloadModuleLibraries = this.unloadModuleLibraries;

    this.convertBindingsToDict = function() {
        return self.moduleTemplateBindings;
    };
    var convertBindingsToDict = this.convertBindingsToDict;

    this.qHideUserTemplate = function() {
        var innerDeferred = q.defer();
        self.jquery.fadeOut(
            DEVICE_VIEW_TARGET,
            FADE_DURATION,
            function(){
                self.jquery.fadeIn(
                    CONFIGURING_DEVICE_TARGET,
                    FADE_DURATION,
                    innerDeferred.resolve
                );
            }
        );
        return innerDeferred.promise;
    };
    var qHideUserTemplate = this.qHideUserTemplate;

    this.qShowUserTemplate = function() {
        var innerDeferred = q.defer();
        self.jquery.fadeOut(
            CONFIGURING_DEVICE_TARGET,
            FADE_DURATION,
            function(){
                self.jquery.fadeIn(
                    DEVICE_VIEW_TARGET,
                    FADE_DURATION,
                    innerDeferred.resolve
                );
            }
        );
        return innerDeferred.promise;
    };
    var qShowUserTemplate = this.qShowUserTemplate;

    this.qExecOnModuleLoaded = function() {
        var innerDeferred = q.defer();

        //Save module info
        self.moduleInfoObj = LOADED_MODULE_INFO_OBJECT;
        moduleInfoObj = LOADED_MODULE_INFO_OBJECT;

        //Fire onModuleLoaded function
        self.fire(
            'onModuleLoaded',
            [],
            innerDeferred.reject,
            innerDeferred.resolve
        );
        return innerDeferred.promise;
    };
    var qExecOnModuleLoaded = this.qExecOnModuleLoaded;

    this.qExecOnDeviceSelected = function() {
        var innerDeferred = q.defer();
        self.fire(
            'onDeviceSelected',
            [self.getSelectedDevice()],
            innerDeferred.reject,
            innerDeferred.resolve
        );
        return innerDeferred.promise;
    };
    var qExecOnDeviceSelected = this.qExecOnDeviceSelected;

    this.qExecOnDeviceConfigured = function(data) {
        var innerDeferred = q.defer();
        self.fire(
            'onDeviceConfigured',
            [self.getSelectedDevice(), data],
            innerDeferred.reject,
            innerDeferred.resolve
        );
        return innerDeferred.promise;
    };
    var qExecOnDeviceConfigured = this.qExecOnDeviceConfigured;

    this.qExecOnTemplateLoaded = function() {
        var innerDeferred = q.defer();
        try{
            self.fire(
                'onTemplateLoaded',
                [],
                innerDeferred.reject,
                innerDeferred.resolve
            );
        } catch (err) {
            if(err.name === 'SyntaxError') {
                console.log('Syntax Error captured');
            }
            console.log('Error caught in qExecOnTemplateLoaded',err);
        }
        return innerDeferred.promise;
    };
    var qExecOnTemplateLoaded = this.qExecOnTemplateLoaded;

    this.qExecOnCloseDevice = function(device) {
        var innerDeferred = q.defer();
        self.fire(
            'onCloseDevice',
            [device],
            innerDeferred.reject,
            innerDeferred.resolve
        );
        return innerDeferred.promise;
    };
    var qExecOnCloseDevice = this.qExecOnCloseDevice;

    this.qExecOnLoadError = function(err) {
        var innerDeferred = q.defer();
        self.fire(
            'onLoadError',
            [
                [ err ],
                function (shouldContinue) { 
                    self.runLoop = shouldContinue; 
                    innerDeferred.resolve();
                }
            ]
        );
        return innerDeferred.promise;
    };
    var qExecOnLoadError = this.qExecOnLoadError;

    this.qExecOnUnloadModule = function() {
        var innerDeferred = q.defer();

        //Halt the daq loop
        self.stopLoop();

        //clean up module's third party libraries
        self.unloadModuleLibraries(self.moduleInfoObj.third_party_code_unload);

        //Inform the module that it has been unloaded.
        self.fire(
            'onUnloadModule',
            [],
            innerDeferred.reject,
            innerDeferred.resolve
        );
        return innerDeferred.promise;
    };
    var qExecOnUnloadModule = this.qExecOnUnloadModule;

    this.qRenderModuleTemplate = function() {
        var innerDeferred = q.defer();
        self.setDeviceView(
            self.userViewFile,
            //['thermocouple_simple/moduleData.json'],
            self.moduleJsonFiles,
            self.convertBindingsToDict(), 
            innerDeferred.reject, 
            innerDeferred.resolve
        );
        return innerDeferred.promise;
    };
    var qRenderModuleTemplate = this.qRenderModuleTemplate;

    this.qUpdateActiveDevice = function() {
        var innerDeferred = q.defer();
        var keeper = device_controller.getDeviceKeeper();
        var devices = keeper.getDevices();
        var selectedDevices = [];

        self.jquery.get('.device-selection-radio:checked').each(
            function (index, elem) {
                var numDevices = devices.length;
                var serial = elem.id.replace('-selector', '');
                for (var i=0; i<numDevices; i++) {
                    if (devices[i].getSerial() === serial)
                        selectedDevices.push(devices[i]);
                }
                return null;
            }
        );

        self._SetSelectedDevices(selectedDevices);
        innerDeferred.resolve();
        return innerDeferred.promise;
    };
    var qUpdateActiveDevice = this.qUpdateActiveDevice;

    /**
     * Set how frequently the framework should read from the device.
     *
     * @param {int} newRefreshRate The number of milliseconds between updates.
    **/
    this.setRefreshRate = function (newRefreshRate) {
        self.refreshRate = newRefreshRate;
    };
    var setRefreshRate = this.setRefreshRate;

    /**
     * Indicate which HTML controls should cause device configured to fire.
     *
     * Indicate which HTML controls (not bound through putConfigBinding) that
     * should cause a device configured event to be fired when they have an
     * event within the HTML view. This could, for example, be a button to
     * write values to a device.
     *
     * @param {Array} newConfigControls An array of Object where each element
     *      has an event attribute with the name of the event to listen for
     *      on the HTML element and a selector attribute which should be a 
     *      jQuery selector for the HTML elements to bind the event listener
     *      to.
    **/
    this.setConfigControls = function (newConfigControls) {
        self.configControls = newConfigControls;
    };
    var setConfigControls = this.setConfigControls;

    /**
     * Register a new configuration binding.
     *
     * Register a new configuration binding that either cuases an HTML element
     * to act as a (frequently updated) display for the value of a register
     * or as an HTML element that allows the user to write the value of
     * a device register. This device binding info object should have
     * attributes:
     *
     * <ul>
     *   <li>{string} class: Description of what type of binding this is. Not
     *          used in this first release of this framework.</li>
     *   <li>{string} template: The ID of the HTML element to bind to. For
     *          example: ain-0-display or ain-#(0:1)-display.</li>
     *   <li>{string} binding: The name of the device register to bind to. For
     *          exmaple: AIN0 or AIN#(0:1).</li>
     *   <li>{string} direction: Either "read" for displaying a the value of a
     *          device register or "write" for having an HTML element set the
     *          value of a device register. May also be "hybrid" which will
     *          first read the current value of a register, display that, and
     *          then update the value of that register on subsequent updates
     *          from within the view.</li>
     *   <li>{string} event: The name of the event to bind to. Only required if
     *          write or hybrid. For example, "change" would cause the value to
     *          be written to the device each time an input box value is
     *          changed.</li>
     * </ul>
     *
     * Note that template and binding can contain LJMMM strings. If they do,
     * they will automagically be expanded and bound individually. So, template
     * of analog-#(0:1)-display and binding of AIN#(0:1) will bind
     * analog-0-display to AIN0 and analog-1-display to AIN1.
     *
     * @param {Object} newBinding The binding information object (as described
     *      above) that should be registered.
    **/
    this.putConfigBinding = function (newBinding) {
        var onErrorHandle = function (shouldContinue) {
            self.runLoop = shouldContinue;
        };

        if (newBinding.bindingClass === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing bindingClass' ],
                onErrorHandle
            );
            return;
        }

        if (newBinding.template === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing template' ],
                onErrorHandle
            );
            return;
        }        

        if (newBinding.binding === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing binding' ],
                onErrorHandle
            );
            return;
        }

        if (newBinding.direction === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                onErrorHandle
            );
            return;
        }
        if (newBinding.format === undefined) {
            newBinding.format = '%.4f';
        }
        if (newBinding.customFormatFunc === undefined) {
            newBinding.customFormatFunc = function(rawReading){
                console.log('Here, val:',rawReading);
                var retStr = "'customFormatFunc' NotDefined";
                return retStr;
            };
        }
        if (newBinding.writeCallback === undefined) {
            newBinding.writeCallback = function(binding, value, onSuccess){
                console.log('Here, binding:',binding,', val: ', value);
                var retStr = "'writeCallback' NotDefined";
                onSuccess();
            };
        }


        var isWrite = newBinding.direction === 'write';
        if (isWrite && newBinding.event === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                onErrorHandle
            );
            return;
        }

        var expandedBindings = expandBindingInfo(newBinding);
        var numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (var i=0; i<numBindings; i++)
                putConfigBinding(expandedBindings[i]);
            return;
        }

        try{
            if(self.moduleTemplateBindings[newBinding.bindingClass] === undefined) {
                self.moduleTemplateBindings[newBinding.bindingClass] = [];
            }
            self.moduleTemplateBindings[newBinding.bindingClass].push(newBinding);
        } catch (err) {
            console.log('Error in presenter_framework.js, putConfigBinding',err);
        }
        bindings.set(newBinding.template, newBinding);
        

        var jquerySelector = '#' + newBinding.template;
        if (newBinding.direction === 'read') {
            readBindings.set(newBinding.template, newBinding);
        } else if (newBinding.direction === 'write') {
            writeBindings.set(newBinding.template, newBinding);
            jquery.unbind(jquerySelector,newBinding.event);
            jquery.bind(
                jquerySelector,
                newBinding.event,
                function () { self._writeToDevice(newBinding); }
            );
        } else {
            self.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                onErrorHandle
            );
        }
    };
    var putConfigBinding = this.putConfigBinding;

    this.putConfigBindings = function(bindings) {
        var numBindings = bindings.length;
        for(var i = 0; i < numBindings; i++) {
            self.putConfigBinding(bindings[i]);
        }
    };
    var putConfigBindings = this.putConfigBindings;

    /**
     * Function to add a single binding that gets read once upon device 
     * selection.
     * @param  {[type]} binding [description]
     * @return {[type]}         [description]
     */
    this.putSetupBinding = function(newBinding) {
        var onErrorHandle = function (shouldContinue) {
            self.runLoop = shouldContinue;
        };

        // Check for various required binding attributes & report onLoadErrors 
        // if they dont exist
        if (newBinding.bindingClass === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing bindingClass' ],
                onErrorHandle
            );
            return;
        }

        if (newBinding.binding === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing binding' ],
                onErrorHandle
            );
            return;
        }

        if (newBinding.direction === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                onErrorHandle
            );
            return;
        }

        var isWrite = newBinding.direction === 'write';
        if ( (isWrite) && (newBinding.defaultVal === undefined) ) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing defaultVal' ],
                onErrorHandle
            );
            return;
        }
        

        var expandedBindings = expandSetupBindingInfo(newBinding);
        var numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (var i=0; i<numBindings; i++)
                putSetupBinding(expandedBindings[i]);
            return;
        }

        try{
            if(self.moduleTemplateSetupBindings[newBinding.bindingClass] === undefined) {
                self.moduleTemplateSetupBindings[newBinding.bindingClass] = [];
            }
            self.moduleTemplateSetupBindings[newBinding.bindingClass].push(newBinding);
        } catch (err) {
            console.log('Error in presenter_framework.js, putSetupBinding', err);
        }
        setupBindings.set(newBinding.bindingClass, newBinding);
        
        if (newBinding.direction === 'read') {
            readSetupBindings.set(newBinding.bindingClass, newBinding);
        } else if (newBinding.direction === 'write') {
            writeSetupBindings.set(newBinding.bindingClass, newBinding);
        } else {
            self.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                onErrorHandle
            );
        }


    };
    var putSetupBinding = this.putSetupBinding;

    /**
     * Function to add multiple bindings that get read once upon device 
     * selection.
     * @param  {[type]} binding [description]
     * @return {[type]}         [description]
     */
    this.putSetupBindings = function(bindings) {
        bindings.forEach(function(binding){
            self.putSetupBinding(binding);
        });
    };
    var putSetupBindings = this.putSetupBindings;

    this.executeSetupBindings = function() {
        var deferred = q.defer();

        var addresses = [];
        var directions = [];
        var numValues = [];
        var values = [];
        var bindingClasses = [];

        var rwManyData = {
            bindingClasses: bindingClasses,
            addresses: addresses,
            directions: directions,
            numValues: numValues,
            values: values
        };

        // return this.rwMany(addresses, directions, numValues, values);

        var saveSetupBindings = function(setupInfo) {
            var innerDeferred = q.defer();
            self.setupBindings.forEach(function(binding, index){
                setupInfo.bindingClasses.push(binding.bindingClass);
                setupInfo.addresses.push(binding.binding);
                setupInfo.numValues.push(1);
                if ( binding.direction === 'read' ) {
                    setupInfo.directions.push(0);
                    setupInfo.values.push(-1);
                } else if ( binding.direction === 'write' ) {
                    setupInfo.directions.push(1);
                    setupInfo.values.push(setupInfo.defaultVal);
                }
            });
            innerDeferred.resolve(setupInfo);
            return innerDeferred.promise;
        };


        // Function for saving successful write i/o attempts
        function createSuccessfulWriteFunc (ioDeferred, binding, results) {
            return function (value) {
                var result = {
                    status: 'success',
                    result: -1,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                ioDeferred.resolve();
            };
        }

        // Function for saving failed write i/o attempts 
        function createFailedWriteFunc (ioDeferred, binding, results) {
            return function (error) {
                var result = {
                    status: 'error',
                    result: error,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                ioDeferred.resolve();
            };
        }

        // Function for saving successful read i/o attempts
        function createSuccessfulReadFunc (ioDeferred, binding, results) {
            return function (value) {
                // console.log('Successful Read',value);
                var result = {
                    status: 'success',
                    result: value,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                ioDeferred.resolve();
            };
        }
        
        // Function for saving failed read i/o attempts
        function createFailedReadFunc (ioDeferred, binding, results) {
            return function (error) {
                // console.log('Error on Read',error);
                var result = {
                    status: 'error',
                    result: error,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                ioDeferred.resolve();
            };
        }

        // Function that creates future device I/O operations to be executed
        function createFutureDeviceIOOperation (binding, results) {
            return function() {
                //Create execution queue
                var innerDeferred = q.defer();
                var device = self.getSelectedDevice();

                //Create various read/write functions
                var successfulWriteFunc = createSuccessfulWriteFunc(
                    innerDeferred,
                    binding,
                    results
                );
                var failedWriteFunc = createFailedWriteFunc(
                    innerDeferred,
                    binding,
                    results
                );
                var successfulReadFunc = createSuccessfulReadFunc(
                    innerDeferred,
                    binding,
                    results
                );
                var failedReadFunc = createFailedReadFunc(
                    innerDeferred,
                    binding,
                    results
                );
                // console.log('Executing IO Operation', binding.binding);
                //Link various function calls based off read/write property
                if(binding.direction === 'write') {
                    //Define write I/O procedure
                    device.qWrite(binding.binding, binding.defaultVal)
                    .then(successfulWriteFunc, failedWriteFunc);
                } else if (binding.direction === 'read') {
                    //Define read I/O procedure
                    device.qRead(binding.binding)
                    .then(successfulReadFunc, failedReadFunc);
                } else {
                    console.log('invalid binding.direction', binding.direction);
                }

                //Return execution queue reference
                return innerDeferred.promise;
            };
        }

        // Function that creates the IO execution queue
        function createDeviceIOExecutionQueue (bindings, results) {
            // Execution queue
            var bindingList = [];

            // Populating the execution queue
            bindings.forEach(function (binding, key) {
                bindingList.push(createFutureDeviceIOOperation(
                    binding, 
                    results
                ));
            });
            return bindingList;
        }

        // Function that executes the device setup commands
        function executeDeviceSetupQueue (bindings) {
            var deferred = q.defer();
            var results = dict({});

            var executionQueue = createDeviceIOExecutionQueue(
                bindings, 
                results
            );

            //Execute the created execution queue of device IO commands
            async.eachSeries(
                executionQueue,
                function (request, callback) {
                    var successFunc = function() {
                        // console.log('eachSeries Success')
                        callback();
                    };
                    var errorFunc = function(err) {
                        // console.log('eachSeries Err',err);
                        callback(err);
                    };

                    request().then(successFunc,errorFunc);
                },
                function (err) {
                    // console.log('eachSeries Callback',err);
                    deferred.resolve(results);
                });
            return deferred.promise;
        }

        var performDeviceWrites = function(setupInfo) {
            var innerDeferred = q.defer();

            var device;
            var addresses = [];
            var directions = [];
            var numValues = [];
            var values = [];

            device = self.getSelectedDevice();
            addresses = setupInfo.addresses;
            directions = setupInfo.directions;
            numValues = setupInfo.numValues;
            values = setupInfo.values;
            
            try{
                device.rwMany(
                    addresses,
                    directions,
                    numValues,
                    values
                    ).then(
                    function(results) {
                        var configResults = dict({});
                        if(results.length != self.setupBindings.size) {
                            console.log('presenter_framework setupBindings ERROR!!');
                            console.log('resultsLength',results.length);
                            console.log('setupBindings length', self.setupBindings.size);
                        } else {
                            var i = 0;
                            self.setupBindings.forEach(function(binding, key){
                                configResults.set(
                                    key,
                                    {
                                        binding: binding,
                                        address: addresses[i], 
                                        result: results[i]
                                    });
                                i += 1;
                            });
                        }
                        innerDeferred.resolve(configResults);
                    },
                    function(err) {
                        innerDeferred.reject(err);
                    });
            }
            catch(err) {
                console.log('performDeviceWrites err',err);
                innerDeferred.reject(err);
            }
            return innerDeferred.promise;
        };
        
        // Save the setup information
        
    // Code for executing requests in a single rwMany request:
        // saveSetupBindings(rwManyData)
        // .then(performDeviceWrites,self.qExecOnLoadError)
    // Code for executing requests one at a time
        executeDeviceSetupQueue(self.setupBindings)
        .then(deferred.resolve,deferred.reject);
        return deferred.promise;
    };

    this._writeToDevice = function (bindingInfo) {
        var jquerySelector = '#' + bindingInfo.template;
        var newVal = self.jquery.val(jquerySelector);

        var alertRegisterWrite = function () {
            var innerDeferred = q.defer();
            self.fire(
                'onRegisterWrite',
                [
                    bindingInfo,
                    newVal
                ],
                innerDeferred.reject,
                innerDeferred.resolve
            );
            return innerDeferred.promise;
        };

        var performCallbacks = function(skipWrite) {
            var innerDeferred = q.defer();
            var callbackString = '-callback';
            var baseStr = bindingInfo.binding;
            var searchIndex = baseStr.search(callbackString);
            if( searchIndex >= 0) {
                if((baseStr.length - searchIndex - callbackString.length) === 0) {
                    bindingInfo.writeCallback(
                        {
                            framework: self,
                            device: self.getSelectedDevice(),
                            binding: bindingInfo,
                            value: newVal,
                        },
                        function() {
                            innerDeferred.resolve(skipWrite, true);
                        });
                    return innerDeferred.promise;
                }
            } else {
                innerDeferred.resolve(skipWrite, false);
            }
            return innerDeferred.promise;
        };

        var writeToDevice = function (skipWrite, skip) {
            var innerDeferred = q.defer();
            if(skip) {
                var device = self.getSelectedDevice();
                var invalidString = '-invalid';
                var baseStr = bindingInfo.binding;
                var searchIndex = baseStr.search(invalidString);
                if( searchIndex >= 0) {
                    if((baseStr.length - searchIndex - invalidString.length) === 0) {
                        innerDeferred.resolve(false);
                        return innerDeferred.promise;
                    }
                }
                if(typeof(skipWrite) === undefined) {
                    device.write(bindingInfo.binding, newVal);
                    innerDeferred.resolve(true);
                } else if(typeof(skipWrite) === "boolean") {
                    if(skipWrite === false) {
                        device.write(bindingInfo.binding, newVal);
                        innerDeferred.resolve(true);
                    }
                    else {
                        innerDeferred.resolve(false);
                    }
                } else {
                    innerDeferred.resolve(false);
                }
            } else {
                innerDeferred.resolve(false);
            }
            return innerDeferred.promise;
        };

        var alertRegisterWritten = function (wasNotHandledExternally) {
            if(wasNotHandledExternally) {
                var innerDeferred = q.defer();
                self.fire(
                    'onRegisterWritten',
                    [
                        bindingInfo.binding,
                        newVal
                    ],
                    innerDeferred.reject,
                    innerDeferred.resolve
                );
                return innerDeferred.promise;
            }
        };

        var deferred = q.defer();

        // Alert to module that a write is about to happen
        alertRegisterWrite()

        // Perform callback if necessary
        .then(performCallbacks, deferred.reject)

        // Perform un-handled device IO
        .then(writeToDevice, deferred.reject)

        // Notify module that the write has finished
        .then(alertRegisterWritten, deferred.reject)

        .then(deferred.resolve, deferred.reject);
        return deferred.promise;
    };

    /**
     * Delete a previously added configuration binding.
     *
     * @param {String} bindingName The name of the binding (the binding info
     *      object's original "template" attribute) to delete.
    **/
    this.deleteConfigBinding = function (binding) {
        var bindingName = binding.bindingClass;
        var expandedBindings = ljmmm_parse.expandLJMMMName(bindingName);
        var numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (var i=0; i<numBindings; i++)
                deleteConfigBinding(expandedBindings[i]);
            return;
        }

        if (!self.bindings.has(bindingName)) {
            self.fire(
                'onLoadError',
                [ 'No binding for ' + bindingName ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
            return;
        }

        var bindingInfo = this.bindings.get(bindingName);

        self.bindings.delete(bindingName);

        if (bindingInfo.direction === 'read') {
            self.readBindings.delete(bindingName);
        } else if (bindingInfo.direction === 'write') {
            self.writeBindings.delete(bindingName);
            var jquerySelector = '#' + bindingInfo.template;
            jquery.off(jquerySelector, bindingInfo.event);
        } else {
            self.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
        }
    };
    var deleteConfigBinding = this.deleteConfigBinding;

    this.deleteConfigBindings = function(bindings) {
        bindings.forEach(function(binding){
            self.deleteConfigBinding(binding);
        });
    };

    this.clearConfigBindings = function() {
        bindings = dict({});
        readBindings = dict({});
        writeBindings = dict({});
        moduleTemplateBindings = {};

        self.bindings = bindings;
        self.readBindings = readBindings;
        self.writeBindings = writeBindings;
        self.moduleTemplateBindings = moduleTemplateBindings;
    };
    var deleteConfigBindings = this.deleteConfigBindings;

    /**
     * Render the HTML view to use for the current module.
     *
     * @param {str} templateLoc Path to the HTML template to use to render this
     *      module's view. Will be rendered as a handlebars template.
     * @param {Array} jsonFiles String paths to the JSON files to use when
     *      rendering this view. Will be provided to the template as an
     *      attribute "json" on the rendering context. Namely, context.json will
     *      be set to an object where the attribute is the name of the JSON file
     *      and the value is the JSON loaded from that file.
     * @param {function} onErr The function to call if an error was encountered
     *      while rendering the module view. Optional.
     * @param {function} onSuccess The function to call after the view has been
     *      rendered.
    **/
    this.setDeviceView = function (loc, jsonFiles, context, onErr, onSuccess) {
        var noop = function () {};

        if (jsonFiles === undefined)
            jsonFiles = [];

        if (context === undefined)
            context = {};

        if (!onErr)
            onErr = noop;

        if (!onSuccess)
            onSuccess = noop;
        // console.log('context (analogInputs)', context);
        // console.log('moduleTemplateBindings:', self.moduleTemplateBindings);

        // Create an error handler
        var reportLoadError = function (details) {
            console.log('reporting load error', details);
            onErr({'msg': details});
            self.fire(
                'onLoadError',
                [ details ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
        };

        // Load the supporting JSON files for use in the template
        var jsonTemplateVals = {};
        var loadJSONFiles = function () {
            var deferred = q.defer();
            async.eachSeries(
                jsonFiles,
                function (location, callback) {
                    var fullURI = fs_facade.getExternalURI(location);
                    fs_facade.getJSON(
                        fullURI,
                        callback,
                        function (result) {
                            var lName = location.replace(/\.json/g, '');
                            var name = lName.split('/')[lName.split('/').length-1];
                            jsonTemplateVals[name] = result;
                            callback(null); 
                        }
                    );
                },
                function (err) {
                    if (err)
                        deferred.reject(err);
                    else
                        deferred.resolve();
                }
            );
            return deferred.promise;
        };

        // Load the HTML view template and render
        var prepareHTMLTemplate = function () {
            var deferred = q.defer();
            var fullURI = fs_facade.getExternalURI(loc);
            context.json = jsonTemplateVals;
            fs_facade.renderTemplate(
                fullURI,
                context,
                deferred.reject,
                deferred.resolve
            );
            return deferred.promise;
        };

        this.introduceDelay = function() {
            var innerDeferred = q.defer();
            setTimeout(innerDeferred.resolve, 200);
            return innerDeferred.promise;
        };
        this.forceRefresh = function() {
            var innerDeferred = q.defer();
            runRedraw();
            innerDeferred.resolve();
            return innerDeferred.promise;
        };

        var injectHTMLTemplate = function (htmlContents) {
            var deferred = q.defer();
            // var moduleDiv = $(DEVICE_VIEW_TARGET);
            // moduleDiv.html(htmlContents);
            
            htmlContents = '<div class="framework-template">' + htmlContents + '</div>';
            self.jquery.html(DEVICE_VIEW_TARGET, htmlContents);
            $('.framework-template').ready(runRedraw);

            deferred.resolve();
            return deferred.promise;
        };

        var attachListeners = function () {
            if(self.deviceSelectionListenersAttached === false) {
                self.jquery.on(
                    '.device-selection-radio',
                    'click',
                    self._changeSelectedDeviceUI
                );
                self.deviceSelectionListenersAttached = true;
                deviceSelectionListenersAttached = true;
            }
            var devs = self.jquery.get('.device-selection-radio');
            var activeDev = self.getSelectedDevice();
            var i;
            for (i = 0; i < devs.length; i++) {
                if (activeDev.getSerial() === devs.eq(i).val()) {
                    devs.eq(i).prop('checked', true);
                }
            }
            // self.jquery.find('.device-selection-radio').first().prop('checked', true);
        };

        loadJSONFiles()
        .then(prepareHTMLTemplate, reportLoadError)
        .then(injectHTMLTemplate, reportLoadError)
        //.then(introduceDelay, reportLoadError)
        //.then(forceRefresh, reportLoadError)
        .then(attachListeners, reportLoadError)
        .then(onSuccess, reportLoadError);
    };
    var setDeviceView = self.setDeviceView;

    this._changeSelectedDeviceUI = function () {
        var deferred = q.defer();
        var selectedCheckboxes = $('.device-selection-radio:checked');

        //Perform necessary actions:
        // Report that the device has been closed
        self.qExecOnCloseDevice(self.getSelectedDevice())

        // Display the module's template
        .then(self.qHideUserTemplate, self.qExecOnLoadError)

        // Update the currently-active device
        .then(self.qUpdateActiveDevice, self.qExecOnLoadError)

        // Report that a new device has been selected
        .then(self.qExecOnDeviceSelected, self.qExecOnLoadError)

        // Configure the device
        .then(self.executeSetupBindings, self.qExecOnLoadError)

        // Report that the device has been configured
        .then(self.qExecOnDeviceConfigured, self.qExecOnLoadError)

        // Render the module's template
        .then(self.qRenderModuleTemplate, self.qExecOnLoadError)

        // Display the module's template
        .then(self.qShowUserTemplate, self.qExecOnLoadError)

        // Report that the module's template has been loaded
        .then(self.qExecOnTemplateLoaded, self.qExecOnLoadError)

        .then(deferred.resolve, deferred.reject);
        return deferred.promise;
    };

    /**
     * Get the currently selected device.
     *
     * @return {presenter.Device} The device selected as the "active" device.
    **/
    this.getSelectedDevice = function () {
        if (self.selectedDevices.length === 0)
            return null;
        else
            return self.selectedDevices[0];
    };
    var getSelectedDevice = this.getSelectedDevice;

    /**
     * Function that should be called after all of the bindings have been added.
     *
     * Function that should be called after all of the config bindings have been
     * added and all of the config controls have been set.
    **/
    this.establishConfigControlBindings = function () {
        var listener = self._OnConfigControlEvent;
        var jquery = self.jquery;
        self.configControls.forEach(function (value) {
            jquery.on(value.selector, value.event, listener);
        });
    };
    var establishConfigControlBindings = this.establishConfigControlBindings;

    /**
     * Stop the module's refresh loop.
    **/
    this.stopLoop = function () {
        self.runLoop = false;
    };
    var stopLoop = this.stopLoop;

    /**
     * Start the module's refresh loop.
    **/
    this.startLoop = function () {
        self.runLoop = true;
        self.loopIteration();
    };
    var startLoop = this.startLoop;

    this.qConfigureTimer = function() {
        var innerDeferred = q.defer();
        setTimeout(self.loopIteration, self.refreshRate);
        innerDeferred.resolve();
        return innerDeferred.promise;
    };
    var qConfigureTimer = this.qConfigureTimer;
    /**
     * Function to run a single iteration of the module's refresh loop.
     *
     * @return {q.promise} Promise that resolves after the iteration of the
     *      refresh loop finishes running. Rejects if an error was encountered
     *      during the loop iteration.
    **/
    this.loopIteration = function () {
        var deferred = q.defer();

        if (!self.runLoop) {
            deferred.reject('Loop not running.');
            return deferred.promise;
        }

        var reportError = function (details) {
            // TODO: Get register names from readBindings.
            self.fire(
                'onRefreshError',
                [ self.readBindings , details ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
            deferred.reject(details);
        };

        var getNeededAddresses = function () {
            var innerDeferred = q.defer();
            var addresses = [];
            var formats = [];
            var customFormatFuncs = [];
            var bindings = [];

            self.readBindings.forEach(function (value, key) {
                addresses.push(value.binding);
                formats.push(value.format);
                customFormatFuncs.push(value.customFormatFunc);
                bindings.push(value);
            });

            innerDeferred.resolve({
                addresses: addresses, 
                formats: formats,
                customFormatFuncs: customFormatFuncs,
                bindings: bindings
            });
            return innerDeferred.promise;
        };

        var alertRefresh = function (bindingsInfo) {
            var innerDeferred = q.defer();
            self.fire(
                'onRefresh',
                [ bindingsInfo ],
                innerDeferred.reject,
                function () { innerDeferred.resolve(bindingsInfo); }
            );
            return innerDeferred.promise;
        };
        var checkModuleStatus = function(bindingsInfo) {
            var innerDeferred = q.defer();
            if(self.moduleName === getActiveTabID()) {
                innerDeferred.resolve(bindingsInfo);
            } else {
                innerDeferred.reject(bindingsInfo);
            }
            return innerDeferred.promise;
        };

        var requestDeviceValues = function (bindingsInfo) {
            var innerDeferred = q.defer();
            var device = self.getSelectedDevice();
            var addresses = bindingsInfo.addresses;
            var formats = bindingsInfo.formats;
            var customFormatFuncs = bindingsInfo.customFormatFuncs;
            var bindings = bindingsInfo.bindings;
            
            if (addresses.length === 0) {
                innerDeferred.resolve({
                    values: [],
                    addresses: [],
                    formats: [],
                    customFormatFuncs: []
                });
                return innerDeferred.promise;
            }

            device.readMany(addresses)
            .then(
                function (values) {
                    innerDeferred.resolve({
                        values: values,
                        addresses: addresses,
                        formats: formats,
                        customFormatFuncs: customFormatFuncs,
                        bindings: bindings
                    });
                },
                innerDeferred.reject
            );

            return innerDeferred.promise;
        };

        var processDeviceValues = function (valuesInfo) {
            var innerDeferred = q.defer();
            var values = valuesInfo.values;
            var addresses = valuesInfo.addresses;
            var formats = valuesInfo.formats;
            var customFormatFuncs = valuesInfo.customFormatFuncs;
            var numAddresses = addresses.length;
            var bindings = valuesInfo.bindings;
            var retDict = dict();

            for (var i=0; i<numAddresses; i++) {
                var stringVal;
                if(formats[i] !== 'customFormat') {
                    stringVal = sprintf(formats[i], values[i]);
                } else {
                    stringVal = customFormatFuncs[i]({
                        value: values[i],
                        address: addresses[i],
                        binding: bindings[i]
                        });
                }
                retDict.set(
                    addresses[i].toString(),
                    stringVal
                );
            }
            innerDeferred.resolve(retDict);
            return innerDeferred.promise;
        };

        var alertOn = function (valuesDict) {
            var innerDeferred = q.defer();
            self._OnRead(valuesDict);
            innerDeferred.resolve(valuesDict);
            return innerDeferred.promise;
        };

        var alertRefreshed = function (valuesDict) {
            var innerDeferred = q.defer();
            self.fire(
                'onRefreshed',
                [ valuesDict ],
                innerDeferred.reject,
                function () { innerDeferred.resolve(); }
            );
            return innerDeferred.promise;
        };

        // var setTimeout = function () {
            
        // };
        //checkModuleStatus()
        getNeededAddresses()
        .then(alertRefresh, reportError)
        .then(requestDeviceValues, reportError)
        .then(processDeviceValues, reportError)
        .then(alertOn, reportError)
        .then(alertRefreshed, reportError)
        .then(checkModuleStatus, reportError)
        .then(self.qConfigureTimer, self.qExecOnUnloadModule)
        .then(deferred.resolve, deferred.reject);

        return deferred.promise;
    };
    var loopIteration = this.loopIteration;

    /**
     * Determine how many bindings have been registered for the module.
     *
     * @return {int} The number of bindings registered for this module.
    **/
    this.numBindings = function () {
        return self.bindings.size();
    };
    var numBindings = this.numBindings;

    this._OnRead = function (valueReadFromDevice) {
        var jquery = self.jquery;
        self.readBindings.forEach(function (bindingInfo, template) {
            var bindingName = bindingInfo.binding;
            var valRead = valueReadFromDevice.get(bindingName.toString());
            if (valRead !== undefined) {
                var jquerySelector = '#' + bindingInfo.template;
                jquery.html(jquerySelector, valRead.replace(' ','&nbsp;'));
            }
        });
    };
    var _OnRead = _OnRead;

    this._OnConfigControlEvent = function (event) {
        self.fire('onRegisterWrite', [event]);
        self.fire('onRegisterWritten', [event]);
    };
    var _OnConfigControlEvent = _OnConfigControlEvent;

    this.configFramework = function(viewLoc) {
        userViewFile = viewLoc;
        self.userViewFile = viewLoc;
        //self.fire('onModuleLoaded')
    };
    this.configureFrameworkData = function(jsonDataFiles) {
        moduleJsonFiles = jsonDataFiles;
        self.moduleJsonFiles = jsonDataFiles;
    };
    var configureFrameworkData = this.configureFrameworkData;

    this.saveModuleName = function() {
        moduleName = getActiveTabID();
        self.moduleName = getActiveTabID();
    };
    var saveModuleName = this.saveModuleName;

    this.setCustomContext = function(data) {
        moduleTemplateBindings.custom = data;
        self.moduleTemplateBindings.custom = data;
    };
    var setCustomContext = this.setCustomContext;

    this.tabClickHandler = function() {
        var visibleTabs = self.jquery.get('.module-tab');
        visibleTabs.off('click.sdFramework'+self.moduleName);
        self.qExecOnUnloadModule();
    };
    var tabClickHandler = this.tabClickHandler;

    this.attachNavListeners = function() {
        var visibleTabs = self.jquery.get('.module-tab');
        visibleTabs.on('click.sdFramework'+getActiveTabID(),self.tabClickHandler);
    };
    var attachNavListeners = this.attachNavListeners;

    this.startFramework = function() {
        var deferred = q.defer();
        
        self.qExecOnModuleLoaded()
        .then(self.attachNavListeners, self.qExecOnLoadError)
        .then(deferred.resolve, deferred.reject);
        return deferred.promise;
    };

    this.runFramework = function() {
        var deferred = q.defer();
        var handleError = function(details) {
            var innerDeferred = q.defer();
            console.log('Presenter_Framework, runFramework Error:', details);
            deferred.reject(details);
            innerDeferred.resolve();
            return innerDeferred.promise;
        };
        var checkFirstDevice = function() {
            var innerDeferred = q.defer();
            self.jquery.checkFirstDeviceRadioButton();
            innerDeferred.resolve();
            return innerDeferred.promise;
        };
        var setModuleName = function() {
            var innerDeferred = q.defer();
            self.saveModuleName();
            innerDeferred.resolve();
            return innerDeferred.promise;
        };
        
        checkFirstDevice()

        // Save the module's current instance name
        .then(setModuleName, self.qExecOnLoadError)

        // Update the currently-active device
        .then(self.qUpdateActiveDevice, self.qExecOnLoadError)

        // Report that a new device has been selected
        .then(self.qExecOnDeviceSelected, self.qExecOnLoadError)

        // Configure the device
        .then(self.executeSetupBindings, self.qExecOnLoadError)

        // Report that the device has been configured
        .then(self.qExecOnDeviceConfigured, self.qExecOnLoadError)

        // Render the module's template
        .then(self.qRenderModuleTemplate, self.qExecOnLoadError)
        
        // Display the module's template
        .then(self.qShowUserTemplate, self.qExecOnLoadError)

        // Report that the module's template has been loaded
        .then(self.qExecOnTemplateLoaded, self.qExecOnLoadError)

        // Start the DAQ loop
        .then(self.startLoop, self.qExecOnLoadError)

        // Re-draw the window to prevent window-disapearing issues
        .then(qRunRedraw, self.qExecOnLoadError)

        .then(deferred.resolve, deferred.reject);
        return deferred.promise;


    };
}

var singleDeviceFramework = Framework;
try {
    exports.Framework = Framework;
} catch (err) {
    //console.log('error defining presenter_framework.js exports', err);  
}

// console.log('initializing framework & module');
// Initialize the framework
var sdFramework = new Framework();