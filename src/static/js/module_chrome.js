/**
 * Logic for the module framework.
 *
 * Logic for the framework and related GUI elements that bootstrap Switchboard
 * modules and allow the user to move between them.
 *
 * @author Sam Pottinger (LabJack Corp, 2013)
**/


var device_controller = require('./device_controller');
var presenter = require('./presenter')
var module_manager = require('./module_manager');

var MODULE_TAB_CONTAINER = '#module-list';
var MODULE_TAB_CLASS = 'module-tab';
var MODULE_TAB_ID_POSTFIX = '-module-tab';
var MODULE_LOADING_IMAGE_NAME = 'progress-indeterminate-ring-light.gif';
var MODULE_LOADING_IMAGE_DIR = 'static/img/'
var MODULE_LOADING_IMAGE_SRC = MODULE_LOADING_IMAGE_DIR +
    MODULE_LOADING_IMAGE_NAME;
var CURRENT_DEVICE_INDEX = 0; // Device to start off as being selected
var resizeTimeout;


/**
 * Switch the view to the given module.
 *
 * @param {String} name The name of the module to switch the user view to.
**/
function selectModule(name)
{
    $('.' + MODULE_TAB_CLASS).removeClass('selected');
    $('#' + name + MODULE_TAB_ID_POSTFIX).addClass('selected');
    $(MODULE_CONTENTS_ELEMENT).empty().append(
        $('<img>').attr('src', MODULE_LOADING_IMAGE_SRC)
    );

    $('#cur-module-display').html(name.replace(/_/g, ' '));

    var src = name + '/view.html';
    var cssFile = name + '/style.css';
    var jsFile = name + '/controller.js';
    var keeper = device_controller.getDeviceKeeper()
    var devices = keeper.getDevices();
    var standardContext = {
        'devices': devices,
        'hasMultipleDevices': keeper.getNumDevices() > 1,
        'currentDevice': devices[CURRENT_DEVICE_INDEX]
    };
    renderTemplate(src, standardContext, MODULE_CONTENTS_ELEMENT, false,
        [cssFile], [jsFile], genericErrorHandler);
}


/**
 * Add a new tab for a module to the GUI list of available modules.
 *
 * @param {String} targetElement The jQuery compatible selector for the
 *      element or elements that the tab should be added to.
 * @param {Object} module The information for the module to add a tab for.
**/
function addModuleTab(targetElement, module)
{
    var tabID = module.name + MODULE_TAB_ID_POSTFIX;
    $(targetElement).append(
        $('<li>').attr('class', MODULE_TAB_CLASS).attr('id', tabID).html(
            module.humanName
        )
    );
}


/**
 * Display a collection of modules to the user as a list of tabs.
 *
 * Display a collection of available modules to the user as a list of sidebar
 * tabs.
 *
 * @param {Array} activeModules An Array of Object each containing information
 *      about a module to display.
 * @param {function} onError The callback to call if an error is encountered
 *      while creating the display.
 * @param {function} onSuccess The callback to call after the modules display
 *      has been rendered.
**/
function displayActiveModules(activeModules, onError, onSuccess)
{
    if(activeModules.length == 0)
    {
        onSuccess();
        return;
    }

    fs_facade.getModuleInfo(activeModules.shift().name, onError,
        function(info)
        {
            addModuleTab(MODULE_TAB_CONTAINER, info);
            displayActiveModules(activeModules, onError, onSuccess);
        }
    );
}


/**
 * Display a collection of modules to the user as a list of selectable tabs.
 *
 * Display a collection of available modules to the user as a list of selectable
 * sidebar tabs, adding click event listeners where necessary.
 *
 * @param {Array} activeModules An Array of Object each containing information
 *      about a module to display.
 * @param {function} onError The callback to call if an error is encountered
 *      while creating the display.
 * @param {function} onSuccess The callback to call after the display is
 *      rendered with event listeners. This is optional.
**/
function displayActiveModulesWithEvents(activeModules, onError, onSuccess)
{
    displayActiveModules(activeModules.slice(0), onError, function()
    {
        $('.' + MODULE_TAB_CLASS).click(function(event){
            selectModule(event.target.id.replace(MODULE_TAB_ID_POSTFIX, ''));
        });

        if(onSuccess !== undefined)
            onSuccess();
    });
}


function onResized()
{
    if ($(window).width() > 767) {
        $('#device-nav-dock').slideUp();
        $('#module-list').slideDown();
        $('#close-nav-dock').slideUp();
    } else {
        $('#device-nav-dock').slideDown();
        $('#module-list').slideUp();
        $('#close-nav-dock').slideUp();
    }

    var topPos = $('#module-chrome-contents').position().top;
    var contents_height = $(window).height() - topPos;
    if (contents_height < 500)
        contents_height = 500;

    $('#module-chrome-contents').animate(
        {'height': contents_height.toString() + 'px'},
        500
    )
}


$('#module-chrome').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    $('#device-count-display').html(keeper.getNumDevices());

    $('#manage-link').click(function () {
        $('#device-search-msg').show();
        $('#content-holder').html('');
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
    });

    $('#change-modules-link').click(function () {
        $('#device-nav-dock').slideUp();
        $('#module-list').slideDown();
        $('#close-nav-dock').slideDown();
    });

    $('#close-modules-link').click(function () {
        $('#device-nav-dock').slideDown();
        $('#module-list').slideUp();
        $('#close-nav-dock').slideUp();
    });

    $( window ).resize(function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onResized, 100);
    });
    
    var topPos = $('#module-chrome-contents').position().top;
    var contents_height = $(window).height() - topPos;
    if (contents_height < 500)
        contents_height = 500;

    $('#module-chrome-contents').css(
        {'height': contents_height.toString() + 'px'}
    )
    
    module_manager.getActiveModules(
        genericErrorHandler,
        function (modules) {
            displayActiveModulesWithEvents(
                modules,
                genericErrorHandler,
                function () {selectModule(modules[0].name);}
            );
        }
    );
});