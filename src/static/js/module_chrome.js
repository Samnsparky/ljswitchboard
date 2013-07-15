var device_controller = require('./test_device_controller');
var module_manager = require('./module_manager');

var MODULE_TAB_CONTAINER = '#module-list';


function addModuleTab(targetElement, module)
{
    var linkID = module.name + '-module-tab';
    $(targetElement).append(
        $('<li>').append(
            $('<span>').attr('class', 'tab').append(module.humanName)
        )
    );
}


function displayActiveModules(activeModules)
{
    activeModules.forEach(function(e){addModuleTab(MODULE_TAB_CONTAINER, e);});
}


$('#module-chrome').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    $('#device-count-display').html(keeper.getNumDevices());
    module_manager.getActiveModules(genericErrorHandler, displayActiveModules);
});