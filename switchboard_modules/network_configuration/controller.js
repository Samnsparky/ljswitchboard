/**
 * Logic for a LabJack Switchboard module to update device network config.
 *
 * Logic for a LabJack Switchboard module to update device network configuration
 * settings.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var DEVICE_SELECTOR_SRC = 'network_configuration/device_selector.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';


/**
 * Wrapper around a device that makes reading and changing network config easy.
 *
 * Wrapper around a device that makes reading and changing network configuration
 * settings easier.
 *
 * @param {Object} device The device to decorate / adapt.
**/
function DeviceNetworkAdapter(device)
{
    /**
     * Get the serial number of the device encapsulated by this decorator.
     *
     * @return {String} The serial number of the encapsulated device.
    **/
    this.getSerial = function()
    {
        return device.getSerial();
    };

    /**
     * Get the name of the device encapsulated by this decorator.
     *
     * @return {String} The name of the encapsulated device.
    **/
    this.getName = function()
    {
        return device.getName();
    };

    /**
     * Get the IP address of the device encapsulated by this decorator.
     *
     * @return {String} The IP address of the encapsulated device.
    **/
    this.getIPAddress = function()
    {
        return '192.168.0.1';
    };

    /**
     * Determine if this device is currently connected.
     *
     * @return {Boolean} true if the device encapsulated by this decorator is
     *      currently connected. Returns false otherwise.
    **/
    this.getConnectionStatus = function()
    {
        return true;
    };

    /**
     * Get the name of the WiFi network this device is set to connect to.
     *
     * @return {String} Get the name of the WiFi network this device is
     *      set to connect to. This does not necessarily mean that this device
     *      is connected to that network. Will return null if this device
     *      does not support WiFi connection.
    **/
    this.getNetwork = function()
    {
        return 'testnetwork';
    };

    /**
     * Get the password this device is set to use to connect to a WiFi network.
     *
     * @return {String} Get the password the device is set to use to connect
     *      to its preset network. Does not indicate if the device is actually
     *      connected to a WiFi network. Returns null if this device does not
     *      support WiFi connection.
    **/
    this.getNetworkPassword = function()
    {
        return 'testnetworkpassword';
    };

    /**
     * Get the subnet this device is set to use.
     *
     * @return {String} IP address of subnet this device is set to connect to.
     *      Returns null if the device does not support network connection.
    **/
    this.getSubnet = function()
    {
        return '255.255.255.0';
    };

    /**
     * Get the first default DNS server this device is set to use.
     *
     * @return {String} The IP address of first default DNS sever this device
     *      is set to use. Return null if the device does not support network
     *      connection.
    **/
    this.getDefaultDNS = function()
    {
        return '8.8.8.8';
    };

    /**
     * Get the backup / alternative DNS server this device is set to use.
     *
     * @return {String} The IP address of the DNS server this device is set to
     *      connect to if the first DNS server is unreachable. Returns null
     *      if the device does not support network connection.
    **/
    this.getAltDNS = function()
    {
        return '8.8.4.4';
    };

    /**
     * Get the string description of this device's model type.
     *
     * @return {String} Description of the type of model this device is.
    **/
    this.getDeviceType = function()
    {
        return device.getDeviceType();
    }
}


/**
 * Populate the network configuration controls with a device's current values.
 *
 * Populate the network configuration GUI controls with the corresponding values
 * that a given device currently has for its network configuration settings.
 *
 * @param {Object} device The DeviceNetworkAdapater to get the values from.
 * @param {function} onError The function to call if an error is encountered
 *      during population.
 * @param {function} onSuccess The function to call after the fields are
 *      popualted.
**/
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


/**
 * Handler for when a device is select / unselected for configuration.
**/
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


/**
 * Prepare the UI and event listeners for managing multiple devices.
 *
 * Prepare and show the more complex UI necessary for managing / configuring
 * multiple devices.
 *
 * @param {Array} decoratedDevices Array of DeviceNetworkAdapters for the
 *      devices that this module should configure.
**/
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
            $('.device-selection-checkbox').first().prop('checked', true);
            onChangeSelectedDevices();
        }
    );
}


/**
 * Prepare the UI and event listeners for managing a single device.
 *
 * Prepare and show a simplier UI with controls needed for managing /
 * configuring a single device.
 *
 * @param {Object} decoratedDevice The DeviceNetworkAdapater for the device this
 *      module will be responsible for managing / configuring.
**/
function prepareIndividualDeviceConfiguration(decoratedDevice)
{
    showCurrentDeviceSettings(decoratedDevice, genericErrorHandler, function(){
        $('#device-configuration-pane').css('display', 'inline');
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
