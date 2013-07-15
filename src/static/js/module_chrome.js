var device_controller = require('./test_device_controller');
var module_manager = require('./module_manager');

var MODULE_TAB_CONTAINER = '#module-list';
var MODULE_TAB_CLASS = 'module-tab';
var MODULE_TAB_ID_POSTFIX = '-module-tab';


function selectModule(name)
{
    $('.' + MODULE_TAB_CLASS).removeClass('selected');
    console.log('#' + name + MODULE_TAB_ID_POSTFIX);
    $('#' + name + MODULE_TAB_ID_POSTFIX).addClass('selected');
}


function addModuleTab(targetElement, module)
{
    var tabID = module.name + MODULE_TAB_ID_POSTFIX;
    $(targetElement).append(
        $('<li>').attr('class', MODULE_TAB_CLASS).attr('id', tabID).html(
            module.humanName
        )
    );
}


function displayActiveModules(activeModules)
{
    activeModules.forEach(function(e){addModuleTab(MODULE_TAB_CONTAINER, e);});
    $('.' + MODULE_TAB_CLASS).click(function(event){
        console.log(event.target.id);
        selectModule(event.target.id.replace(MODULE_TAB_ID_POSTFIX, ''));
    });
}


$('#module-chrome').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    $('#device-count-display').html(keeper.getNumDevices());
    module_manager.getActiveModules(genericErrorHandler, displayActiveModules);
});