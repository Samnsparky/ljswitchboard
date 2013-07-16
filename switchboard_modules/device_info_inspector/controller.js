var device_controller = require('./test_device_controller');


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