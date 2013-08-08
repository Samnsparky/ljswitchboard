/**
 * Device controller that produces test devices.
 *
 * Device controller that produces test devices and simulates device
 * interactions.
 *
 * @author A. Samuel Pottinger (LabJack, 2013)
**/

var dict = require('dict');


/**
 * Object with information about a device.
 *
 * @param {String} serial The serial number for the device.
 * @param {String} connectionType The type of connection used to communicate
 *      with the device. Examples include "USB", "Ethernet", and "WiFi".
 * @param {String} deviceType The type of model this device is. Examples include
 *      T7 and Digit-TL.
**/
var Device = function(serial, connectionType, deviceType)
{
    /**
     * Get the serial number for this device.
     *
     * @return {String} The serial number for this device.
    **/
    this.getSerial = function()
    {
        return serial;
    };

    /**
     * Get the type of connection being used to communicate with this device.
     *
     * Get the type of connection being used to communicate with this device.
     * Examples include "USB", "Ethernet", and "WiFi".
     *
     * @return {String} The type of connection being used to communicate with
     *      this device.
    **/
    this.getConnectionType = function()
    {
        return connectionType;
    };

    /**
     * Get the type of model this device is.
     *
     * Get a String describing what kind of device this is. Examples include
     * "T7" and "Digit-TL".
     *
     * @return {String} A description of the type of device this is.
    **/
    this.getDeviceType = function()
    {
        return deviceType;
    };

    /**
     * Get the user-assigned name for this device.
     *
     * Get the name of this device as assigned by a previous authorized user
     * (name not set by default).
     *
     * @return {String} The name of this device.
    **/
    this.getName = function()
    {
        return name;
    };

    // TODO
    this.getFirmwareVersion = function()
    {
        return '1.23';
    };

    // TODO
    this.getBootloaderVersion = function()
    {
        return '4.56';
    };

    // TODO
    this.getName = function()
    {
        return 'test device';
    };
};


// TODO: Cannot rely on serial number alone.
// TODO: This should be in a seperate module.
/**
 * A record keeper that holds a list of devices.
 *
 * A record keeper that holds a list of devices. Example usages include holding
 * a list of devices that are currently open.
**/
function DeviceKeeper()
{
    var devices = dict();

    /**
     * Add a new device to this keeper.
     *
     * @param {Device} device The device to add to this keeper.
    **/
    this.addDevice = function(device)
    {
        devices.set(device.getSerial(), device);
    };

    /**
     * Deermine how many devices this keeper has in it.
     *
     * @return {Number} The number of devices this keeper currently has in it.
    **/
    this.getNumDevices = function()
    {
        return devices.size;
    };

    /**
     * Remove a device from this keeper.
     *
     * @param {Device} device The device or equivalent device to remove from
     *      this keeper. The device removed from the keeper will be the one with
     *      the same serial number.
    **/
    this.removeDevice = function(device)
    {
        if(devices.has(device.getSerial()))
            devices.delete(device.getSerial());
    };

    /**
     * Get a device from this keeper.
     *
     * Get a device from this keeper based on a serial number. Will return null
     * if the device is not in this keeper.
     *
     * @return {Device} The device with the given serial number of null if no
     *      device by that serial number is in this keeper.
    **/
    this.getDevice = function(serial)
    {
        if(devices.has(serial))
            return devices.get(serial);
        else
            return null;
    };

    this.getDevices = function()
    {
        var retList = [];
        devices.forEach(function(value, key) {retList.push(value);});
        return retList;
    };

    this.getDeviceSerials = function()
    {
        var retList = [];
        devices.forEach(function(value, key) {retList.push(key);});
        return retList;
    };
}


var deviceKeeperInstance = null;

/**
 * Get the device keeper singlton instance maintaining the list of open devices.
 *
 * @return {DeviceKeeper} The device keeper used system wide that maintains a
 *      list of all open devices.
**/
exports.getDeviceKeeper = function()
{
    if(deviceKeeperInstance === null)
        deviceKeeperInstance = new DeviceKeeper();
    return deviceKeeperInstance;
};


function markConnectedDevices(devices)
{
    var devicesOfType;
    var device;

    var connectedSerials = exports.getDeviceKeeper().getDeviceSerials();

    var devicesLen = devices.length;
    for(var i=0; i<devicesLen; i++)
    {
        devicesOfType = devices[i].devices;
        var devicesOfTypeLen = devicesOfType.length;
        for(var j=0; j<devicesOfTypeLen; j++)
        {
            device = devicesOfType[j];
            device.connected = connectedSerials.indexOf(device.serial) != -1;
        }
    }
    return devices;
}


/**
 * Get a list of devices currently visible by to this computer.
 *
 * @param {function} onError The funciton to call if an error is encountered.
 * @param {function} onSuccess The function to call after the list of devices
 *      has been collected.
 * @return {Array} An Array of Objects with the keys "name" and "devices". The
 *      value of "name" is a String with the name of the device type (ex: "T7").
 *      The value of "devices" is a list of Objects with the keys "serial",
 *      "connectionTypes", "type", and "name".
**/
exports.getDevices = function(onError, onSuccess)
{
    var data = [
        {
            'name': 'T7',
            'devices': [
                {
                    'serial': '1234567891',
                    'connectionTypes': ['USB'],
                    'type': 'T7',
                    'name': 'Test Device 1'
                },
                {
                    'serial': '1234567894',
                    'connectionTypes': ['USB'],
                    'type': 'T7',
                    'name': 'Test Device 4'
                },
                {
                    'serial': '1234567893',
                    'connectionTypes': ['USB', 'WiFi'],
                    'type': 'T7',
                    'name': 'Test Device 3'
                },
                {
                    'serial': '1234567801',
                    'connectionTypes': ['Ethernet'],
                    'type': 'T7',
                    'name': 'Test Device 4'
                },
                {
                    'serial': '1234567802',
                    'connectionTypes': ['WiFi'],
                    'type': 'T7',
                    'name': 'Test Device 5'
                },
                {
                    'serial': '1234567803',
                    'connectionTypes': ['USB', 'WiFi'],
                    'type': 'T7',
                    'name': 'Test Device 6'
                }
            ]
        },
        {
            'name': 'Digit-TL',
            'devices': [
                {
                    'serial': '9234567803',
                    'connectionTypes': ['USB'],
                    'type': 'digit-tl',
                    'name': 'Test Digit'
                }
            ]
        }
    ];

    data = markConnectedDevices(data);
    onSuccess(data);
};


/**
 * Open a connection to a device.
 *
 * @param {String} serial The serial number of the device to open.
 * @param {String} connType The type of connection to open to the device.
 *      Examples include "USB", "Ethernet", and "WiFi".
 * @param {String} deviceType The type of device that should be opened. Examples
 *      include "T7" and "Digit-TL".
 * @param {function} onError The function to call if an error is encountered.
 * @param {function} onSuccess The function to call afte the device has been
 *      successfully opened.
**/
exports.openDevice = function(serial, connType, deviceType, onError, onSuccess)
{
    var device = new Device(serial, connType, deviceType);
    window.setTimeout(function(){onSuccess(device);}, 2000);
};


/**
 * Close the connection to a device.
 *
 * @param {Device} device The device to close the connection to.
 * @param {function} onSuccess The function to call after the connection to the
 *      device is successfully closed.
 * @param {function} onError The function to call if an error is encountered
 *      while trying to close a device.
**/
exports.closeDevice = function(device, onSuccess, onError)
{
     window.setTimeout(function(){onSuccess(device);}, 2000);
};
