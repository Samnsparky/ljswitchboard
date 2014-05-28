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
var device_selector_view_gen = require('./device_selector_view_gen');
var labjack_driver = new labjack_nodejs.driver();

var LJM_DT_T7 = labjack_nodejs.driver_const.LJM_DT_T7.toString();
var DEVICE_TYPE_NAMES = dict({
    '3': 'U3',
    '6': 'U6',
    '7': 'T7',
    '9': 'UE9',
    '200': 'Digit'
});
var DRIVER_DEVICE_TYPE_NAMES = dict({
    '3': 'LJM_dtU3',
    '6': 'LJM_dtU6',
    '7': 'LJM_dtT7',
    '9': 'LJM_dtUE9',
    '200': 'LJM_dtDIGIT'
});

var DEVICE_TYPE_NAMES_BY_DRIVER_NAME = dict({
    'LJM_dtU3': 'U3',
    'LJM_dtU6': 'U6',
    'LJM_dtT7': 'T7',
    'LJM_dtUE9': 'UE9',
    'LJM_dtDIGIT': 'Digit'
})

var CONNECT_TYPE_USB = 1;
var CONNECTION_TYPE_NAMES = dict({
    '0': 'Any',
    '1': 'USB',
    '2': 'TCP',
    '3': 'Ethernet',
    '4': 'Wifi'
});
var DRIVER_CONNECTION_TYPE_NAMES = dict({
    '0': 'LJM_ctANY',
    '1': 'LJM_ctUSB',
    '2': 'LJM_ctTCP',
    '3': 'LJM_ctETHERNET',
    '4': 'LJM_ctWIFI'
});

var SCAN_REQUEST_LIST = [
    {
        'deviceType': 'LJM_dtT7',
        'connectionType': 'LJM_ctANY',
        'addresses': [
            'DEVICE_NAME_DEFAULT',
            'HARDWARE_INSTALLED',
            'ETHERNET_IP',
            'WIFI_STATUS',
            'WIFI_IP',
            'WIFI_RSSI'
        ]
    },
    {
        'deviceType': 'LJM_dtDIGIT',
        'connectionType': 'LJM_ctUSB',
        'addresses': ['DEVICE_NAME_DEFAULT','DGT_INSTALLED_OPTIONS']
    }
];
var DEVICE_ENABLED_LIST = dict({
    'U3': false,
    'U6': false,
    'T7': true,
    'UE9': false,
    'Digit': false
});
var WIFI_RSSI_IMAGES = [
    {'val':-30,'img':'wifiRSSI-4'},
    {'val':-40,'img':'wifiRSSI-3'},
    {'val':-50,'img':'wifiRSSI-2'},
    {'val':-60,'img':'wifiRSSI-1'},
    {'val':-70,'img':'wifiRSSI-0'},
    {'val':-200,'img':'wifiRSSI-0'},
];
var WIFI_STATUS_DISPLAY_DATA = {
    2900: {'display':true,'str':'Associated'},
    2901: {'display':true,'str':'Associating'},
    2902: {'display':true,'str':'Association Failed'},
    2903: {'display':false,'str':'Un-Powered'},
    2904: {'display':true,'str':'Booting Up'},
    2905: {'display':true,'str':'Could Not Start'},
    2906: {'display':true,'str':'Applying Settings'},
    2907: {'display':true,'str':'DHCP Started'},
    2908: {'display':true,'str':'Unknown'},
    2909: {'display':true,'str':'Other'}
};

var NUM_SCAN_RETRIES = 4;
var LIST_ALL_SCAN_RETRY_ERROR = 1233;

exports.labjack_nodejs = labjack_nodejs;
exports.driver_const = labjack_nodejs.driver_const;
exports.ljm_driver = labjack_driver;

var GET_SUBCLASS_FUNCTIONS = {};

GET_SUBCLASS_FUNCTIONS['T7'] = function (device) {
    var subclass = null;
    return function () {
        if (subclass === null) {
            if(device.read('HARDWARE_INSTALLED'))
                subclass = 'Pro';
            else
                subclass = '';
        }

        return subclass;
    }
};
GET_SUBCLASS_FUNCTIONS['Digit'] = function (device) {
    var subclass = null;
    return function () {
        if (subclass === null) {
            var digitHardware = device.read('HARDWARE_INSTALLED');
            console.log('Digit HARDWARE_INSTALLED',digitHardware)
            if(digitHardware)
                subclass = 'YES';
            else
                subclass = 'idk';
        }

        return subclass;
    }
}


/**
 * Object with information about a device.
 *
 * @param {labjack-nodejs.Device} device The device object to decorate for use
 *      with Switchboard.
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
    this.cachedFirmware = null;

    this.getSubclass = GET_SUBCLASS_FUNCTIONS[DEVICE_TYPE_NAMES.get(deviceType.toString())](this);

    this.invalidateCache = function() {
        this.cachedName = null;
        this.cachedFirmware = null;
    }
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

    this.getConnectionTypeStr = function () {
        return DRIVER_CONNECTION_TYPE_NAMES.get(this.getConnectionType().toString());
    };

    /**
     * Get the type of model this device is.
     *
     * Get a String describing what kind of device this is. Examples include
     * "T7" and "Digit-TL".
     *
     * @return {String} A description of the type of device this is. Defaults to
     *      'other' if the device type could not be decoded.
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

    /**
     * Get the version of firmware installed on this device.
     *
     * @return {float} The version of the firmware on this device.
     * @throws Exceptions thrown from the labjack-nodejs and lower layers.
    **/
    this.getFirmwareVersion = function () {
        if (!this.cachedFirmware)
            this.cachedFirmware = this.device.readSync('FIRMWARE_VERSION');
        return this.cachedFirmware;
    };

    /**
     * Get the version of the bootloader installed on this device.
     *
     * @return {float} The version of the bootloader on this device.
     * @throws Exceptions thrown from the labjack-nodejs and lower layers.
    **/
    this.getBootloaderVersion = function () {
        return this.device.readSync('BOOTLOADER_VERSION');
    };

    /**
     * This function writes an array of values to a single address.  It is
     * created using the LJM_eNames and LJM_eAddresses functions to maintain
     * backward compatability so kipling can be used with old versions of the
     * LJM driver wich is commonly required for testing devices.  A newer
     * native function does exist in LJM to do this same thing.
     *
     * @param  {number/string} address The address/register number to write all
     *       values to.
     * @param  {Array} values  The array of data to write to the device.
     * @return {[type]}         [description]
     */
    this.writeArray = function(address, values) {
        var addresses = [];
        var directions = [];
        var numValues = [];

        addresses.push(address);
        directions.push(1);
        numValues.push(values.length);

        return this.rwMany(addresses, directions, numValues, values);
    }
    this.qWriteArray = function(address, values) {
        // console.log('Writing Array:',values);
        return this.writeArray(address, values);
    }

    /**
     * This function writes an array of values to a single address.  It is
     * created using the LJM_eNames and LJM_eAddresses functions to maintain
     * backward compatability so kipling can be used with old versions of the
     * LJM driver wich is commonly required for testing devices.  A newer
     * native function does exist in LJM to do this same thing.
     *
     * @param  {number/string} address The address/register number to write all
     *       values to.
     * @param  {Array} values  The array of data to write to the device.
     * @return {[type]}         [description]
     */
    this.readArray = function(address, numReads) {
        var addresses = [];
        var directions = [];
        var numValues = [];
        var values = [];

        addresses.push(address);
        directions.push(0);
        numValues.push(numReads);

        var i;
        for(i = 0; i < numReads; i++) {
            values.push(0);
        }

        return this.rwMany(addresses, directions, numValues, values);
    }
    this.qReadArray = function(address, numReads) {
        return this.readArray(address, numReads);
    }

    this.rwA = function() {
        var addresses = ['AIN0'];
        var directions = [0];
        var numValues = [1];
        var values = [-1];
        this.rwManyTest(addresses, directions, numValues, values);
    }
    this.rwB = function() {
        var addresses = ['AIN0'];
        var directions = [0];
        var numValues = [8];
        var values = [-1,-1,-1,-1,-1,-1,-1,-1];
        this.rwManyTest(addresses, directions, numValues, values);
    }
    this.rwC = function() {
        var addresses = ['AIN0','AIN1'];
        var directions = [0,0];
        var numValues = [1,1];
        var values = [-1,-1];
        this.rwManyTest(addresses, directions, numValues, values);
    }

    this.rwManyTest = function(addresses, directions, numValues, values) {
        this.device.rwMany(
            addresses,
            directions,
            numValues,
            values,
            function (err) {
                console.log('Error!',err,addresses);
            },
            function (results) {
                console.log('Success!',results,addresses);
            }
        );
    }

    /**
     * Read and Write many registers on this device.  The rwMany function
     * switches between using "LJM_eNames" and "LJM_eAddresses" depending on if
     * it is passed numeric or string address values.
     *
     * @param {Array} addresses The addresses of the registers to write. Should
     *      be an Array of numbers or strings.
     * @param {Array} directions The determines whether to read or write to any
     *      given registers.
     * @param {Array} numValues The addresses of the registers to write. Should
     *      be an Array of numbers or strings.
     * @param {Array} values The values to write to these registers. Should be
     *      an Array of numbers or strings.
     * @return {q.promise} Promise that resolves to the values and addresses
     *      written. Will reject on error from lower layers.
    **/
    this.rwMany = function(addresses, directions, numValues, values) {
        var qDeferred = q.defer();
        this.rqControl('rwMany',addresses, directions, numValues, values)
        .then(qDeferred.resolve,qDeferred.reject);
        return qDeferred.promise;
    }
    this.drwMany = function(addresses, directions, numValues, values) {
        var deferred = q.defer();
        this.device.rwMany(
            addresses,
            directions,
            numValues,
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
    this.writeManyA = function() {
        var addresses = ['DAC0'];
        var values = [2.5];
        this.writeManyTest(addresses,values);

    }
    this.writeManyB = function() {
        var addresses = ['DAC0','DAC1'];
        var values = [2.5,2.5];
        this.writeManyTest(addresses,values);

    }
    this.writeManyTest = function (addresses, values) {
        this.device.writeMany(
            addresses,
            values,
            function (err) {
                console.log('Error!',err,addresses);
            },
            function (results) {
                console.log('Success!',results,addresses);
            }
        );
    };
    /**
     * Write many registers on this device.
     *
     * @param {Array} addresses The addresses of the registers to write. Should
     *      be an Array of numbers.
     * @param {Array} values The values to write to these registers. Should be
     *      an Array of numbers.
     * @return {q.promise} Promise that resolves to the values and addresses
     *      written. Will reject on error from lower layers.
    **/
    this.writeMany = function(addresses, values) {
        var qDeferred = q.defer();
        this.rqControl('writeMany',addresses, values)
        .then(qDeferred.resolve,qDeferred.reject);
        return qDeferred.promise;
    }
    this.dwriteMany = function (addresses, values) {
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

    /**
     * Read many registers on the device.
     *
     * @param {Array} addresses The addresses of the registers to read. Should
     *      be an Array of numbers.
     * @return {q.promise} Promise that resolves to an array of values read from
     *      the device, values corresponding to the addresses array passed.
     *      Rejects on error from a lower layer.
    **/
    this.readMany = function(addresses) {
        var qDeferred = q.defer();
        this.rqControl('readMany',addresses)
        .then(qDeferred.resolve,qDeferred.reject);
        return qDeferred.promise;
    }
    this.dreadMany = function (addresses) {
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

    /**
     * Write a single register on the device asynchronously.
     *
     * @param {Number} address The address of the register to write.
     * @param {Number} value The value to write to this register.
     * @return {q.promise} Promise that resovles to the value written to this
     *      register. Rejects on error at the lower levels.
    **/
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

    /**
     * Write a single register on the device asynchronously.
     *
     * @param {Number} address The address of the register to write.
     * @param {Number} value The value to write to this register.
     * @return {q.promise} Promise that resovles to the value written to this
     *      register. Rejects on error at the lower levels.
    **/
    this.qWrite = function(address, value) {
        var qDeferred = q.defer();
        this.rqControl('qWrite',address, value)
        .then(qDeferred.resolve,qDeferred.reject);
        return qDeferred.promise;
    }
    this.dqWrite = function(address, value) {
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
    }

    /**
     * Write a single register on the device synchronously.
     *
     * @param {Number} address The address of the register to write.
     * @param {Number} value The value to write to this address.
     * @throws Exceptions thrown from the labjack-nodejs and lower layers.
    **/
    this.write = function (address, value) {
        this.device.writeSync(address, value);
    };

    /**
     * Read a single register on the device synchronously.
     *
     * @param {Number} address The address of the register to read.
     * @return {Number} The value of the requested register.
     * @throws Exceptions thrown from the labjack-nodejs and lower layers.
    **/
    this.read = function (address) {
        return this.device.readSync(address);
    };

    /**
     * Read a single register on the device asynchronously.
     *
     * @param {Number} address The address of the register to read.
     * @return {q.promise} Promise that resovles to the value read from this
     *      register. Rejects on error at the lower levels.
    **/
    this.qRead = function(address) {
        var qDeferred = q.defer();
        this.rqControl('qRead',address)
        .then(qDeferred.resolve,qDeferred.reject);
        return qDeferred.promise;
    }
    this.dqRead = function(address) {
        var deferred = q.defer();
        this.device.read(
            address,
            function (err) {
                deferred.reject(err);
            },
            function (results) {
                deferred.resolve(results);
            }
        );
        return deferred.promise;
    }

    this.readAsync = function (address, onError, onSuccess) {
        this.device.read(address, onError, onSuccess);
    };

    /**
     * Temporary Read & Write-Repeat functions...
     */
    this.rqControl = function (cmdType,arg0,arg1,arg2,arg3,arg4) {
        var rqControlDeferred = q.defer();
        var device = this;
        var numRetries = 0;
        var ioNumRetry = 50;
        var ioDelay = 100;
        var type={
            'qRead':'dqRead',
            'readMany':'dreadMany',
            'qWrite':'dqWrite',
            'writeMany':'dwriteMany',
            'rwMany':'drwMany'
        }[cmdType];
        var supportedFunctions = [
            'qRead',
            'readMany',
            'qWrite',
            'writeMany',
            'rwMany'
        ];

        var control = function() {
            // console.log('in dRead.read');
            var ioDeferred = q.defer();
            device[type](arg0,arg1,arg2,arg3)
            .then(function(result){
                // console.log('Read Succeded',result);
                ioDeferred.resolve({isErr: false, val:result});
            }, function(err) {
                // console.log('Read Failed',err);
                ioDeferred.reject({isErr: true, val:err});
            });
            return ioDeferred.promise;
        };
        var delayAndRead = function() {
            var iotimerDeferred = q.defer();
            var innerControl = function() {
                // console.log('in dRead.read');
                var innerIODeferred = q.defer();
                device[type](arg0,arg1,arg2,arg3)
                .then(function(result){
                    // console.log('Read Succeded',result);
                    innerIODeferred.resolve({isErr: false, val:result});
                }, function(err) {
                    // console.log('Read Failed',err);
                    innerIODeferred.reject({isErr: true, val:err});
                });
                return innerIODeferred.promise;
            };
            var qDelayErr = function() {
                var eTimerDeferred = q.defer();
                eTimerDeferred.resolve('read-timeout occured');
                return eTimerDeferred.promise;
            };
            var qDelay = function() {
                // console.log('in dRead.qDelay');
                var timerDeferred = q.defer();
                if(numRetries < ioNumRetry) {
                    // console.log('Re-trying');
                    setTimeout(timerDeferred.resolve,1000);
                } else {
                    timerDeferred.reject();
                }
                return timerDeferred.promise;
            };
            // console.log('in delayAndRead');
            if(arg4) {
                console.log('Attempting to Recover from 2358 Error');
                console.log('Function Arguments',type,arg0,arg1,arg2,arg3);
            }
            qDelay()
            .then(innerControl,qDelayErr)
            .then(function(res){
                if(!res.isErr) {
                    iotimerDeferred.resolve(res.val);
                } else {
                    iotimerDeferred.reject(res.val);
                }
            },delayAndRead)
            .then(iotimerDeferred.resolve,iotimerDeferred.reject);
            return iotimerDeferred.promise;
        };


        if(supportedFunctions.indexOf(cmdType) >= 0) {
            control()
            .then(function(res) {
                // console.log('data',res);
                rqControlDeferred.resolve(res.val);
            },function(res) {
                var innerDeferred = q.defer();
                if(res.val == 2358) {
                    delayAndRead()
                    .then(innerDeferred.resolve,innerDeferred.reject);
                } else {
                    innerDeferred.resolve(res.val);
                }
                return innerDeferred.promise;
            })
            .then(function(res) {
                // console.log('Read-Really-Finished',arg0,res);
                rqControlDeferred.resolve(res);
            },function(err) {
                console.log('Here...',err);
                rqControlDeferred.reject(err)
            })
        } else {
            console.log(cmdType,type,supportedFunctions.indexOf(type))
            throw 'device_controller.rqControl Error!';
        }
        return rqControlDeferred.promise;
    }
    /**
     * Release the device handle for this device.
     *
     * @param {function} onError The function to call if the device could not
     *      be closed.
     * @param {function} onSuccess The function to call after the device is
     *      closed.
    **/
    this.close = function (onError, onSuccess) {
        this.device.close(onError, onSuccess);
    };

    // TODO: This is likely only used in the device info module. It should be
    //       moved there.
    /**
     * Set the name of this device.
     *
     * @param {String} newName The name to give this device.
     * @throws Exceptions thrown from the labjack-nodejs and lower layers.
    **/
    this.setName = function (newName) {
        this.write('DEVICE_NAME_DEFAULT', newName);
        this.cachedName = newName;
    };

    this.subclass = this.getSubclass();
};


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

    /**
     * Get the devices opened in this device keeper.
     *
     * @return {Array} Array of decorated devices (device_controller.device)
     *      representing devices open in the device controller / this device
     *      keeper.
    **/
    this.getDevices = function()
    {
        var retList = [];
        devices.forEach(function(value, key) {retList.push(value);});
        return retList;
    };

    /**
     * Get the serial numbers of the devices opened in this device keeper.
     *
     * @return {Array} Array of serial numbers corresponding to the devices
     *      opened in the device controller / this device keeper.
    **/
    this.getDeviceSerials = function()
    {
        var retList = [];
        devices.forEach(function(value, key) {retList.push(key);});
        return retList;
    };

    /**
     * Update the record for a device.
     *
     * Remove an old decorated device and replace it with this new decorated
     * device. More specifically, the opened device record for the device with
     * the serial number matching the serial number assigned to the device
     * parameter will be removed. Then, the provided device parameter will be
     * added as a record of an open device. Actual opening and closing of
     * devices will not happen during the execution of this function.
     *
     * @param {device_controller.Device} The device to add to the open device
     *      list, removing any device records with the same serial number.
    **/
    this.updateDevice = function (device) {
        this.removeDevice(device);
        this.addDevice(device);
    };

    this.clearRecord = function () {
        devices.clear();
    };
}


// Singleton instance / global device keeper instance
var deviceKeeperInstance = null;


/**
 * Open a device based on device attributes.
 *
 * @param {String} deviceType The string description of the type / model of the
 *      device to open. Can also accept Number corresponding to driver constant.
 * @param {Number} serialNumber The serial number of the device to open. Can
 *      also accept String serial number.
 * @param {String} ipAddress The IP address of the device to open. Does not
 *      need to be specified if not opening over the network.
 * @param {String} connectionType The string description of the connection
 *      type ('USB', 'Ethernet', 'Wifi') to open.
 * @param {function} onError The function to call if an error is encountered
 *      while opening a device.
 * @param {function} onSuccess The function to call after the device has been
 *      successfully opened.
**/
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


// TODO: This should just take deviceType.
/**
 * Get the listing of devices available for a certain device type.
 *
 * @param {dict} listingDict Dictionary mapping device type to list of devices
 *      of that type that are available for opening.
 * @param {device_controller.Device} device The device whose device type should
 *      be used to find a device listing.
 * @return {Array} Listing of available devices for opening whose device type
 *      matches the device parameter's device type.
**/
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


function formatAsIP(ipAddress) {
    var ipString = "";
    ipString += ((ipAddress>>24)&0xFF).toString();
    ipString += ".";
    ipString += ((ipAddress>>16)&0xFF).toString();
    ipString += ".";
    ipString += ((ipAddress>>8)&0xFF).toString();
    ipString += ".";
    ipString += ((ipAddress)&0xFF).toString();
    return ipString;
}


/**
 * Create a record of a device that is available to be opened.
 *
 * Create a record with info about a device that is available to be opened
 * through the device management feature.
 *
 * @param {labjack-nodejs.device} device The device for which a listing record
 *      should be created.
 * @param {String} name The name of this device.
 * @param {String} specText The "special text" that differentiates devices
 *      of the same model (like T7 v T7 pro). This will change "T7" to "T7" pro
 *      within the GUI.
 * @param {String} specImageSuffix A suffix to add to the device image filename
 *      that helps differentiate devices of the same model (like T7 v T7 pro).
 *      This will change T7.png to T7-pro.png when deciding which image to
 *      show in the GUI.
 * @return {Object} Collection of information (no functions) that helps
 *      identify a device that can be opened. This information device is
 *      referred to as a device info structure elsewhere in device_controller
 *      but is not used outside of the device selection functionality.
**/
function createDeviceListingRecord (device, name, specText, specImageSuffix, ethernetIP, wifiIP)
{
    var connectionType = CONNECTION_TYPE_NAMES.get(
        String(device.connectionType), 'other');
    var ljmConnectionType = DRIVER_CONNECTION_TYPE_NAMES.get(
        String(device.connectionType), 'other');
    var deviceType = DEVICE_TYPE_NAMES.get(String(device.deviceType), 'other');
    console.log('Found Connection Option:',device.serialNumber,device.connectionType,device.ipAddress);

    var safeIP = device.ipAddress.replace(/\./g, '_');
    var ct = device.connectionType;
    var ip = device.ipAddress;
    var ctString = connectionType;
    var ljmDt = DRIVER_DEVICE_TYPE_NAMES.get(String(device.connectionType), 'other');

    return {
        'serial': device.serialNumber,
        'connections': [{type:ct,typeStr:connectionType,ljmTypeStr:ljmConnectionType,ipAddress:ip,ipSafe:safeIP}],
        'connectionTypes': [connectionType],
        'origConnectionType': connectionType,
        'origDeviceType': device.deviceType,
        'type': deviceType,
        'ljmDeviceType': ljmDt,
        'name': name,
        'ipAddress': ip,
        'ipAddresses': [ip],
        'ethernetIPAddress': ethernetIP,
        'wifiIPAddress': wifiIP,
        'ipSafe': safeIP,
        'ipSafeAddresses': [safeIP],
        'origDevice': device,
        'specialText': specText,
        'specialImageSuffix': specImageSuffix
    };
}


/**
 * Open a device given its device info structure.
 *
 * Open a device given the information structure created through
 * createDeviceListingRecord, a record indicating that a device is available
 * to be opened. That structure is only used for supporting device selection.
 *
 * @param {Object} deviceInfo The device info structure from
 *      createDeviceListingRecord with information about the device that should
 *      be opened.
 * @param {String} connectionType Description of the connection type to use
 *      to open this device.
 * @param {function} onError The function to call if an error is encountered
 *      while opening this device like if this device cannot be found.
 * @param {function} onSuccess The function to call after the device has been
 *      opened successfully.
**/
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


/**
 * Combine device entries refering to the same device on different connections.
 *
 * Combine device entries that refer to the same device but indicating that the
 * device is available on different connection types / media. Entries are
 * combined by serial number and this function operates on collections of
 * device info structures produced by createDeviceListingRecord.
 *
 * @param {Object} listing Collection of device info structures to consolidate.
 *      This structure should match that produced by getListingEntry.
 * @return {Object} A reference to the originally provided listing structure.
 *      After this function returns, the device info structures will have been
 *      consolidated such that there is only one device info structure per
 *      device serial number.
**/
var consolidateDevices = function (devices) {
    var existingDevice;
    var newDevice;
    var deviceListing = dict();
    var numDevices = devices.length;

    for (var i=0; i<numDevices; i++) {
        newDevice = devices[i];
        existingDevice = deviceListing.get(newDevice.serial.toString(), null);
        if (existingDevice !== null) {
            newDevice.connections.push.apply(
                newDevice.connections,
                existingDevice.connections
            );
        }
        deviceListing.set(newDevice.serial.toString(), newDevice);
    }

    var missingConn = function (deviceInfo, connectionType, ipAddr) {
        var missingConnType = deviceInfo.connections.filter(function (connection) {
            return connection.typeStr === connectionType;
        }).length == 0;

        var hasIP = ipAddr && ipAddr !== '0.0.0.0';

        return missingConnType && hasIP;
    };

    var addNonSearchableConnection = function(deviceInfo, connType, ipAddr) {
        var conType = {
            'USB':{'num': 1, 'str': '1'},
            'Ethernet':{'num': 3, 'str': '3'},
            'WiFi':{'num': 4, 'str': '4'}
        }[connType];

        deviceInfo.connections.push({
            'type': conType.num,
            'typeStr': CONNECTION_TYPE_NAMES.get(conType.str),
            'ljmTypeStr': DRIVER_CONNECTION_TYPE_NAMES.get(conType.str),
            'ipAddress': ipAddr,
            'ipSafe': ipAddr.replace(/\./g, '_'),
            'alreadyOpen': false,
            'notSearchableWarning': true
        });
    };

    var retList = [];
    deviceListing.forEach(function (deviceInfo, key) {
        if (missingConn(deviceInfo, 'Wifi', deviceInfo.wifiIPAddress)) {
            addNonSearchableConnection(
                deviceInfo,
                'WiFi',
                deviceInfo.wifiIPAddress
            );
        }

        if (missingConn(deviceInfo, 'Ethernet', deviceInfo.ethernetIPAddress))
        {
            addNonSearchableConnection(
                deviceInfo,
                'Ethernet',
                deviceInfo.ethernetIPAddress
            );
        }

        retList.push(deviceInfo);
    });

    return retList;
};

var getWiFiRSSIImgName = function(rssi) {
    var imgName = '';
    if(rssi < WIFI_RSSI_IMAGES[0].val) {
        WIFI_RSSI_IMAGES.some(function(rssiData){
            if(rssi < rssiData.val) {
            } else {
                imgName = rssiData.img;
                return true
            }
        });
    } else {
        imgName = WIFI_RSSI_IMAGES[0].img;
    }

    if(imgName === '') {
        imgName = WIFI_RSSI_IMAGES[WIFI_RSSI_IMAGES.length-1].img;
    }
    return imgName
}
var unpackDeviceInfo = function (driverListingItem) {
    var connectionType = driverListingItem.connectionType;
    var rawConnTypeStr = connectionType.toString();
    var ipAddress = driverListingItem.ipAddress;
    var deviceType = driverListingItem.deviceType;
    var rawDeviceTypeStr = deviceType.toString()

    var unpackStrategies = {};

    var parseName = function (dataItem) {
        retDeviceInfo.name = dataItem.val;
    };
    unpackStrategies['DEVICE_NAME_DEFAULT'] = parseName;

    var parseEthernetIPAddress = function (dataItem) {
        var ipStr = formatAsIP(dataItem.val);
        retDeviceInfo.ethernetIPAddress = ipStr;
        retDeviceInfo.ethernetSafeIPAddress = ipStr.replace(/\./g, '_');
    };
    unpackStrategies['ETHERNET_IP'] = parseEthernetIPAddress;

    var parseWiFiStatus = function (dataItem) {
        var newStatus = dataItem.val;
        var data = WIFI_STATUS_DISPLAY_DATA[newStatus];

        retDeviceInfo.wifiStatus = data.display;
        retDeviceInfo.wifiStatusStr = data.str;
    };
    unpackStrategies['WIFI_STATUS'] = parseWiFiStatus;

    var parseWiFiIPAddress = function (dataItem) {
        var ipStr = formatAsIP(dataItem.val);
        retDeviceInfo.wifiIPAddress = ipStr;
        retDeviceInfo.wifiSafeIPAddress = ipStr.replace(/\./g, '_');
    };
    unpackStrategies['WIFI_IP'] = parseWiFiIPAddress;
    var parseWiFiIPAddress = function (dataItem) {
        var newRSSI = dataItem.val;
        var avgRSSI = retDeviceInfo.avgWiFiRSSI;
        var numInAvg = retDeviceInfo.numInAvgWiFiRSSI;

        if(newRSSI > -200) {
            avgRSSI = avgRSSI * numInAvg;
            avgRSSI += newRSSI;
            numInAvg += 1;
            avgRSSI = avgRSSI / numInAvg;
        }
        var imgName = getWiFiRSSIImgName(avgRSSI);
        if((retDeviceInfo.specialImageSuffix === '') && (retDeviceInfo.type == 7)) {
            imgName = '';
        }
        console.log('RSSI-Debug',driverListingItem.serialNumber,driverListingItem.connectionType,newRSSI,imgName);
        retDeviceInfo.wifiRSSIImgName = imgName;
        retDeviceInfo.wifiRSSIStr = avgRSSI.toString() + 'dB';
        retDeviceInfo.avgWiFiRSSI = avgRSSI;
        retDeviceInfo.numInAvgWiFiRSSI = numInAvg;
    };
    unpackStrategies['WIFI_RSSI'] = parseWiFiIPAddress;

    var parseHardwareInstalled = function (dataItem) {
        if (dataItem.val !== 0) {
            retDeviceInfo.specialText = ' Pro';
            retDeviceInfo.specialImageSuffix = '-pro';
        } else {
            retDeviceInfo.specialText = '';
            retDeviceInfo.specialImageSuffix = '';
        }
    };
    unpackStrategies['HARDWARE_INSTALLED'] = parseHardwareInstalled;

    var readDigitInstalledOptions = function(dataItem) {
        if (dataItem.val == 3) {
            retDeviceInfo.specialText = '-TLH';
            retDeviceInfo.specialImageSuffix = '-TLH';
        } else if (dataItem.val == 2) {
            retDeviceInfo.specialText = '-TL';
            retDeviceInfo.specialImageSuffix = '-TL';
        } else {
            retDeviceInfo.specialText = '';
            retDeviceInfo.specialImageSuffix = '';
        }
    };
    unpackStrategies['DGT_INSTALLED_OPTIONS'] = readDigitInstalledOptions;
    var deviceTypeStr = DEVICE_TYPE_NAMES.get(rawDeviceTypeStr);
    var retDeviceInfo = {
        'serial': driverListingItem.serialNumber,
        'connections': [{
            'type': connectionType,
            'typeStr': CONNECTION_TYPE_NAMES.get(rawConnTypeStr),
            'ljmTypeStr': DRIVER_CONNECTION_TYPE_NAMES.get(rawConnTypeStr),
            'ipAddress': ipAddress,
            'ipSafe': ipAddress.replace(/\./g, '_'),
            'alreadyOpen': false,
            'notSearchableWarning': false
        }],
        'connectionTypes': [connectionType],
        'origConnectionType': connectionType,
        'origDeviceType': deviceType,
        'type': deviceType,
        'typeStr': deviceTypeStr,
        'deviceType': deviceTypeStr,
        'ljmDeviceType': DRIVER_DEVICE_TYPE_NAMES.get(rawDeviceTypeStr),
        'isEnabled': DEVICE_ENABLED_LIST.get(deviceTypeStr),
        'avgWiFiRSSI': 0,
        'wifiRSSIStr': '0dB',
        'wifiRSSIImgName': '',
        'numInAvgWiFiRSSI': 0,
        'wifiStatus': 'Un-Powered',
        'wifiStatusStr': false
    }

    driverListingItem.data.forEach(function (dataItem) {
        unpackStrategies[dataItem.name](dataItem);
    });

    return retDeviceInfo;
};


var tryOpenDeviceConnection = function (deviceInfo, connection) {
    var deferred = q.defer();

    openDeviceFromAttributes(
        deviceInfo.type,
        deviceInfo.serial,
        connection.ipAddress,
        connection.type,
        function (error) {
            connection.alreadyOpen = true;
            deferred.resolve();
        },
        function (device) {
            device.close(function(){
                console.error('Trying to close device-2',deviceInfo.serial,connection.type);
                device.close(deferred.resolve, deferred.resolve);
            }, deferred.resolve);
        }
    );

    return function () { return deferred.promise; };
};


var ignoreNonTCP = function (innerFunc) {
    return function (deviceInfo, connection) {
        if (connection.type === CONNECT_TYPE_USB) {
            return function () {
                var deferred = q.defer();
                deferred.resolve();
                return deferred.promise;
            };
        } else {
            return innerFunc(deviceInfo, connection);
        }
    };
};


var tryOpenDevice = function (deviceInfo) {
    var openFunc = ignoreNonTCP(tryOpenDeviceConnection);
    var connectionTypePromises = deviceInfo.connections.map(
        function (connection) {
            return openFunc(deviceInfo, connection);
        }
    );

    var finalPromise = connectionTypePromises.reduce(
        function (previousPromise, currentPromise) {
            if (previousPromise === null)
                return currentPromise();
            else
                return previousPromise.then(currentPromise);
        },
        null
    );

    return function () { return finalPromise };
};


var getDevicesOfTypeFuture = function (deviceType, connectionType, reqAttrs)
{
    return function (devScanList) {
        var deferred = q.defer();
        labjack_driver.closeAllSync();
        labjack_driver.writeLibrarySync('LJM_OLD_FIRMWARE_CHECK',0);
        labjack_driver.listAllExtended(
            deviceType,
            connectionType,
            reqAttrs,
            function(err) {
                var errMsg = 'Error calling listAllExtended '+
                    'device_controller.getDevices';
                console.error(errMsg,err);
                deferred.reject(err);
            },
            function (driverListing) {
                var unpackedDeviceInfo = consolidateDevices(
                    driverListing.map(unpackDeviceInfo)
                );

                var tryOpenPromises = unpackedDeviceInfo.map(tryOpenDevice);
                var finalPromise = tryOpenPromises.reduce(
                    function (previousPromise, currentPromise) {
                        if (previousPromise === null)
                            return currentPromise();
                        else
                            return previousPromise.then(currentPromise);
                    },
                    null
                );

                if (finalPromise === null) {
                    deferred.resolve(devScanList);
                    return;
                } else {
                    var name = DEVICE_TYPE_NAMES_BY_DRIVER_NAME.get(deviceType);
                    finalPromise.then(function () {
                        devScanList.push(
                            {
                                'name': name,
                                'devices': unpackedDeviceInfo
                            }
                        );
                        deferred.resolve(devScanList);
                    });
                }
            }
        );

        return deferred.promise;
    };
};


var innerGetDevices = function (onError, onSuccess)
{
    var retData;

    var innerGetDevices = function (wasAlreadySuccessful) {
        var deferred = q.defer();
        var hadError = false;

        var innerOnError = function () {
            console.log('attempting to recover');
        };

        if (wasAlreadySuccessful) {
            deferred.resolve(true);
            return deferred.promise;
        }

        var retListPromises = SCAN_REQUEST_LIST.map(function (deviceTypeInfo) {
            return getDevicesOfTypeFuture(
                deviceTypeInfo.deviceType,
                deviceTypeInfo.connectionType,
                deviceTypeInfo.addresses
            )
        });

        var lastPromise = retListPromises.reduce(
            function (previousPromise, currentPromise) {
                if (previousPromise === null)
                    return currentPromise([]);
                else
                    return previousPromise.then(currentPromise, function () {
                        innerOnError();
                        hadError = true;
                    });
            },
            null
        );

        lastPromise.then(function (newRetData) {
            retData = newRetData;
            console.log('determining success...',hadError)
            if (hadError)
                deferred.resolve(false);
            else
                deferred.resolve(true);
            console.log('here here here ***');
        }, innerOnError);

        return deferred.promise;
    };

    var futures = [];
    for (var i=0; i<NUM_SCAN_RETRIES; i++)
        futures.push(innerGetDevices);

    var lastPromise = futures.reduce(function (lastAttempt, currentAttempt) {
        if (lastAttempt === null)
            return currentAttempt();
        else
            return lastAttempt.then(currentAttempt);
    }, null);

    lastPromise.then(function (wasSuccessful) {
        if (wasSuccessful)
            onSuccess(retData);
        else
            onSuccess([]);
    }, onError);
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
exports.getDevices = function (onError, onSuccess) {
    labjack_driver.writeLibrarySync('LJM_OPEN_TCP_DEVICE_TIMEOUT_MS',2000);
    labjack_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS', 2000);

    var decorateCleanup = function (continuation) {
        return function (value) {
            labjack_driver.writeLibrarySync('LJM_OPEN_TCP_DEVICE_TIMEOUT_MS',20000);
            labjack_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',20000);
            continuation(value);
        };
    };

    var decorateSelectorVals = function (continuation) {
        return function (deviceTypes) {
            console.log('WHERE ARE WE????');
            console.log(deviceTypes);
            deviceTypes.forEach(function (deviceType) {
                deviceType.devices.forEach(function (device) {
                    device.connections.forEach(function (connection) {
                        device_selector_view_gen.addDeviceSelectorVals(
                            device, connection);
                    });
                });
            });
            continuation(deviceTypes);
        }
    };

    innerGetDevices(
        decorateCleanup(onError),
        decorateSelectorVals(decorateCleanup(onSuccess))
    );
}


/**
 * Open a connection to a device.
 *
 * @param {String} serial The serial number of the device to open.
 * @param {String} ipAddress The IP address of the device to open. Can be
 *      left null if not opening a device over the network.
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
            console.log('Creating New Device Object',deviceType,serial,ipAddress,connType)
            var device = new Device(innerDevice, serial, connType, deviceType);
            console.log('After-Creating New Device Object',deviceType,serial,ipAddress,connType,device)
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

exports.CONNECTION_TYPE_NAMES = CONNECTION_TYPE_NAMES;
