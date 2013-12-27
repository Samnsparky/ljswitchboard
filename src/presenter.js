/**
 * Presenter (for model view presenter) for LabJack Switchboard.
 *
 * Presenter for rendering templates and managing modules as part of the LabJack
 * Switchboard desktop utilities platform.
 *
 * @author A. Samuel Pottinger (LabJack, 2013)
**/

var async = require('async');
var handlebars = require('handlebars');

var fs_facade = require('./fs_facade');
var device_controller = require('./device_controller');

var DEVICE_TYPE_DISPLAY_HEIGHTS = {'T7': 'tall', 'Digit-TL': 'tall'};
var CHROME_TEMPLATE_NAME = 'module_chrome.html';
var CONTENTS_ELEMENT = '#content-holder';
var MODULE_CONTENTS_ELEMENT = '#module-chrome-contents';

var LATE_LOADED_JS_TEMPLATE_STR = '<script src="{{ href }}"' +
    'type="text/javascript" class="late-js-{{ type }}">';
var LATE_LOADED_CSS_TEMPLATE_STR = '<link href="{{ href }}" rel="stylesheet" ' +
    'class="late-css-{{ type }}">';
var ACTIVE_TAB_STR_TEMPLATE_STR = '{{ name }}-{{ counter }}';

var LATE_LOADED_CSS_TEMPLATE = handlebars.compile(LATE_LOADED_CSS_TEMPLATE_STR);
var LATE_LOADED_JS_TEMPLATE = handlebars.compile(LATE_LOADED_JS_TEMPLATE_STR);
var ACTIVE_TAB_STR_TEMPLATE = handlebars.compile(ACTIVE_TAB_STR_TEMPLATE_STR);

var currentTab = '';
var numTabChanges = 0;


/**
 * Temporary / convenience error handler that re-throws errors.
 *
 * @param {Error} error The error to re-throw.
**/
var genericErrorHandler = function(error)
{
    throw error;
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
    var onRender = function (renderedHTML)
    {
        var cssHTML;
        var jsHTML;

        // TODO: These should be in constants with Mustache
        var safeDest = dest.replace('#', '');
        $('.late-css-' + safeDest).remove();
        $('.late-js-' + safeDest).remove();

        $(dest).hide();
        $(dest).html(renderedHTML);

        $.each(cssFiles, function (index, fileLoc)
        {
            if(internal)
                fileLoc = fs_facade.getInternalURI(fileLoc);
            else
                fileLoc = fs_facade.getExternalURI(fileLoc);

            if(fileLoc === null)
            {
                onErr(new Error('Could not find ' + fileLoc + ' .'));
                return;
            }

            cssHTML = LATE_LOADED_CSS_TEMPLATE({
                'href': fileLoc,
                'type': safeDest
            }); 
            $('head').append(cssHTML);
        });

        $.each(jsFiles, function (index, fileLoc)
        {
            if(internal)
                fileLoc = fs_facade.getInternalURI(fileLoc);
            else
                fileLoc = fs_facade.getExternalURI(fileLoc);

            if(fileLoc === null)
            {
                onErr(new Error('Could not find ' + fileLoc + ' .'));
                return;
            }

            jsHTML = LATE_LOADED_JS_TEMPLATE({
                'href': fileLoc,
                'type': safeDest
            });
            $('head').append(jsHTML);
        });

        $(dest).fadeIn();
    };

    var fileLoc;
    if(internal)
        fileLoc = fs_facade.getInternalURI(name);
    else
        fileLoc = fs_facade.getExternalURI(name);

    if(fileLoc === null)
    {
        onErr(new Error('Could not find ' + fileLoc + ' .'));
        return;
    }
    
    numTabChanges++;
    currentTab = name;
    fs_facade.renderTemplate(fileLoc, context, onErr, onRender);
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
function includeDeviceDisplaySizes(deviceTypes)
{
    return deviceTypes.map(function(e){
        e.size = DEVICE_TYPE_DISPLAY_HEIGHTS[e.name];
        return e;
    });
}

// Load native UI library
try {
    var gui = require('nw.gui');

    // Get the current window
    var win = gui.Window.get();

    // Register callback to close devices on application close.
    win.on('close', function() {
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
} catch (e) {}


/**
 * Render the GUI for the device selector.
**/
function renderDeviceSelector()
{
    var onDevicesLoaded = function(devices) {
        var context = {'connection_types': includeDeviceDisplaySizes(devices)};
        $('#device-search-msg').hide();
        renderTemplate(
            'device_selector.html',
            context,
            CONTENTS_ELEMENT,
            true,
            ['device_selector.css'],
            ['device_selector.js'],
            genericErrorHandler
        );
    };

    var devices = device_controller.getDevices(
        genericErrorHandler,
        onDevicesLoaded
    );
}


function getActiveTabID()
{
    return ACTIVE_TAB_STR_TEMPLATE(
        { 'name': currentTab, 'counter': numTabChanges }
    );
}
