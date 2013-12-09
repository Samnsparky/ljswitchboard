/**
 * Logic for the analog input module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var handlebars = require('handlebars');
var q = require('q');

var fs_facade = require('./fs_facade');

var INPUTS_DATA_SRC = 'analog_inputs/inputs.json';
var RANGES_DATA_SRC = 'analog_inputs/ranges.json';
var RANGES_TEMPLATE_SRC = 'analog_inputs/range_options.html';
var INPUTS_TEMPLATE_SRC = 'analog_inputs/input_config.html';

var CONTROLS_MATRIX_SELECTOR = '#controls-matrix';
var RANGE_LISTS_SELECTOR = '.range-list';
var RANGE_LOADING_INDICATOR_SELECTOR = '#loading-ranges-display';
var selectedDevices = [];
var devices = [];
var targetInputsInfo;

var INPUT_DISPLAY_TEMPLATE_STR = '#input-display-{{valueRegister}}';
var INPUT_BAR_TEMPLATE_STR = '#input-bar-{{valueRegister}}';
var RANGE_DISPLAY_TEMPLATE_STR = '#input-display-{{rangeRegister}}';

var INPUT_DISPLAY_TEMPLATE = handlebars.compile(
    INPUT_DISPLAY_TEMPLATE_STR);
var INPUT_BAR_TEMPLATE = handlebars.compile(
    INPUT_BAR_TEMPLATE_STR);
var RANGE_DISPLAY_TEMPLATE = handlebars.compile(
    RANGE_DISPLAY_TEMPLATE_STR);


function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

// TODO: Select ranges based on device type
/**
 * Load information about the available analog input ranges available.
 *
 * Load information about the various analog input ranges that are available
 * for the given device's analog inputs.
 * 
 * @return {q.promise} Promise for this operation. Resolves to undefined.
**/
function loadRangeOptions()
{
    var deferred = q.defer();
    var templateLocation = fs_facade.getExternalURI(RANGES_TEMPLATE_SRC);
    var rangesSrc = fs_facade.getExternalURI(RANGES_DATA_SRC);

    fs_facade.getJSON(rangesSrc, genericErrorHandler, function(rangeInfo){

        fs_facade.renderTemplate(
            templateLocation,
            {'ranges': rangeInfo},
            genericErrorHandler,
            function(renderedHTML)
            {
                $(RANGE_LISTS_SELECTOR).each(function (index, e) {
                    var reg = e.id.replace('-select', '');
                    $(e).html(replaceAll('HOLD', reg, renderedHTML));
                });
                $(RANGE_LOADING_INDICATOR_SELECTOR).fadeOut();

                $('.range-selector').click(function (event) {
                    var pieces = event.target.id.replace('-range-selector', '').split('-');
                    console.log(event.target.id);
                    rangeVal = parseFloat(pieces[0]);
                    if (pieces[1] == '') {
                        var numInputs = targetInputsInfo.length;
                        for (var i=0; i<numInputs; i++)
                        {
                            setRange(
                                targetInputsInfo[i].range_register,
                                rangeVal
                            );
                        }
                    } else {
                        rangeReg = parseInt(pieces[1]);
                        setRange(rangeReg, rangeVal);
                    }
                });

                deferred.resolve();
            }
        );

    });

    return deferred.promise;
}


function extendReadMany (device, results, registers)
{
    return function () {
        var deferred = q.defer();

        device.readMany(registers).then(function (subResults) {
            results.push.apply(results, subResults);
            deferred.resolve();
        },
        function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    };
}


function setRange (rangeAddr, range)
{
    var device = selectedDevices[0];
    device.write(rangeAddr, range);

    var text;
    if (Math.abs(range - 10) < 0.001)
        text = '-10 to 10V';
    else if (Math.abs(range - 1) < 0.001)
        text = '-1 to 1V';
    else if (Math.abs(range - 0.1) < 0.001)
        text = '-0.1 to 0.1V';
    else if (Math.abs(range - 0.01) < 0.001)
        text = '-0.01 to 0.01V';

    var selector  = RANGE_DISPLAY_TEMPLATE({rangeRegister: rangeAddr});
    $(selector).html(text);
}


function readRangesAndStartReadingInputs (inputsInfo)
{
    var device = selectedDevices[0];
    targetInputsInfo = inputsInfo;
    var registers = inputsInfo.map(function (e) {
        return e.range_register;
    });
    var registersSets = [
        registers.slice(0, 8),
        registers.slice(8, 17)
    ];
    var results = [];
    extendReadMany(device, results, registersSets[0])()
    .then(extendReadMany(device, results, registersSets[1]))
    .then(
        function () {
            var numResults = results.length;
            for (var i=0; i<numResults; i++) {
                var regNum = registers[i];
                var value = results[i];
                var text = 'unknown';

                if (Math.abs(value - 10) < 0.001)
                    text = '-10 to 10V';
                else if (Math.abs(value - 1) < 0.001)
                    text = '-1 to 1V';
                else if (Math.abs(value - 0.1) < 0.001)
                    text = '-0.1 to 0.1V';
                else if (Math.abs(value - 0.01) < 0.001)
                    text = '-0.01 to 0.01V';

                var selector  = RANGE_DISPLAY_TEMPLATE({rangeRegister: regNum});
                $(selector).html(text);
            }
            setTimeout(function () {
                updateInputs(inputsInfo);
            }, 1000);
        },
        function (err) {
            console.log(err);
            setTimeout(function () {
                updateInputs(inputsInfo);
            }, 1000);
        }
    );
}


function updateInputs (inputsInfo) {
    var device = selectedDevices[0];
    var registers = inputsInfo.map(function (e) {
        return e.value_register;
    });
    var registersSets = [
        registers.slice(0, 8),
        registers.slice(8, 17)
    ];
    var results = [];
    extendReadMany(device, results, registersSets[0])()
    .then(extendReadMany(device, results, registersSets[1]))
    .then(
        function () {
            var numResults = results.length;
            for (var i=0; i<numResults; i++) {
                var regNum = registers[i];
                var value = results[i];
                var selector = INPUT_DISPLAY_TEMPLATE({valueRegister: regNum});
                var barSelect = INPUT_BAR_TEMPLATE({valueRegister: regNum});
                var width = 100 * ((value + 10) / 20);
                
                if (width > 100)
                    width = 100;
                if (width < 0)
                    width = 0;

                $(selector).html(value.toFixed(6));
                $(barSelect).css('width', String(width) + 'px');
            }
            setTimeout(function () {
                updateInputs(inputsInfo);
            }, 1000);
        },
        function (err) {
            console.log(err);
            setTimeout(function () {
                updateInputs(inputsInfo);
            }, 1000);
        }
    );
}


/**
 * Load the list of inputs for the given device.
 *
 * @return {q.promise} A Q promise that resolves to undefined.
**/
function loadInputs()
{
    var deferred = q.defer();
    var templateLocation = fs_facade.getExternalURI(INPUTS_TEMPLATE_SRC);
    var inputsSrc = fs_facade.getExternalURI(INPUTS_DATA_SRC);

    fs_facade.getJSON(inputsSrc, genericErrorHandler, function(inputsInfo){
        fs_facade.renderTemplate(
            templateLocation,
            {'inputs': inputsInfo},
            genericErrorHandler,
            function(renderedHTML)
            {
                $(CONTROLS_MATRIX_SELECTOR).hide(function(){
                    $(CONTROLS_MATRIX_SELECTOR).html(renderedHTML);
                    $(CONTROLS_MATRIX_SELECTOR).fadeIn(function () {
                        readRangesAndStartReadingInputs(inputsInfo);
                    });

                    deferred.resolve();
                });
            }
        );
    });

    return deferred.promise;
}


/**
 * Event handler for when the selected list of devices is changed.
 *
 * Event handler for changes in the selected list of devices. This collection
 * indicates which devices have AIN inputs being manipulated by this module.
**/
function changeSelectedDevices()
{
    var selectedCheckboxes = $('.device-selection-checkbox:checked');
    $('#configuration-pane').hide();

    selectedDevices = $('.device-selection-checkbox:checked').map(
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
    
    if(selectedCheckboxes.length > 0) {
        $('#configuration-pane').fadeIn();
    } else {
        // TODO: Redraw bug
        document.body.style.display='none';
        document.body.offsetHeight;
        document.body.style.display='block';
    }
}


$('#analog-inputs-configuration').ready(function(){
    loadInputs().then(loadRangeOptions).done();
    $('.device-selection-checkbox').click(changeSelectedDevices);
    $('.device-selection-checkbox').first().prop('checked', true);

    var keeper = device_controller.getDeviceKeeper();
    devices = keeper.getDevices();

    changeSelectedDevices();
});
