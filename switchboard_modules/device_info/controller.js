/**
 * Controller for the device info inspector.
 *
 * Logic / controller for the device info inspector, a module that allows the
 * user to see basic device information.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var device_controller = require('./device_controller');

var DEVICE_DISPLAY_SRC = 'device_info/device_display.html';
var DEVICE_NAME_DEFAULT_REGISTER = 60500
var NAME_MAX_LEN = 49


/**
 * Render a template with the information for a device.
 *
 * @param {Object} device Object with device information.
 * @param {Object} specialInfo Object with additional info about the connected
 *      model.
 * @param {function} onSuccess The function to call after the device info is
 *      being displayed.
**/
function showDevice(device, onSuccess)
{
    var location = fs_facade.getExternalURI(DEVICE_DISPLAY_SRC);
    var isPro = device.read('HARDWARE_INSTALLED') != 0;
    var templateValues = {
        'device': device,
        'firmware': device.getFirmwareVersion().toFixed(3),
        'bootloader': device.getBootloaderVersion().toFixed(3),
    };

    if (isPro) {
        templateValues.specialImageSuffix = '-pro';
        templateValues.specialText = ' Pro';
    }

    fs_facade.renderTemplate(
        location,
        templateValues,
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#device-info-display').html(renderedHTML);
            $('#change-name-link').click(function () {
                $('#change-name-controls').slideDown();
            });

            $('#change-name-button').click(function () {
                var newName = $('#new-name-input').val();
                changeDeviceName(device, newName);
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
    $('.device-selection-radio').first().prop('checked', true);
    $('.device-selection-radio').change(function(event){
        var serial = event.target.id.replace('-selector', '');
        showDeviceSerial(serial);
    });

    var devices = device_controller.getDeviceKeeper().getDevices();
    var device = devices[0];
    showDevice(device, function(){$('#device-info-display').fadeIn();});
});


function changeDeviceName (device, newName)
{
    newName = newName.replace('.', '');
    newName = newName.substr(0, 49);
    device.setName(newName);
    $('#current-name-display').html(newName);
    $('#change-name-controls').slideUp();
}


function getDeviceName (device)
{
    return device.read('DEVICE_NAME_DEFAULT');
}

