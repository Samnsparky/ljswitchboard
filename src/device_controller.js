/**
 * Device controller that produces test devices.
 *
 * Device controller that produces test devices and simulates device
 * interactions.
 *
 * @author A. Samuel Pottinger (LabJack, 2013)
**/

var async = require('async');
var dict = require('dict');
var q = require('q');
var labjack_nodejs = require('labjack-nodejs');
var labjack_driver = new labjack_nodejs.driver();

var LJM_DT_T7 = labjack_nodejs.driver_const.LJM_DT_T7.toString();
var DEVICE_TYPE_NAMES = dict({
    '7': 'T7'
});

var CONNECT_TYPE_USB = 1;
var CONNECTION_TYPE_NAMES = dict({
    '1': 'USB',
    '3': 'Ethernet',
    '4': 'Wifi'
});


/**
 * Object with information about a device.
 *
 * @param {String} serial The serial number for the device.
 * @param {String} connectionType The type of connection used to communicate
 *      with the device. Examples include "USB", "Ethernet", and "WiFi".
 * @param {String} deviceType The type of model this device is. Examples include
 *      T7 and Digit-TL.
**/
var Device = function (device, serial, connectionType, deviceType)
{
    this.device = device;
    this.cachedName = null;

    /**
     * Get the serial number for this device.
     *
     * @return {String} The serial number for this device.
    **/
    this.getSerial = function () {
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
    this.getConnectionType = function () {
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
    this.getDeviceType = function () {
        return DEVICE_TYPE_NAMES.get(String(deviceType), 'Other');
    };

    /**
     * Get the user-assigned name for this device.
     *
     * Get the name of this device as assigned by a previous authorized user
     * (name not set by default).
     *
     * @return {String} The name of this device.
    **/
    this.getName = function () {
        if (this.cachedName === null)
            this.cachedName = this.device.readSync('DEVICE_NAME_DEFAULT');
        return this.cachedName;
    };

    // TODO
    this.getFirmwareVersion = function () {
        return this.device.readSync('FIRMWARE_VERSION');
    };

    // TODO
    this.getBootloaderVersion = function () {
        return this.device.readSync('BOOTLOADER_VERSION');
    };

    this.writeMany = function (addresses, values) {
        var deferred = q.defer();

        this.device.writeMany(
            addresses,
            values,
            function (err) {
                deferred.reject(err);
            },
            function (results) {
                deferred.resolve(results);
            }
        );

        return deferred.promise;
    };

    this.readMany = function (addresses) {
        var deferred = q.defer();

        this.device.readMany(
            addresses,
            function (err) {
                deferred.reject(err);
            },
            function (results) {
                deferred.resolve(results);
            }
        );

        return deferred.promise;
    };

    this.writeAsync = function(address, value) {
        var deferred = q.defer();

        this.device.write(
            address,
            value,
            function (err) {
                deferred.reject(err);
            },
            function (results) {
                deferred.resolve(results);
            }
        );

        return deferred.promise;
    };

    this.write = function (address, value) {
        this.device.writeSync(address, value);
    };

    this.read = function (address) {
        return this.device.readSync(address);
    };

    this.close = function (onError, onSuccess) {
        device.close(onError, onSuccess);
    };

    this.setName = function (newName) {
        this.write('DEVICE_NAME_DEFAULT', newName);
        this.cachedName = newName;
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


function openDeviceFromAttributes (deviceType, serialNumber, ipAddress,
    connectionType, onError, onSuccess)
{
    var device;
    if (connectionType == CONNECT_TYPE_USB) {
        device = new labjack_nodejs.device();
        device.open(
            deviceType,
            connectionType,
            String(serialNumber),
            onError,
            function () { onSuccess(device); }
        );
    } else {
        device = new labjack_nodejs.device();
        device.open(
            deviceType,
            connectionType,
            ipAddress,
            onError,
            function () { onSuccess(device); }
        );
    }
}


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


function getListingEntry (listingDict, device)
{
    var deviceType = String(device.deviceType);

    if (!listingDict.has(deviceType)) {
        listingDict.set(
            deviceType,
            {
                'name': DEVICE_TYPE_NAMES.get(deviceType, 'other'),
                'devices': []
            }
        );
    }

    return listingDict.get(deviceType);
}


function createDeviceListingRecord (device, name)
{
    var connectionType = CONNECTION_TYPE_NAMES.get(
        String(device.connectionType), 'other');
    var deviceType = DEVICE_TYPE_NAMES.get(String(device.deviceType), 'other');

    return {
        'serial': device.serialNumber,
        'connectionTypes': [connectionType],
        'origConnectionType': device.connectionType,
        'origDeviceType': device.deviceType,
        'type': deviceType,
        'name': name,
        'ipAddress': device.ipAddress,
        'ipSafe': device.ipAddress.replace(/\./g, '_')
    };
}


function openDeviceFromInfo (deviceInfo, connectionType, onError, onSuccess)
{
    openDeviceFromAttributes(
        deviceInfo.deviceType,
        deviceInfo.serialNumber,
        deviceInfo.ipAddress,
        connectionType,
        onError,
        onSuccess
    );
}


function finishDeviceRecord (listingDict, deviceInfo, callback)
{
    var listingEntry = getListingEntry(listingDict, deviceInfo);
    
    openDeviceFromInfo(
        deviceInfo,
        deviceInfo.connectionType,
        function () {callback();},
        function (device) {
            var name = device.readSync('DEVICE_NAME_DEFAULT');
            var record = createDeviceListingRecord(deviceInfo, name);
            listingEntry.devices.push(record);
            device.closeSync();
            callback();
        }
    );
}


var consolidateDevices = function (listing) {
    var existingDevice;
    var newDevice;
    var deviceListing = dict();
    var devices = listing.devices;
    var numDevices = devices.length;
    
    for (var i=0; i<numDevices; i++) {
        newDevice = devices[i];
        existingDevice = deviceListing.get(newDevice.serial.toString(), null);
        if (existingDevice !== null) {
            newDevice.connectionTypes.push.apply(
                newDevice.connectionTypes,
                existingDevice.connectionTypes
            );
        }
        deviceListing.set(newDevice.serial.toString(), newDevice);
    }

    var retList = [];
    deviceListing.forEach(function (value, key) {
        retList.push(value);
    });

    listing.devices = retList;
};


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
exports.getDevices = function (onError, onSuccess)
{
    labjack_driver.listAll(
        onError,
        function (driverListing) {
            var listingDict = dict();
            async.each(
                driverListing,
                function (deviceInfo, callback) {
                    finishDeviceRecord(listingDict, deviceInfo, callback);
                },
                function (err) {
                    if (err) {
                        alert(err);
                        return;
                    }
                    
                    var listing = [];
                    listingDict.forEach(function (value, key) {
                        listing.push(value);
                    });

                    for (var i=0; i<listing.length; i++)
                        consolidateDevices(listing[i]);
                    
                    listing = markConnectedDevices(listing);
                    onSuccess(listing);
                }
            );
        }
    );
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
exports.openDevice = function (serial, ipAddress, connType, deviceType, onError,
    onSuccess)
{
    openDeviceFromAttributes(
        deviceType,
        serial,
        ipAddress,
        connType,
        onError,
        function (innerDevice) {
            var device = new Device(innerDevice, serial, connType, deviceType);
            onSuccess(device);
        }
    );
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
    device.close(onError, function() {
        onSuccess(device);
    });
};
