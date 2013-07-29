/**
 * Controller for the device info inspector.
 *
 * Logic / controller for the device info inspector, a module that allows the
 * user to see basic device information.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var device_controller = require('./test_device_controller');

var DEVICE_DISPLAY_SRC = 'device_info_inspector/device_display.html';


/**
 * Show the information for a device.
 *
 * @param {Object} device Object with device information.
 * @parma {function} onSuccess The function to call after the device info is
 *      being displayed.
**/
function showDevice(device, onSuccess)
{
    var location = fs_facade.getExternalURI(DEVICE_DISPLAY_SRC);
    fs_facade.renderTemplate(
        location,
        {'device': device},
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#device-info-display').html(renderedHTML);
            $('#change-name-link').click(function(){
                $('#change-name-controls').slideDown();
            });

            $('#selected-device-display').html(device.getSerial());

            onSuccess();
        }
    );
}


/**
 * Show the information about a device given its serial number.
 *
 * @param {String} serial The serial number of the device to display information
 *      for.
**/
function showDeviceSerial(serial)
{
    var device = device_controller.getDeviceKeeper().getDevice(serial);
    if(device === null)
    {
        displayError('Could not load device info.');
        return;
    }

    $('#device-info-display').hide();
    showDevice(device, function(){$('#device-info-display').fadeIn();});
}


$('#device-info-inspector').ready(function(){
    // Attach event listener
    $('.device-selection-link').click(function(event){
        var serial = event.target.id.replace('-selector', '');
        showDeviceSerial(serial);
    });

    var devices = device_controller.getDeviceKeeper().getDevices();
    var device = devices[0];
    showDevice(device, function(){$('#device-info-display').fadeIn();});
});
