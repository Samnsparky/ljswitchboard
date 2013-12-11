/**
 * Logic for the digital I/O configuration and monitoring module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var async = require('async');
var dict = require('dict');
var handlebars = require('handlebars');
var q = require('q');

var fs_facade = require('./fs_facade');

var IO_CONFIG_PANE_SELECTOR = '#io-config-pane';

var REGISTERS_DATA_SRC = 'digital_io_config/registers.json';
var INDIVIDUAL_TEMPLATE_SRC = 'digital_io_config/individual_device_config.html';
var MULTIPLE_TEMPLATE_SRC = 'digital_io_config/multiple_device_config.html';
var LOADING_IMAGE_SRC = 'static/img/progress-indeterminate-ring-light.gif';
var REFRESH_DELAY = 1000;

var DEVICE_SELECT_ID_TEMPLATE_STR = '#{{serial}}-selector';
var DISPLAY_SELECT_ID_TEMPLATE_STR = '#{{deviceType}}-{{serial}}-{{register}}';
var OUTPUT_SWITCH_TEMPLATE_STR = '#{{register}}-output-switch';

var DEVICE_SELECT_ID_TEMPLATE = handlebars.compile(
    DEVICE_SELECT_ID_TEMPLATE_STR);
var DISPLAY_SELECT_ID_TEMPLATE = handlebars.compile(
    DISPLAY_SELECT_ID_TEMPLATE_STR);
var OUTPUT_SWITCH_TEMPLATE = handlebars.compile(
    OUTPUT_SWITCH_TEMPLATE_STR);

var targetedDevices = [];

var curTabID = getActiveTabID();


/**
 * Render the controls and display for an individual device.
 *
 * @param {Array} registers An Array of Object with information about the
 *      registers that controls and displays should be created for.
 * @param {Array} devices An Array of Object with information about the devices
 *      that the display / controls should operate on.
 * @param {function} onSuccess The optional callback to call after the controls
 *      have been rendered.
**/
function renderIndividualDeviceControls(registers, device, onSuccess)
{
    var location = fs_facade.getExternalURI(INDIVIDUAL_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': registers, 'device': device},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(IO_CONFIG_PANE_SELECTOR).html(renderedHTML);
            $('.switch').bootstrapSwitch();

            if(onSuccess !== undefined)
                onSuccess();
        }
    );
}


/**
 * Render the controls and display suitable for manipulating many devices.
 *
 * @param {Array} registers An Array of Object with information about the
 *      registers that controls and displays should be created for.
 * @param {Array} devicd An Array ofObject with informationabout the devices
 *      that the display / controls should operate on.
 * @param {function} onSuccess The optional callback to call after the controls
 *      have been rendered.
**/
function renderManyDeviceControls(registers, devices, onSuccess)
{
    var location = fs_facade.getExternalURI(MULTIPLE_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': registers, 'devices': devices},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(IO_CONFIG_PANE_SELECTOR).html(renderedHTML);
            $('.switch').bootstrapSwitch();

            if(onSuccess !== undefined)
                onSuccess();
        }
    );
}


function readInputs ()
{
    var deferred = q.defer();
    async.each(
        targetedDevices,
        function (device, callback) {
            var regs = $('.direction-switch-check:not(:checked)').map(
                function () { 
                    return parseInt(this.id.replace('-switch', ''));
                }
            ).get();
            var promise = device.readMany(regs, callback);
            promise.then(
                function (results) {
                    var numRegs = regs.length;
                    for (var i=0; i<numRegs; i++) {
                        var value = results[i];
                        var reg = regs[i];
                        var targetID = DISPLAY_SELECT_ID_TEMPLATE(
                            {
                                'deviceType': device.getDeviceType(),
                                'serial': device.getSerial(),
                                'register': reg
                            }
                        );

                        $(targetID).removeClass('inactive');
                        $(targetID).removeClass('active');
                        if (Math.abs(value - 1) < 0.1) {
                            $(targetID).html('high');
                            $(targetID).addClass('active');
                        } else {
                            $(targetID).html('low');
                            $(targetID).addClass('inactive');
                        }
                    }
                    callback();
                },
                callback
            );
        },
        function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            } 
        }
    );

    return deferred.promise;
}

function writeOutputs ()
{
    var deferred = q.defer();
    async.each(
        targetedDevices,
        function (device, callback) {
            var regs = $('.direction-switch-check:checked').map(
                function () { 
                    return parseInt(this.id.replace('-switch', ''));
                }
            ).get();
            var numRegs = regs.length;
            var addresses = [];
            var values = [];
            for (var i=0; i<numRegs; i++) {
                var reg = regs[i];
                var targetID = OUTPUT_SWITCH_TEMPLATE(
                    {'register': reg}
                );
                if($(targetID).is(":checked"))
                    values.push(1);
                else
                    values.push(0);
                addresses.push(reg);
            }
            if (addresses.length == 0) {
                deferred.resolve();
            } else {
                var promise = device.writeMany(addresses, values);
                promise.then(callback, callback);
            }
        },
        function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            } 
        }
    );

    return deferred.promise;
}


function readInputsWriteOutputs ()
{
    if (curTabID !== getActiveTabID()) {
        return;
    }

    writeOutputs().then(readInputs).then(function() {
        setTimeout(readInputsWriteOutputs, REFRESH_DELAY);
    });
}


function changeDIODir (event)
{
    var selectedSwitch = event.target.id;
    var targetID = selectedSwitch.replace('-switch', '');
    var targetIndicators = '.state-indicator-' + targetID;
    var targetOutputSwitch = '#' + targetID + '-output-switch';
    
    if ($(event.target).is(":checked")) {
        $(targetIndicators).slideUp(function () {
            $(targetOutputSwitch).parent().parent().slideDown();
            var numDevices = targetedDevices.length;
        });
    } else {
        $(targetOutputSwitch).parent().parent().slideUp(function () {
            $(targetIndicators).slideDown();
        });
    }
}


/**
 * Change the list of devices that are currently being manipulated.
 *
 * Change the list of devices that are currently being manipulated by this
 * digital I/O configuration module.
 *
 * @param {Array} devices An Array of Object with information about the
 *      registers that this module should manage for each device.
**/
function changeActiveDevices(registers)
{
    $(IO_CONFIG_PANE_SELECTOR).fadeOut(function(){
        var devices = [];
        var keeper = device_controller.getDeviceKeeper();

        $('.device-selection-checkbox:checked').each(function(){
            var serial = this.id.replace('-selector', '');
            devices.push(keeper.getDevice(serial));
        });

        var onRender = function() {
            $(IO_CONFIG_PANE_SELECTOR).fadeIn();
            targetedDevices = devices;
            setTimeout(readInputs, REFRESH_DELAY);
            $('.direction-switch-check').change(changeDIODir);
            $('.output-switch-check').parent().parent().hide();
        };
        
        if(devices.length == 1)
        {
            renderIndividualDeviceControls(registers, devices[0], onRender);
        }
        else
        {
            renderManyDeviceControls(registers, devices, onRender);
        }
    });
}


$('#digital-io-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();
    var currentDeviceSelector = DEVICE_SELECT_ID_TEMPLATE(
        {'serial': devices[0].getSerial()}
    );
    
    $(currentDeviceSelector).attr('checked', true);

    $(IO_CONFIG_PANE_SELECTOR).empty().append(
        $('<img>').attr('src', LOADING_IMAGE_SRC)
    );

    var registersSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
    fs_facade.getJSON(registersSrc, genericErrorHandler, function(registerData){
        renderIndividualDeviceControls(
            registerData,
            devices[0],
            function () { 
                $('.direction-switch-check').change(changeDIODir);
                $('.output-switch-check').parent().parent().hide();
            }
        );
        targetedDevices = [devices[0]];
        devices[0].write('FIO_DIRECTION', 0);
        setTimeout(readInputsWriteOutputs, REFRESH_DELAY);

        $('.device-selection-checkbox').click(function(){
            changeActiveDevices(registerData);
        });
    });
});
