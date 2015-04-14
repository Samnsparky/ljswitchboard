/**
 * Presenter (for model view presenter) for LabJack Switchboard.
 *
 * Presenter for rendering templates and managing modules as part of the LabJack
 * Switchboard desktop utilities platform.
 *
 * @author A. Samuel Pottinger (LabJack, 2013)
 * @contributor Chris Johnson (LabJack, 2013)
**/

var async = require('async');
var handlebars = require('handlebars');
var q = require('q');

var fs_facade = require('./fs_facade');

var DEVICE_TYPE_DISPLAY_HEIGHTS = {'T7': 'tall', 'Digit': 'tall'};
var CHROME_TEMPLATE_NAME = 'module_chrome.html';
var CONTENTS_ELEMENT = '#content-holder';
var MODULE_CONTENTS_ELEMENT = '#module-chrome-contents';
var MODULE_CONTENTS_FOOTER = '#module-chrome-contents-footer';

var LATE_LOADED_JS_TEMPLATE_STR = '<script src="{{ href }}"' +
    'type="text/javascript" class="late-js-{{ type }}">';
var LATE_LOADED_CSS_TEMPLATE_STR = '<link href="{{ href }}" rel="stylesheet" ' +
    'class="late-css-{{ type }}">';
var ACTIVE_TAB_STR_TEMPLATE_STR = '{{ name }}-{{ counter }}';

var LATE_LOADED_CSS_TEMPLATE = handlebars.compile(LATE_LOADED_CSS_TEMPLATE_STR);
var LATE_LOADED_JS_TEMPLATE = handlebars.compile(LATE_LOADED_JS_TEMPLATE_STR);
var ACTIVE_TAB_STR_TEMPLATE = handlebars.compile(ACTIVE_TAB_STR_TEMPLATE_STR);
var START_UP_MODULE_OVERRIDE = false;
var START_UP_MODULE_NAME = 'thermocouple_simple';

var currentTab = '';
var numTabChanges = 0;
var AUTO_ENABLE_TAB_CLICK = true;
var LOADING_NEW_MODULE = false;

function unlockModuleLoader() {
    AUTO_ENABLE_TAB_CLICK = true;
    LOADING_NEW_MODULE = false;
}

function showCriticalAlert(content) {
    $('#device-search-msg').css("background-color",'#e16908');
    $('#device-search-msg').css("border",'1px solid #e16908');
    $('#device-search-msg').css("z-index",1000);
    $('#device-search-msg').animate({'width': '100%', 'left': '0%'});
    $('#searching-devices-message').hide();
    $('#device-search-msg').show();
    var prevInfo = $('#premature-error-holder').html();
    if(prevInfo === '') {
        $('#premature-error-holder').html(content);
    } else {
        $('#premature-error-holder').html(prevInfo + '<br>' + content);
    }
    $('#premature-error-holder').slideDown();
    $('#global-load-image-holder').slideUp();
}
function showPrematureAlert(content) {
    $('#premature-error-holder').html(content);
    setTimeout(function () {
        $('#premature-error-holder').slideDown();
        $('#global-load-image-holder').slideUp();
        $('#searching-devices-message').slideUp();
        $('#device-search-msg').animate({'width': '90%', 'left': '0%'});
    }, 1000);
}
var device_controller = null;
try {
    device_controller = require('./device_controller');
} catch (e) {
    showPrematureAlert(
        '<b>Failed to load JSON constants file or LJM on your machine. Please '+
        'check the install and restart Kipling</b>. Original error: '+
        e.toString()
    );
}


/**
 * Temporary / convenience error handler that re-throws errors.
 *
 * @param {Error} error The error to re-throw.
**/
var genericErrorHandler = function(error)
{
    alert(
        'An unexpected error occured:' + error.toString() + '. Please ' +
        'restart Kipling. This is likely because your device was ' +
        'disconnected physically from your machine. If this problem persists,' +
        ' please contact support@labjack.com.'
    );
};
var getCustomGenericErrorHandler = function(message) {
    return function(error) {
        alert(
            'An unexpected error occured:' + error.toString() + '. Please ' +
            'restart Kipling. This is likely because your device was ' +
            'disconnected physically from your machine. If this problem persists,' +
            ' please contact support@labjack.com. (Info: '+message.toString() +')'
        );
    };
};
var criticalErrorHandler = function(error)
{
    console.error(
        'An unexpected (critical)error occured:' + error.toString() + '. Please ' +
        'restart Kipling.'
    );
};

/**
 * Render a template located within the application resources archive.
 *
 * @param {String} name The name of the template (ex: test.html) that should be
 *      rendered.
 * @param {Object} context The key / values to use to render the template.
 * @param {String} dest The jQuery descriptor of the element whose inner HTML
 *      should be set to the rendered template.
 * @param {Boolean} internal If true, the tremplate will be loaded from the
 *      bundled program resources. If false, will be read from the file system
 *      outside of the program's bundled resources (ex. late downloaded
 *      resources installed along with a module).
 * @param {Array} cssFiles An array of strings with names of (interally located)
 *      css files to apply to the new template.
 * @param {Array} jsFiles An array of strings with the names of (internally
 *      located) JavaScript files to load.
 * @param {function} onError The function to call if rendring the template was
 *      unsuccessful.
**/
function renderTemplate(name, context, dest, internal, cssFiles, jsFiles, onErr)
{
    var onRender = function (renderedHTML) {
        var appendToHead = function(data, filePath) {
            try {
                $('head').append(data);
            } catch (err) {
                var fpArray = filePath.split('/');
                var fileName = fpArray[fpArray.length-1];
                var moduleName = currentTab.split('/')[0];
                console.log('Critical Error:',err.name);
                console.log('When Loading File:',fileName);
                console.log('Error Contents:',err);

                showCriticalAlert('<br>'+'<br>'+'<br>'+'<br>'+
                    'Critical Error Encountered Loading Module: '+moduleName+'<br>'+
                    'Error: <strong>'+err.name+'</strong><br>'+
                    'When Loading File: <strong>'+fileName+'</strong><br>'+
                    'Full Path To File: '+filePath+'<br>'+
                    'Error Contents: '+err.toString()+'<br>'+
                    'Check console.log for more info.'+'<br>'+
                    'Consider using <strong>www.jshint.com</strong> to debug file'
                    );
            }
        };
        var cssHTML;
        var jsHTML;

        // TODO: These should be in constants with Mustache
        var safeDest = dest.replace('#', '');
        $('.late-css-' + safeDest).remove();
        $('.late-js-' + safeDest).remove();

        $(dest).hide();

        // -------------------- Cleanup Code --------------------
        // $(dest).remove();
        if(typeof(sdFramework) !== 'undefined') {
            sdFramework.killInstance();
        }
        // -------------------- End of Cleanup Code --------------------
        $(dest).html(renderedHTML);

        $.each(cssFiles, function (index, fileLoc) {
            if (internal)
                fileLoc = fs_facade.getInternalURI(fileLoc);
            else
                fileLoc = fs_facade.getExternalURI(fileLoc);

            if (fileLoc === null) {
                onErr(new Error('Could not find ' + fileLoc + ' .'));
                return;
            }
            try {
                cssHTML = LATE_LOADED_CSS_TEMPLATE({
                    'href': fileLoc,
                    'type': safeDest
                });
            } catch (err) {
                console.log('Error compiling cssHTML presenter.js');
            }
            // $('head').append(cssHTML);
            appendToHead(cssHTML, fileLoc);
        });

        $.each(jsFiles, function (index, fileLoc) {
            if(internal) {
                fileLoc = fs_facade.getInternalURI(fileLoc);
            } else {
                fileLoc = fs_facade.getExternalURI(fileLoc);
            }
            if(fileLoc === null) {
                onErr(new Error('Could not find ' + fileLoc + ' .'));
                return;
            }
            try {
                jsHTML = LATE_LOADED_JS_TEMPLATE({
                    'href': fileLoc,
                    'type': safeDest
                });
            } catch (err) {
                console.log('Error compiling jsHTML presenter.js');
            }
            appendToHead(jsHTML, fileLoc);
        });

        $(dest).fadeIn(function() {
            if(AUTO_ENABLE_TAB_CLICK) {
                LOADING_NEW_MODULE = false;
            }
            if(typeof(onResized) !== 'undefined') {
                onResized();
            }
        });
    };

    var fileLoc;
    if(internal)
        fileLoc = fs_facade.getInternalURI(name);
    else
        fileLoc = fs_facade.getExternalURI(name);

    if(fileLoc === null) {
        onErr(new Error('Could not find ' + fileLoc + ' .'));
        return;
    }
    
    numTabChanges++;
    currentTab = name;
    try {
        fs_facade.renderTemplate(fileLoc, context, onErr, onRender);
    } catch(err) {
        console.log('error caught rendering template',err);
    }
}

function renderTemplateFramework(frameworkName, name, context, dest, internal, cssFiles, jsFiles, onErr) {
    renderTemplate(frameworkName, context, dest, internal, cssFiles, jsFiles, onErr);
    currentTab = name;
}



/**
 * Add the display size information to the given list of devies.
 *
 * Lookup the display size information about a given list of devices and add
 * that display information into the provided Object.
 *
 * @apram {Objects} deviceTypes The device information sorted by device type (as
 *      would be returned by device_controller.getDevices) to add size
 *      information to.
 * @return {Object} The modified device information passed in as deviceTypes.
**/
function includeDeviceDisplaySizes(deviceTypes) {
    return deviceTypes.map(function(e){
        e.size = DEVICE_TYPE_DISPLAY_HEIGHTS[e.name];
        return e;
    });
}

// Load native UI library
var isWindowCloseListenerAttacyed = false;
function attachWindowCloseListener() {
    if(!isWindowCloseListenerAttacyed) {
        try {
            var gui = require('nw.gui');

            // Get the current window
            var win = gui.Window.get();

            // Register callback to close devices on application close.
            win.on('close', function() {
                // This function gets executed when the user quits the application.
                if (device_controller === null) {
                    win.close(true);
                    return;
                }

                async.each(
                    device_controller.getDeviceKeeper().getDevices(),
                    function (device, callback) {
                        device.close(
                            callback,
                            function() { callback(); }
                        );
                    },
                    function (err) {
                        win.close(true);
                    }
                );
            });
            isWindowCloseListenerAttacyed = true;
        } catch (e) {
            criticalErrorHandler(e);
        }
    }
}


/**
 * Render the GUI for the device selector.
**/
function renderDeviceSelector() {
    $('#device-search-msg').show();
    $('#content-holder').html('');

    // Function to be called after link-info has been updated to call the 
    // continuation function, "onDevicesLoaded" to perform rendering process.
    var qOnDevicesLoaded = function(devices) {
        return function() {
            var defered = q.defer();
            onDevicesLoaded(devices);
            defered.resolve();
            return defered.promise;
        };
    };
    function onDevicesLoaded(devices) {
        // Define a context variable that will be used to render the 
        // device_selector.html file
        var context = {'device_types': includeDeviceDisplaySizes(devices)};

        // Get and save LJM's version number
        var ljmVersion = device_controller.ljm_driver.installedDriverVersion;
        context.ljmVersionNumber = ljmVersion;

        // Get and save Kipling's version number in the package.json file
        if (typeof(gui) === 'undefined') {
            // if the gui reference was garbage collected, re-link to it.
            gui = require('nw.gui');
        }
        var kiplingVersion = gui.App.manifest.version;
        context.kiplingVersionNumber = kiplingVersion;

        // Get and save the LJM_Wrapper version number
        var ljmWrapperVersion = require('labjack-nodejs/package.json').version;
        context.ljmWrapperVersionNumber = ljmWrapperVersion;
        if (devices.length === 0)
            context.noDevices = true;

        // Just before rendering the template, hide the "searching for devices"
        // message
        $('#device-search-msg').hide();
        renderTemplate(
            'device_selector.html',
            context,
            CONTENTS_ELEMENT,
            true,
            ['device_selector.css'],
            ['device_selector.js'],
            getCustomGenericErrorHandler('presenter.js-deviceSelectorFunc')
        );
    }

    console.log('Calling device_controller.getDevices');
    var devices = device_controller.getDevices(
        getCustomGenericErrorHandler('presenter.js-device_controller.getDevices'),
        function(devices) {
            device_controller.finishInit(function() {
                var loadFunc = qOnDevicesLoaded(devices);
                LABJACK_VERSION_MANAGER.waitForData()
                .then(loadFunc,loadFunc);
            });
        }
    );
    attachWindowCloseListener();
}

function getActiveTabID() {
    return ACTIVE_TAB_STR_TEMPLATE(
        { 'name': currentTab, 'counter': numTabChanges }
    );
}
