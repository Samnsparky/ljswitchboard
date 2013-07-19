var handlebars = require('handlebars');
var sprintf = require('sprintf-js');

var CONFIG_PANE_SELECTOR = '#configuration-pane';
var OUTPUTS_TEMPLATE_SRC = 'analog_outputs/output_controls.html';
var OUTPUTS_DATA_SRC = 'analog_outputs/outputs.json';

var CONFIRMATION_DISPLAY_TEMPLATE_STR = '#{{register}}-confirmation-display';
var DEVICE_SELECT_ID_TEMPLATE_STR = '#{{serial}}-selector';

var CONFIRMATION_DISPLAY_TEMPLATE = handlebars.compile(
    CONFIRMATION_DISPLAY_TEMPLATE_STR);

var DEVICE_SELECT_ID_TEMPLATE = handlebars.compile(
    DEVICE_SELECT_ID_TEMPLATE_STR);


function formatVoltageTooltip(value)
{
    return sprintf.sprintf("%.2f V", value);
}


function onVoltageSelected(event)
{
    var register = event.target.id.replace('-control', '');
    
    var confirmationSelector = CONFIRMATION_DISPLAY_TEMPLATE(
        {register: register}
    );

    var selectedVoltage = Number(event.target.value);
    
    $(confirmationSelector).html(
        formatVoltageTooltip(selectedVoltage)
    );
}


function createSliders()
{
    $('.slider').slider(
        {formater: formatVoltageTooltip, value: 0}
    ).on('slideStop', onVoltageSelected);
}


function changeActiveDevices()
{
    var checkedDevices = $('.device-selection-checkbox:checked');
    $('#configuration-pane-holder').hide();
    
    if(checkedDevices.length != 0)
        $('#configuration-pane-holder').fadeIn();
}


$('#analog-output-config').ready(function(){
    var templateLocation = fs_facade.getExternalURI(OUTPUTS_TEMPLATE_SRC);
    var outputsSrc = fs_facade.getExternalURI(OUTPUTS_DATA_SRC);

    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var currentDeviceSelector = DEVICE_SELECT_ID_TEMPLATE(
        {'serial': devices[0].getSerial()}
    );
    
    $(currentDeviceSelector).attr('checked', true);

    $('.device-selection-checkbox').click(changeActiveDevices);

    fs_facade.getJSON(outputsSrc, genericErrorHandler, function(outputsInfo){
        fs_facade.renderTemplate(
            templateLocation,
            {'outputs': outputsInfo},
            genericErrorHandler,
            function(renderedHTML)
            {
                $(CONFIG_PANE_SELECTOR).hide(function(){
                    $(CONFIG_PANE_SELECTOR).html(renderedHTML);
                    $(CONFIG_PANE_SELECTOR).fadeIn();
                    createSliders();
                });
            }
        );
    });
});