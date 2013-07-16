/**
 * Controller for the device info inspector.
 *
 * Logic / controller for the device info inspector, a module that allows the
 * user to see basic device information.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var device_controller = require('./test_device_controller');


/**
 * Show the information about a given device.
 *
 * @param {String} serial The serial number of the device to display information
 *      for.
**/
function showDevice(serial)
{
    var device = device_controller.getDeviceKeeper().getDevice(serial);
    if(device === null)
    {
        displayError('Could not load device info.');
        return;
    }

    $('#device-info-display').hide();
    $('#serial-number-display').html(device.getSerial());
    $('#type-display').html(device.getDeviceType());
    $('#firmware-display').html(device.getFirmwareVersion());
    $('#bootloader-display').html(device.getBootloaderVersion());
    $('#name-display').html(device.getName());
    $('#device-info-display').fadeIn();
}


$('#device-info-inspector').ready(function(){
    // Attach event listener
    $('#device-select').change(function(){
        showDevice($('#device-select').val());
    });
});