/**
 * Logic for analog output (DAC) controls module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/


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


/**
 * String formatting for the tooltip labels displayed on DAC controls.
 *
 * String formatting convenience function that generates strings for the
 * tooltips displayed on the DAC slider controls.
 *
 * @param {Number} value Floating point number indicating the voltage value
 *      being used on a DAC / analog output.
 * @return {String} Formatted string with the voltage value for a DAC / analog
 *      output.
**/
function formatVoltageTooltip(value)
{
    return sprintf.sprintf("%.2f V", value);
}


/**
 * Event listener for when a voltage value is selected for DAC / analog output.
 *
 * Event listener fired when a voltage value is selected for a DAC / analog
 * output.
 *
 * @param {Event} jQuery event object.
**/
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


/**
 * Create the DAC / analog output controls.
**/
function createSliders()
{
    $('.slider').slider(
        {formater: formatVoltageTooltip, value: 0}
    ).on('slideStop', onVoltageSelected);
}


/**
 * Event listener for changes in the list of active devices.
 *
 * Event listener watching which devices this module is controlling, firing when
 * changes are made to that list. This list indicates which devices have DACs /
 * analog outputs being controled by this module.
**/
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