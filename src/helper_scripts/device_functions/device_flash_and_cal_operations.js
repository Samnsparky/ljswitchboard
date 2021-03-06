

var async = require('async');
var dict = require('dict');
var q = require('q');

var driver_const = null;
exports.setDriverConst = function(driver_constants) {
    driver_const = driver_constants;
};

/**
 * Reject a deferred / promise because of an error.
 *
 * @param {q.deferred} deferred The deferred whose promise should be rejected.
 * @param {Object} error Error object optionally with a retError attribute. If
 *      there is a retError attribute on the provided error object, that
 *      retError will be the reported value of the error. Otherwise the error's
 *      toString method will be used.
 * @param {String} prefix Optional string that will be prepended to the error
 *      message the provided deferred execution / promise will be rejected with.
 *      If not provided, the error number / message provided by the error's
 *      retError or toString method will be used.
**/
function safelyReject (deferred, error, prefix) {
    var errorMsg;
    if (isNaN(error)) {
        if (error.retError === undefined) {
            errorMsg = error.toString();
        } else {
            errorMsg = error.retError.toString();
        }

        if (prefix === undefined) {
            deferred.reject(errorMsg);
        } else {
            deferred.reject(prefix + errorMsg);
        }
    } else {
        deferred.reject(error);
    }
}

/**
 * Create a closure over a deferred execution for error handling.
 *
 * Creates a closure that, when executed with an error, will reject the provided
 * deferred execution / promise. The returned function should be called with
 * a single parameter: an error. This error object can optionally have with a
 * retError attribute. If there is a retError attribute on the provided error
 * object, that retError will be the reported value of the error. Otherwise the
 * error's toString method will be used.
 *
 * @param {q.deferred} deferred The deferred execution / promise to reject when
 *      the resulting function is called.
 * @return {function} Closure over the provided deferred. This funciton will
 *      take a single error parameter and reject the provided deferred / promise
 *      when executed.
**/
function createSafeReject (deferred) {
    return function (error) {
        return safelyReject(deferred, error);
    };
}

/**
 * Execute a read or write operation on a device's flash memory.
 *
 * As writing / reading flash is both hard and has some overlap between the read
 * and write operation, this convenience function handles flash memory keys as
 * well as address calculation and actual driver call generation.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to perform
 *      the flash memory operation on.
 * @param {Number} startAddress The starting address where the flash operation
 *      (read or write) should start.
 * @param {Number} lengthInts The size of the data to read or write. This should
 *      be reported in number of integers (4 byte pieces).
 * @param {Number} sizeInts The size of the block to read or write. Should be
 *      specific to the region of flash memory being operated on.
 * @param {Number} ptrAddress The memory pointer modbus address to use to index
 *      into the desired section of flash memory. Should be a constant like
 *      T7_MA_EXF_pREAD. This is a modbus address not a flash address.
 * @param {Number} flashAddress The memory modbus address to index into to get
 *      to the desired sectin of flash memory. Should be a constants like
 *      T7_MA_EXF_READ. This is a modbus address not a flash address.
 * @param {bool} isReadOp Indicate if this is a read operation. If false, this
 *      is a write operation.
 * @param {Number} key The key specific to the section of flash memory used to
 *      authorize / validate this memory operation. Should be a constant.
 * @param {Buffer} data If a write operation, this is the data to write to the
 *      flash memory. Does not need to be provided if a read operation.
 * @param {q.promise} A promise that resolves when the operation finishes or
 *      rejects in case of error. Will resolve to the data written or the the
 *      data read.
**/
var createFlashOperation = function (bundle, startAddress, lengthInts, sizeInts,
    ptrAddress, flashAddress, isReadOp, key, data)
{
    var deferred = q.defer();
    var device = bundle.getDevice();
    
    // Creates a closure over a rw excutiong with an address and size
    var createExecution = function(address, innerSize, writeValues)
    {
        return function (lastResults) {
            var innerDeferred = q.defer();

            var addresses = [];
            var values = [];
            var directions = [];
            var numFrames;
            var numValues;

            // Flash memory pointer
            directions.push(driver_const.LJM_WRITE);

            // Key
            if (key === undefined) {
                numFrames = 2;
                numValues = [1];
            } else {
                // Write for key
                directions.push(driver_const.LJM_WRITE);
                addresses.push(driver_const.T7_MA_EXF_KEY);
                values.push(key);
                numFrames = 3;
                numValues = [1, 1];
            }

            if (isReadOp)
                directions.push(driver_const.LJM_READ);
            else
                directions.push(driver_const.LJM_WRITE);

            addresses.push(ptrAddress);
            values.push(address);
            addresses.push(flashAddress);

            if (isReadOp) {
                for (var i=0; i<innerSize; i++) {
                    values.push(null);
                }
            } else {
                values.push.apply(values, writeValues);
            }

            numValues.push(innerSize);

            device.rwMany(
                addresses,
                directions,
                numValues,
                values,
                createSafeReject(innerDeferred),
                function (newResults) { 
                    lastResults.push.apply(lastResults, newResults);
                    innerDeferred.resolve(lastResults);
                }
            );

            return innerDeferred.promise;
        };
    };

    var getdata = function (imageBuffer, numIntegers, offset) {
        var retArray = [];
        for (var i=0; i<numIntegers; i++) {
            retArray.push(imageBuffer.readUInt32BE(i*4 + offset));
        }
        return retArray;
    };

    var executeOperations = [];
    var size = sizeInts;
    var length = lengthInts;
    var numIterations = Math.floor(length / size);
    var remainder = length % size;
    var shouldAugment = remainder > 0;
    var currentAddress = startAddress;
    var offset = 0;
    var execution;

    for (var i = 0; i<numIterations; i++)
    {
        if (isReadOp) {
            execution = createExecution(
                currentAddress,
                size
            );
        } else {
            execution = createExecution(
                currentAddress,
                size,
                getdata(
                    data,
                    8, // 8 integer max for each rw op.
                    offset
                )
            );
        }
        executeOperations.push(execution);
        currentAddress += size * 4; // 4 bytes per integer written
        offset += 32; // 4 bytes per integer * 8 integers written
    }

    if (shouldAugment && remainder > 0) {
        if (isReadOp) {
            execution = createExecution(
                currentAddress,
                remainder
            );
        } else {
            execution = createExecution(
                currentAddress,
                remainder,
                getdata(
                    data,
                    remainder,
                    offset
                )
            );
        }
        executeOperations.push(execution);
    }

    var numIntsWritten = 0;

    async.reduce(
        executeOperations,
        [],
        function (lastMemoryResult, currentExecution, callback) {
            numIntsWritten += sizeInts;
            currentExecution(lastMemoryResult).then(
                function (newMemory){
                    callback(null, newMemory);
                },
                function (err) {
                    callback(err, null);
                }
            );
        },
        function (err, allMemoryRead) {
            bundle.results = allMemoryRead;
            if (err) {
                safelyReject(deferred, err);
            } else {
                deferred.resolve(bundle);
            }
        }
    );

    return deferred.promise;
};

/**
 * Reads desired flash memory region from the device.
 *
 * @param {DeviceFirwareBundle} bundle The bundle with the device to read from.
 * @param {Number} startAddress The address to start reading at.
 * @param {Number} length Number of integers to read.
 * @param {Number} size The number of reads to combine in a single read call.
**/
exports.readFlash = function(device, startAddress, length)
{
    var readPtrAddress = driver_const.T7_MA_EXF_pREAD;
    var readFlashAddress = driver_const.T7_MA_EXF_READ;
    var bundle = {};
    bundle.getDevice = function() {
        return device;
    };
    var size = driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
    
    var flashDefered = q.defer();
    createFlashOperation(
        bundle,
        startAddress,
        length,
        size,
        readPtrAddress,
        readFlashAddress,
        true
    ).then(function(bundle) {
        flashDefered.reject(bundle);
    }, function(err) {
        flashDefered.resolve(err);
    });
    return flashDefered.promise;
};


var T7_NominalCalValues = [
    {"name": "HS 10.0V PSlope", "nominal": 0.000315805780, "variance": 0.05},
    {"name": "HS 10.0V NSlope", "nominal": -0.000315805800, "variance": 0.05},
    {"name": "HS 10.0V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 10.0V Offset", "nominal": -10.586956522, "variance": 0.05},
    {"name": "HS 1.00V PSlope", "nominal": 0.000031580578, "variance": 0.05},
    {"name": "HS 1.00V NSlope", "nominal": -0.000031580600, "variance": 0.05},
    {"name": "HS 1.00V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 1.00V Offset", "nominal": -1.0586956522, "variance": 0.05},
    {"name": "HS 0.10V PSlope", "nominal": 0.000003158058, "variance": 0.05},
    {"name": "HS 0.10V NSlope", "nominal": -0.000003158100, "variance": 0.05},
    {"name": "HS 0.10V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 0.10V Offset", "nominal": -0.1058695652, "variance": 0.05},
    {"name": "HS 0.01V PSlope", "nominal": 0.000000315806, "variance": 0.05},
    {"name": "HS 0.01V NSlope", "nominal": -0.000000315800, "variance": 0.05},
    {"name": "HS 0.01V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 0.01V Offset", "nominal": -0.0105869565, "variance": 0.05},
    {"name": "HR 10.0V PSlope", "nominal": 0.000315805780, "variance": 0.5},
    {"name": "HR 10.0V NSlope", "nominal": -0.000315805800, "variance": 0.5},
    {"name": "HR 10.0V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 10.0V Offset", "nominal": -10.586956522, "variance": 0.5},
    {"name": "HR 1.00V PSlope", "nominal": 0.000031580578, "variance": 0.5},
    {"name": "HR 1.00V NSlope", "nominal": -0.000031580600, "variance": 0.5},
    {"name": "HR 1.00V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 1.00V Offset", "nominal": -1.0586956522, "variance": 0.5},
    {"name": "HR 0.10V PSlope", "nominal": 0.000003158058, "variance": 0.5},
    {"name": "HR 0.10V NSlope", "nominal": -0.000003158100, "variance": 0.5},
    {"name": "HR 0.10V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 0.10V Offset", "nominal": -0.1058695652, "variance": 0.5},
    {"name": "HR 0.01V PSlope", "nominal": 0.000000315806, "variance": 0.5},
    {"name": "HR 0.01V NSlope", "nominal": -0.000000315800, "variance": 0.5},
    {"name": "HR 0.01V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 0.01V Offset", "nominal": -0.0105869565, "variance": 0.5},
    {"name": "DAC0 Slope", "nominal": 13200.0, "variance": 0.05},
    {"name": "DAC0 Offset", "nominal": 100, "variance": 2.00},
    {"name": "DAC1 Slope", "nominal": 13200.0, "variance": 0.05},
    {"name": "DAC1 Offset", "nominal": 100, "variance": 2.00},
    {"name": "Temp Slope", "nominal": -92.379, "variance": 0.01},
    {"name": "Temp Offset", "nominal": 465.129215, "variance": 0.01},
    {"name": "IS 10uA", "nominal": 0.000010, "variance": 0.05},
    {"name": "IS 200uA", "nominal": 0.000200, "variance": 0.05},
    {"name": "I Bias", "nominal": 0.000000015, "variance": 3.0}
];

var T7_HIGH_RESOLUTION_START_INDEX = 16;


var getInvalidCalibrationValues = function (device, calValues) {
    var withinRange = function(calValue, min, max) {
        if (isNaN(calValue)) {
            return false;
        }
        if (calValue <= min) {
            return false;
        }
        if (calValue >= max) {
            return false;
        }
        return true;
    };
    var badCals = [];
    T7_NominalCalValues.forEach(function(nominalVal, index) {
        var min, max, absPlusMinus;
        var isPro = (device.subclass === 'Pro');
        if (!isPro && (index >= T7_HIGH_RESOLUTION_START_INDEX)) {
            return badCals;
        }

        absPlusMinus = Math.abs(nominalVal.nominal * nominalVal.variance);
        min = nominalVal.nominal - absPlusMinus;
        max = nominalVal.nominal + absPlusMinus;

        if (!withinRange(calValues[index], min, max)) {
            badCals.push(nominalVal.name);
        }
    });

    return badCals;
};

/**
 * Determines if the calibration on a connected device is valid or not.
 *
 * @param {Device} device The object that represents a LJ device.
 * @param {function} onSuccess The function callback used to report data.
**/
exports.updateDeviceCalibrationStatus = function(device, onSuccess) {
    // Read the calibration of a device, starting at memory address 0x3C4000 hex 
    // and reading 41*4 bytes of data.  Aka read 41 integers (4 bytes each) 
    // worth of data.
    device.readFlash(0x3C4000, 41)
    .then( function(data) {
        // Convert the read calibration data to floating point values
        var floatingPointData = [];
        data.results.forEach(function(result){
            var buf = new Buffer(4);
            buf.writeUInt32BE(result,0);
            var floatVal = buf.readFloatBE(0);
            floatingPointData.push(floatVal);
        });

        // Check the values to see if they are valid
        var calCheckResult = getInvalidCalibrationValues(device, floatingPointData);

        // If there are any invalid values set calibration validity to be false
        if(calCheckResult.length > 0) {
            device.cachedCalibrationValidity = false;
        } else {
            device.cachedCalibrationValidity = true;
        }
        // return the device object
        onSuccess(device);
    }, function(error) {
        console.log('in updateDeviceCalibrationStatus, error', error);
        onSuccess(device);
    });

};


