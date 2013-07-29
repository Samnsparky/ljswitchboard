/**
 * Logic for the analog input module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var q = require('q');

var fs_facade = require('./fs_facade');

var INPUTS_DATA_SRC = 'analog_inputs/inputs.json';
var RANGES_DATA_SRC = 'analog_inputs/ranges.json';
var RANGES_TEMPLATE_SRC = 'analog_inputs/range_options.html';
var INPUTS_TEMPLATE_SRC = 'analog_inputs/input_config.html';

var CONTROLS_MATRIX_SELECTOR = '#controls-matrix';
var RANGE_LISTS_SELECTOR = '.range-list';
var RANGE_LOADING_INDICATOR_SELECTOR = '#loading-ranges-display';


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
                $(RANGE_LISTS_SELECTOR).html(renderedHTML);
                $(RANGE_LOADING_INDICATOR_SELECTOR).fadeOut();

                deferred.resolve();
            }
        );

    });

    return deferred.promise;
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
                    $(CONTROLS_MATRIX_SELECTOR).fadeIn();

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
    
    if(selectedCheckboxes.length > 0)
        $('#configuration-pane').fadeIn();
}


$('#analog-inputs-configuration').ready(function(){
    loadInputs().then(loadRangeOptions).done();
    $('.device-selection-checkbox').click(changeSelectedDevices);
    $('.device-selection-checkbox').first().prop('checked', true);
    changeSelectedDevices();
});
