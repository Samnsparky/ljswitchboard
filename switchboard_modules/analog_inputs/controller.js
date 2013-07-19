var RANGES_DATA_SRC = 'analog_inputs/ranges.json';
var RANGES_TEMPLATE_SRC = 'analog_inputs/range_options.html';


function displayRangeOptions(rangeInfo)
{
    var location = fs_facade.getExternalURI(INDIVIDUAL_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': registers},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(IO_CONFIG_PANE_SELECTOR).html(renderedHTML);
            $('.direction-switch').bootstrapSwitch();

            if(onSuccess !== undefined)
                onSuccess();
        }
    );
}


$('#analog-inputs-configuration').ready(function(){
    var rangesSrc = fs_facade.getExternalURI(RANGES_DATA_SRC);
    fs_facade.getJSON(rangesSrc, genericErrorHandler, displayRangeOptions);
});