var DEVICE_SELECTOR_SRC = 'device_updater/device_selector.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';


function UpgradeableDeviceAdapter(device)
{
    this.getSerial = function()
    {
        return device.getSerial();
    };

    this.getName = function()
    {
        return device.getName();
    };

    this.getFirmwareVersion = function()
    {
        return '1.23';
    };

    this.getBootloaderVersion = function()
    {
        return '2.34';
    }
}


function onChangeSelectedDevices()
{
    var selectedCheckboxes = $('.device-selection-checkbox:checked');
    if(selectedCheckboxes.length == 0)
        $('#device-configuration-pane').fadeOut();
    else
        $('#device-configuration-pane').fadeIn();
}


$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new UpgradeableDeviceAdapter(device);
    });

    var location = fs_facade.getExternalURI(DEVICE_SELECTOR_SRC);
    fs_facade.renderTemplate(
        location,
        {'devices': decoratedDevices},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(DEVICE_SELECTOR_PANE_SELECTOR).html(renderedHTML);
            $('.device-selection-checkbox').click(onChangeSelectedDevices);
        }
    );
});
