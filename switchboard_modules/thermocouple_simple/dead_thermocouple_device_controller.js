var async = require('async');
var q = require('q');

var tcDeviceController = new TCDeviceWrapper();


var generateCheckErrorAndFinish = function (deferred)
{
    return function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    };
};


var createDeviceWritter = function (tcConfig, device) {

    var addresses = tcConfig.map(function (e) { 
        return 'AIN' + e.ainNum + '_EF_TYPE';
    });

    var tcConstants = tcConfig.map(function (e) {
        return e.tcConstant;
    });

    return function (device) {
        return device.writeMany(addresses, tcConstants);
    };
};


function TCDeviceWrapper()
{
    var connectedDevices = [];
    var tcConstants = [];

    this.setTCConstants = function () {

        var deferred = q.defer();

        var setTCRangesDevice = createDeviceWritter(tcConstants);
        
        var processDevice = function (device, callback) {
            setTCRangesDevice(device).then(
                function () {
                    callback(null);
                },
                function (err) {
                    callback(err);
                }
            );
        };

        var checkErrorAndFinish = generateCheckErrorAndFinish(deferred);
        async.eachSeries(connectedDevices, processDevice, checkErrorAndFinish);

        return deferred.promise;
    };

    this.setConnectedDevices = function (newConnectedDevices) {
        connectedDevices = newConnectedDevices;
        return setConstants();
    };

    this.addTCConstant = function (ainNum, tcConstant) {
        tcConstants.push({ ainNum: ainNum, tcConstant: tcConstant });
    };

    this.getTCTemperature = function () {
        var deferred = q.defer();
        var valuesByAIN = {};
        var numTCConstants = tcConstants.length;
        
        for (var i=0; i<numTCConstants; i++) {
            valuesByAIN[tcConstants[i].ainNum] = {};
        }

        var processDevice = function (device, callback) {
            getAINValuesForDevice(device).then(
                function (values) {
                    async.each(
                        values,
                        function (item, innerCallback) {
                            var valueIndex = valuesByAIN[item.ainNum];
                            valueIndex[device.getSerial()] = item.val;
                        },
                        function (err) {
                            if (err)
                                throw new Error(err);
                        }
                    );
                },
                function (err) { callback(err); }
            );
        };

        return deferred.promise;
    };
}