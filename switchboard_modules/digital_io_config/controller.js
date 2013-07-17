var handlebars = require('handlebars');

var fs_facade = require('./fs_facade');

var IO_CONFIG_PANE_SELECTOR = '#io-config-pane';

var REGISTERS_DATA_SRC = 'digital_io_config/registers.json';
var INDIVIDUAL_TEMPLATE_SRC = 'digital_io_config/individual_device_config.html';
var MULTIPLE_TEMPLATE_SRC = 'digital_io_config/multiple_device_config.html';
var LOADING_IMAGE_SRC = 'static/img/progress-indeterminate-ring-light.gif';

var DEVICE_SELECT_ID_TEMPLATE_STR = '#{{serial}}-selector';
var DEVICE_SELECT_ID_TEMPLATE = handlebars.compile(
    DEVICE_SELECT_ID_TEMPLATE_STR);

var selectedDevices = [];


function renderIndividualDeviceControls(registers, devices)
{
    var location = fs_facade.getExternalURI(INDIVIDUAL_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': registers},
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#io-config-pane').html(renderedHTML);
            $('.direction-switch').bootstrapSwitch();
        }
    );
}


function renderManyDeviceControls(registers, devices)
{
    var location = fs_facade.getExternalURI(MULTIPLE_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': registers, 'devices': devices},
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#io-config-pane').html(renderedHTML);
            $('.direction-switch').bootstrapSwitch();
        }
    );
}


$('#digital-io-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();
    var currentDeviceSelector = DEVICE_SELECT_ID_TEMPLATE(
        {'serial': devices[0].getSerial()}
    );

    selectedDevices.push(devices[0]);
    
    $(currentDeviceSelector).attr('checked', true);

    $(IO_CONFIG_PANE_SELECTOR).empty().append(
        $('<img>').attr('src', LOADING_IMAGE_SRC)
    );

    var registersSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
    fs_facade.getJSON(registersSrc, genericErrorHandler, function(registerData){
        renderManyDeviceControls(registerData, devices);
    });
});