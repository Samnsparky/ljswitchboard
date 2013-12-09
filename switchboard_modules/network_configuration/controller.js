/**
 * Logic for a LabJack Switchboard module to update device network config.
 *
 * Logic for a LabJack Switchboard module to update device network configuration
 * settings.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var Long = require("long");

var DEVICE_SELECTOR_SRC = 'network_configuration/device_selector.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';
var HARDWARE_INSTALLED_REG = 60010;

var selectedDevice;


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
     * Determine if this device is currently connected.
     *
     * @return {Boolean} true if the device encapsulated by this decorator is
     *      currently connected. Returns false otherwise.
    **/
    this.getConnectionStatus = function()
    {
        return true;
    };

    this.getEthernetIPAddress = function()
    {
        return readIP(device.read('ETHERNET_IP_DEFAULT'));
    };

    this.getEthernetSubnet = function()
    {
        return readIP(device.read('ETHERNET_SUBNET_DEFAULT'));
    };

    this.getEthernetGateway = function()
    {
        return readIP(device.read('ETHERNET_GATEWAY_DEFAULT'));
    };

    this.getEthernetDHCPEnabled = function()
    {
        return device.read('ETHERNET_DHCP_ENABLE') > 0.1;
    };

    /**
     * Get the IP address of the device encapsulated by this decorator.
     *
     * @return {String} The IP address of the encapsulated device.
    **/
    this.getWiFiIPAddress = function()
    {
        return readIP(device.read('WIFI_IP_DEFAULT'));
    };

    /**
     * Get the name of the WiFi network this device is set to connect to.
     *
     * @return {String} Get the name of the WiFi network this device is
     *      set to connect to. This does not necessarily mean that this device
     *      is connected to that network.
    **/
    this.getWiFiNetwork = function()
    {
        return device.read('WIFI_SSID_DEFAULT');
    };

    /**
     * Get the password this device is set to use to connect to a WiFi network.
     *
     * @return {String} Get the password the device is set to use to connect
     *      to its preset network. Does not indicate if the device is actually
     *      connected to a WiFi network.
    **/
    this.getWiFiNetworkPassword = function()
    {
        return '12345678';
    };

    /**
     * Get the subnet this device is set to use.
     *
     * @return {String} IP address of subnet this device is set to connect to.
     *      Returns null if the device does not support network connection.
    **/
    this.getWiFiSubnet = function()
    {
        return readIP(device.read('WIFI_SUBNET_DEFAULT'));
    };

    this.getWiFiGateway = function()
    {
        return readIP(device.read('WIFI_GATEWAY_DEFAULT'));
    };

    this.getWiFiDHCPEnabled = function()
    {
        return device.read('WIFI_DHCP_ENABLE') > 0.1;
    };

    /**
     * Get the first default DNS server this device is set to use.
     *
     * @return {String} The IP address of first default DNS sever this device
     *      is set to use. Return null if the device does not support network
     *      connection.
    **/
    this.getDNS = function()
    {
        return readIP(device.read('ETHERNET_DNS_DEFAULT'));
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
        return readIP(device.read('ETHERNET_ALTDNS_DEFAULT'));
    };

    /**
     * Get the string description of this device's model type.
     *
     * @return {String} Description of the type of model this device is.
    **/
    this.getDeviceType = function()
    {
        return device.getDeviceType();
    };

    this.isEthernetEnabled = function()
    {
        return device.read('POWER_ETHERNET') > 0.1;
    };

    this.isWiFiEnabled = function()
    {
        return device.read('POWER_WIFI') > 0.1;
    };

    this.isPro = function()
    {
        return Math.abs(device.read(HARDWARE_INSTALLED_REG)) > 0.1;
    };

    this.setDefaultWiFiNetwork = function (newVal)
    {
        device.write('WIFI_SSID_DEFAULT', newVal);
    };

    this.setDefaultWiFiNetworkPassword = function (newVal)
    {
        device.write('WIFI_PASSWORD_DEFAULT', newVal);
    };

    this.setDefaultWiFiIPAddress = function (newVal)
    {
        device.write('WIFI_IP_DEFAULT', writeIP(newVal));
    };

    this.setDefaultWiFiSubnet = function (newVal)
    {
        device.write('WIFI_SUBNET_DEFAULT', writeIP(newVal));
    };

    this.setDefaultWiFiGateway = function (newVal)
    {
        device.write('WIFI_GATEWAY_DEFAULT', writeIP(newVal));
    };

    this.setDefaultDNS = function (newVal)
    {
        device.write('ETHERNET_DNS_DEFAULT', writeIP(newVal));
    };

    this.setDefaultAltDNS = function (newVal)
    {
        device.write('ETHERNET_ALTDNS_DEFAULT', writeIP(newVal));
    };

    this.setDefaultEthernetIPAddress = function (newVal)
    {
        device.write('ETHERNET_IP_DEFAULT', writeIP(newVal));
    };

    this.setDefaultEthernetSubnet = function (newVal)
    {
        device.write('ETHERNET_SUBNET_DEFAULT', writeIP(newVal));
    };

    this.setDefaultEthernetGateway = function (newVal)
    {
        device.write('ETHERNET_GATEWAY_DEFAULT', writeIP(newVal));
    };

    this.setEthernetDHCPEnable = function (newVal)
    {
        device.write('ETHERNET_DHCP_ENABLE_DEFAULT', newVal);
    };

    this.setWiFiDHCPEnable = function (newVal)
    {
        device.write('WIFI_DHCP_ENABLE_DEFAULT', newVal);
    };

    this.setPowerEthernet = function (newVal)
    {
        device.write('POWER_ETHERNET', newVal);
        device.write('POWER_ETHERNET_DEFAULT', newVal);
    };

    this.setPowerWiFi = function (newVal)
    {
        device.write('POWER_WIFI', newVal);
        device.write('POWER_WIFI_DEFAULT', newVal);
    };

    this.saveDefaultConfig = function ()
    {
        device.write('WIFI_APPLY_SETTINGS', 1);
    };

    this.device = device;
}


function readIP(target)
{
    var ipStr = '';
    ipStr += String(target >> 24 & 255);
    ipStr += ".";
    ipStr += String(target >> 16 & 255);
    ipStr += ".";
    ipStr += String(target >> 8 & 255);
    ipStr += ".";
    ipStr += String(target & 255);
    return ipStr;
}


function writeIP(target)
{
    var ipPieces = target.split('.').map(function (e) {
        return Number(e);
    });

    var retVal = 0;
    retVal = ipPieces[0] << 24 | retVal;
    retVal = ipPieces[1] << 16 | retVal;
    retVal = ipPieces[2] << 8 | retVal;
    retVal = ipPieces[3] | retVal;
    return (new Long(retVal, 0)).toNumber();
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
    if (device.isPro()) {
        $('#wifi-network-name-input').val(device.getWiFiNetwork());
        $('#wifi-network-password-input').val(device.getWiFiNetworkPassword());
        $('#wifi-ip-input').val(device.getWiFiIPAddress());
        $('#wifi-subnet-input').val(device.getWiFiSubnet());
        $('#wifi-gateway-input').val(device.getWiFiGateway());
    }

    $('#ethernet-ip-input').val(device.getEthernetIPAddress());
    $('#ethernet-subnet-input').val(device.getEthernetSubnet());
    $('#ethernet-gateway-input').val(device.getEthernetGateway());
    $('#default-dns-input').val(device.getDNS());
    $('#alt-dns-input').val(device.getAltDNS());

    configureForCurrentDeviceSettings(device);

    onSuccess();
}


function configureForCurrentDeviceSettings (device) 
{
    if (device.isPro()) {
        $('#wifi-note').hide();
    } else {
        $('#wifi-controls').hide();
        $('#wifi-advanced-controls').hide();
    }

    if (device.isEthernetEnabled()) {
        $('#ethernet-switch').prop('checked', true);
    } else {
        $('#ethernet-switch').prop('checked', false);
    }

    if (device.isWiFiEnabled()) {
        $('#wifi-switch').prop('checked', true);
    } else {
        $('#wifi-switch').prop('checked', false);
    }

    if (device.getEthernetDHCPEnabled()) {
        $('#ethernet-dhcp-switch').prop('checked', true);
        $('#ethernet-static-ip-settings').hide();
    } else {
        $('#ethernet-dhcp-switch').prop('checked', false);
        $('#ethernet-static-ip-settings').show();
    }

    if (device.getWiFiDHCPEnabled()) {
        $('#wifi-dhcp-switch').prop('checked', true);
        $('#wifi-static-ip-settings').hide();
    } else {
        $('#wifi-dhcp-switch').prop('checked', false);
        $('#wifi-static-ip-settings').show();
    }
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
    else if(selectedCheckboxes.length == 1)
        $('#multiple-device-note').hide();
    else
        $('#multiple-device-note').show();

    var keeper = device_controller.getDeviceKeeper();
    var deviceSerial = selectedCheckboxes[0].id.replace('-selector', '');
    var device = new DeviceNetworkAdapter(keeper.getDevice(deviceSerial));
    selectedDevice = device;

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
            $('.switch').bootstrapSwitch();
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
        $('.switch').bootstrapSwitch();
    });
}


function writeDefaultConfiguationValues(device)
{
    if (device.isPro()) {
        device.setDefaultWiFiNetwork($('#wifi-network-name-input').val());
        device.setDefaultWiFiNetworkPassword(
            $('#wifi-network-password-input').val());
        device.setDefaultWiFiIPAddress($('#wifi-ip-input').val());
        device.setDefaultWiFiSubnet($('#wifi-subnet-input').val());
        device.setDefaultWiFiGateway($('#wifi-gateway-input').val());

        if ($('#wifi-dhcp-switch').is(':checked')) {
            device.setWiFiDHCPEnable(1);
        } else {
            device.setWiFiDHCPEnable(0);
        }
        
        if($('#wifi-switch').is(':checked')) {
            device.setPowerWiFi(1);
        } else {
            device.setPowerWiFi(0);
        }
    }

    device.setDefaultDNS($('#default-dns-input').val());
    device.setDefaultAltDNS($('#alt-dns-input').val());
    device.setDefaultEthernetIPAddress($('#ethernet-ip-input').val());
    device.setDefaultEthernetSubnet($('#ethernet-subnet-input').val());
    device.setDefaultEthernetGateway($('#ethernet-gateway-input').val());

    if($('#ethernet-dhcp-switch').is(':checked')) {
        device.setEthernetDHCPEnable(1);
    } else {
        device.setEthernetDHCPEnable(0);
    }

    if ($('#ethernet-switch').is(':checked')) {
        device.setPowerEthernet(1);
    } else {
        device.setPowerEthernet(0);
    }

    device.saveDefaultConfig();
}


function writeConfigurationValues()
{
    $('#saved-indicator').hide();
    $('#save-indicator').slideDown();
    try {
        writeDefaultConfiguationValues(selectedDevice);
    }
    catch (e) {
        console.log(e);
    }
    $('#save-indicator').hide();
    $('#saved-indicator').slideDown();
    return false;
}


$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new DeviceNetworkAdapter(device);
    });

    var targetDevice = decoratedDevices[0];
    $('#advanced-settings').hide();
    $('#multiple-device-note').hide();
    $('#save-indicator').hide();
    $('#saved-indicator').hide();

    $('#update-button').click(writeConfigurationValues);

    $('#show-advanced-settings-link').click(function () {
        $('#advanced-settings-collapsed').hide(0, function () {
            $('#advanced-settings').slideDown();
        });
    });

    $('#ethernet-dhcp-switch').change(function () {
        if ($('#ethernet-dhcp-switch').is(':checked')) {
            $('#ethernet-static-ip-settings').slideUp();
        } else {
            $('#ethernet-static-ip-settings').slideDown();
        }
    });

    $('#wifi-dhcp-switch').change(function () {
        if ($('#wifi-dhcp-switch').is(':checked')) {
            $('#wifi-static-ip-settings').slideUp();
        } else {
            $('#wifi-static-ip-settings').slideDown();
        }
    });

    selectedDevice = targetDevice;
    if(decoratedDevices.length == 1)
        prepareIndividualDeviceConfiguration(decoratedDevices[0]);
    else
        prepareMultipleDeviceConfiguration(decoratedDevices);
});
