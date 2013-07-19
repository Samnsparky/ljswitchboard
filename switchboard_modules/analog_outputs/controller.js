var sprintf = require('sprintf-js');


function formatVoltageTooltip(value)
{
    return sprintf.sprintf("%.2f V", value);
}


$('#analog-output-config').ready(function(){
    $('.slider').slider({formater: formatVoltageTooltip, value: 0});
});