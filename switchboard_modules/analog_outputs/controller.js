var sprintf = require('sprintf-js');

var CONFIG_PANE_SELECTOR = '#configuration-pane';
var OUTPUTS_TEMPLATE_SRC = 'analog_outputs/output_controls.html';
var OUTPUTS_DATA_SRC = 'analog_outputs/outputs.json';


function formatVoltageTooltip(value)
{
    return sprintf.sprintf("%.2f V", value);
}


function createSliders()
{
    $('.slider').slider({formater: formatVoltageTooltip, value: 0});
}


$('#analog-output-config').ready(function(){
    var templateLocation = fs_facade.getExternalURI(OUTPUTS_TEMPLATE_SRC);
    var outputsSrc = fs_facade.getExternalURI(OUTPUTS_DATA_SRC);

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