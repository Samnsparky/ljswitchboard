/**
 * Logic for the module framework.
 *
 * Logic for the framework and related GUI elements that bootstrap Switchboard
 * modules and allow the user to move between them.
 *
 * @author Sam Pottinger (LabJack Corp, 2013)
**/


var device_controller = require('./test_device_controller');
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
 * Display a collection of modules to the user as a list of selectable tabs.
 *
 * Display a collection of available modules to the user as a list of selectable
 * tabs.
 *
 * @param {Array} activeModules An Array of Object each containing information
 *      about a module to display as active.
**/
function displayActiveModules(activeModules)
{
    activeModules.forEach(function(e){addModuleTab(MODULE_TAB_CONTAINER, e);});
    $('.' + MODULE_TAB_CLASS).click(function(event){
        selectModule(event.target.id.replace(MODULE_TAB_ID_POSTFIX, ''));
    });
}


$('#module-chrome').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    $('#device-count-display').html(keeper.getNumDevices());
    module_manager.getActiveModules(genericErrorHandler, displayActiveModules);
});