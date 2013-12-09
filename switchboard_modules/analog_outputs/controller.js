/**
 * Logic for analog output (DAC) controls module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var dict = require('dict');
var handlebars = require('handlebars');
var q = require('q');
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

var devices;


function AnalogOutputDeviceController () {
    var connectedDevices = [];
    var outputs = dict();

    this.configureDACs = function () {
        var deferred = q.defer();

        var registers = [];
        var values = [];
        outputs.forEach(function (value, register) {
            registers.push(Number(register));
            values.push(value);
        });

        var writeValueClosure = function (device) {
            return function() {
                console.log(registers);
                console.log(values);
                return device.writeMany(registers, values);
            };
        };

        var numDevices = connectedDevices.length;
        var writeValueClosures = [];
        for (var i=0; i<numDevices; i++)
            writeValueClosures.push(writeValueClosure(connectedDevices[i]));

        var numClosures = writeValueClosures.length;
        if (numClosures == 0) { 
            deferred.resolve(); 
            return deferred.promise;
        }

        var lastPromise = null;
        for (var i=0; i<numClosures; i++) {
            if (lastPromise === null)
                lastPromise = writeValueClosures[i]();
            else
                lastPromise.then(
                    writeValueClosures[i],
                    function (err) {throw err}
                );
        }

        lastPromise.then(
            function () {deferred.resolve();},
            function (err) {throw err}
        )

        return deferred.promise;
    };

    this.setConnectedDevices = function (newConnectedDevices) {
        connectedDevices = newConnectedDevices;
        return this.configureDACs();
    };

    this.setDAC = function (register, value) {
        outputs.set(register, value);
        return this.configureDACs();
    };

    this.loadDAC = function (register) {
        var value = connectedDevices[0].read(Number(register));
        outputs.set(String(register), value);
        return value;
    };
}
var analogOutputDeviceController = new AnalogOutputDeviceController();


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

    analogOutputDeviceController.setDAC(register, selectedVoltage);
}


/**
 * Create the DAC / analog output controls.
**/
function createSliders()
{
    $('.slider').slider(
        {formater: formatVoltageTooltip, value: 0}
    ).on('slideStop', onVoltageSelected);

    loadCurrentDACSettings();
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
    var checkedDevices = $('.device-selection-checkbox:checked').map(
        function () {
            var numDevices = devices.length;
            var serial = this.id.replace('-selector', '');
            for (var i=0; i<numDevices; i++) {
                if (devices[i].getSerial() === serial)
                    return devices[i];
            }
            return null;
        }
    );

    analogOutputDeviceController.setConnectedDevices(checkedDevices);
    $('#configuration-pane-holder').hide();
    
    if(checkedDevices.length != 0)
        $('#configuration-pane-holder').fadeIn();
}


function loadCurrentDACSettings ()
{
    $('.slider').each(function () {
        var register = Number(this.id.replace('-control', ''));
        var selectedVoltage = analogOutputDeviceController.loadDAC(register);
        
        $('#' + this.id).slider('setValue', selectedVoltage);

        var confirmationSelector = CONFIRMATION_DISPLAY_TEMPLATE(
            {register: register}
        );
        $(confirmationSelector).html(formatVoltageTooltip(selectedVoltage));
    });
}


$('#analog-output-config').ready(function(){
    var templateLocation = fs_facade.getExternalURI(OUTPUTS_TEMPLATE_SRC);
    var outputsSrc = fs_facade.getExternalURI(OUTPUTS_DATA_SRC);

    var keeper = device_controller.getDeviceKeeper();
    devices = keeper.getDevices();

    var currentDeviceSelector = DEVICE_SELECT_ID_TEMPLATE(
        {'serial': devices[0].getSerial()}
    );
    
    $(currentDeviceSelector).attr('checked', true);
    analogOutputDeviceController.setConnectedDevices([devices[0]]);

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