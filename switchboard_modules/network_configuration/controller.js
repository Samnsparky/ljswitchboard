var DEVICE_SELECTOR_SRC = 'network_configuration/device_selector.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-configuration-pane';


function DeviceNetworkAdapter(device)
{
    this.getSerial = function()
    {
        return device.getSerial();
    }
    this.getName = function()
    {
        return device.getName();
    }
    this.getIPAddress = function()
    {
        return '192.168.0.1';
    }
    this.getConnectionStatus = function()
    {
        return true;
    }
    this.getNetwork = function()
    {
        return 'testnetwork';
    }
}


$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new DeviceNetworkAdapter(device);
    });

    var location = fs_facade.getExternalURI(DEVICE_SELECTOR_SRC);
    fs_facade.renderTemplate(
        location,
        {'devices': decoratedDevices},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(DEVICE_SELECTOR_PANE_SELECTOR).html(renderedHTML);
        }
    );
});