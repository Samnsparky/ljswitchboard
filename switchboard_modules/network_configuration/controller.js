var DEVICE_SELECTOR_SRC = 'network_configuration/device_selector.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';


function DeviceNetworkAdapter(device)
{
    this.getSerial = function()
    {
        return device.getSerial();
    };

    this.getName = function()
    {
        return device.getName();
    };

    this.getIPAddress = function()
    {
        return '192.168.0.1';
    };

    this.getConnectionStatus = function()
    {
        return true;
    };

    this.getNetwork = function()
    {
        return 'testnetwork';
    };

    this.getNetworkPassword = function()
    {
        return 'testnetworkpassword';
    };

    this.getSubnet = function()
    {
        return '255.255.255.0';
    };

    this.getDefaultDNS = function()
    {
        return '8.8.8.8';
    };

    this.getAltDNS = function()
    {
        return '8.8.4.4';
    };
}


function showCurrentDeviceSettings(device, onError, onSuccess)
{
    $('#network-name-input').val(device.getNetwork());
    $('#network-password-input').val(device.getNetworkPassword());
    $('#default-ip-input').val(device.getIPAddress());
    $('#default-subnet-input').val(device.getSubnet());
    $('#default-dns-input').val(device.getDefaultDNS());
    $('#alt-dns-input').val(device.getAltDNS());

    onSuccess();
}


function onChangeSelectedDevices()
{
    $('#device-configuration-pane').hide();

    var selectedCheckboxes = $('.device-selection-checkbox:checked');
    if(selectedCheckboxes.length == 0)
        return;

    var keeper = device_controller.getDeviceKeeper();
    var deviceSerial = selectedCheckboxes[0].id.replace('-selector', '');
    var device = new DeviceNetworkAdapter(keeper.getDevice(deviceSerial));

    showCurrentDeviceSettings(device, genericErrorHandler, function(){
        $('#device-configuration-pane').fadeIn();
    });
}


function prepareMultipleDeviceConfiguration(decoratedDevices)
{
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
}


function prepareIndividualDeviceConfiguration(decoratedDevice)
{
    showCurrentDeviceSettings(decoratedDevice, genericErrorHandler, function(){
        $('#device-configuration-pane').show();
    });
}


$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new DeviceNetworkAdapter(device);
    });

    if(decoratedDevices.length == 1)
        prepareIndividualDeviceConfiguration(decoratedDevices[0]);
    else
        prepareMultipleDeviceConfiguration(decoratedDevices);
});
