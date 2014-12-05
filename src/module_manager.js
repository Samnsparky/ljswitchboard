/**
 * Convienence functions for managing Switchboard modules.
 *
 * Convienence functions that allow for the management of late loaded modules
 * not bundled in the main executable.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
 * @contributor Chris Johnson (LabJack, 2014)
**/

// Is not included in the DOM, therefore perform all includes
var device_controller = require('./device_controller');
var fs_facade = require('./fs_facade');
var dict = require('dict');
var KIPLING_BUILD_TYPE_NUMBERS = {
    "develop":0,
    "test":1,
    "beta":2,
    "release":3
};
function GET_KIPLING_BUILD_TYPE_NUMBER(type) {
    var num = KIPLING_BUILD_TYPE_NUMBERS[type];
    if(typeof(num) === 'undefined') {
        num = 100;
    }
    return num;
}

var KIPLING_BUILD_TYPE_NUMBERS = {
    "develop":0,
    "test":1,
    "beta":2,
    "release":3
};
function GET_KIPLING_BUILD_TYPE_NUMBER(type) {
    var num = KIPLING_BUILD_TYPE_NUMBERS[type];
    if(typeof(num) === 'undefined') {
        num = 100;
    }
    return num;
}
function CHECK_KIPLING_BUILD_TYPE_LIMITATIONS(curType, minType) {
    var curNum = GET_KIPLING_BUILD_TYPE_NUMBER(curType);
    var minNum = GET_KIPLING_BUILD_TYPE_NUMBER(minType);
    if(minNum < curNum) {
        return false;
    } else {
        return true;
    }
}
function CHECK_KIPLING_BETA_LEVEL() {
    return CHECK_KIPLING_BUILD_TYPE_LIMITATIONS(process.buildType, 'beta');
}

function createDeviceMatcher (device) {
    var selector = {
        firmware: device.getFirmwareVersion(),
        subclasses: [device.getSubclass()],
        type: device.getDeviceType()
    };

    selector.accept = function (newDevice) {
        var newDeviceFirmware = newDevice.getFirmwareVersion();
        var newDeviceSubclass = newDevice.getSubclass();

        if (selector.firmware < newDeviceFirmware)
            selector.firmware = newDeviceFirmware;

        if (selector.subclasses.indexOf(newDeviceSubclass) == -1)
            selector.subclasses.push(newDeviceSubclass);
    };

    selector.matches = function (module) {
        var isInternalComp = process.isInternalComputer;
        var isDevComp = process.isInternalComputer;
        
        var continueCheck = true;
        if (typeof(module.internalCompOnly) !== 'undefined') {
            if ((!isInternalComp) && (module.internalCompOnly === true)) {
                continueCheck = false;
            }
        }
        if (typeof(module.developCompOnly) !== 'undefined') {
            if ((!isDevComp) && (module.developCompOnly === true)) {
                if(!isInternalComp) {
                    continueCheck = false;
                }
            }
        }
        if (typeof(module.buildTypes) !== 'undefined') {
            var lowestNum = -1;
            module.buildTypes.forEach(function(type){
                if(GET_KIPLING_BUILD_TYPE_NUMBER(type) < lowestNum) {
                    lowestNum = GET_KIPLING_BUILD_TYPE_NUMBER(type);
                }
            });
            var curBuildType = process.buildType;
            var curBuildInt = GET_KIPLING_BUILD_TYPE_NUMBER(curBuildType);
            if (curBuildInt > lowestNum) {
                // continueCheck = false;
            }
        }

        if(continueCheck) {
            if (module.supportedDevices === undefined)
                return true;

            return module.supportedDevices.some(function (spec) {
                var matchesType = spec.type == selector.type;

                var hasMinFirmware = spec.minFW === undefined;
                hasMinFirmware = hasMinFirmware || spec.minFW <= selector.firmware;

                var hasSubclass = spec.subclass === undefined;
                hasSubclass = hasSubclass || spec.subclass.some(function (subclass){
                    return selector.subclasses.indexOf(subclass) != -1;
                });
                return matchesType && hasMinFirmware && hasSubclass;
            });
        } else {
            return false;
        }
    };

    return selector;
}
exports.createDeviceMatcher = createDeviceMatcher;


var shouldDisplayFuture = function (devices) {
    var deviceMatches = dict();
    devices.forEach(function (device) {
        var deviceMatcher = deviceMatches.get(device.getDeviceType(), null);
        if (deviceMatcher === null)
            deviceMatcher = createDeviceMatcher(device);
        else
            deviceMatcher.accept(device);
        deviceMatches.set(device.getDeviceType(), deviceMatcher);
    });

    return function (moduleInfo) {
        var matched = false;

        deviceMatches.forEach(function (matcher, deviceType) {
            if (matcher.matches(moduleInfo))
                matched = true;
        });

        return matched;
    };
};
exports.shouldDisplayFuture = shouldDisplayFuture;


/**
 * Get the modules currently marked as active that the user has installed.
 *
 * Get all of the modules that the user has installed filtered for all that are
 * marked as being "active" and visible to the user.
 *
 * @param {function} onError The function to call if an error is encountered
 *      while reading and filtering module information.
 * @param {function} onSuccess The function to call after reading and filtering
 *      module information. Should take a single argument: an Array of Object
 *      with module information.
**/
exports.getActiveModules = function(onError, onSuccess)
{
    fs_facade.getLoadedModulesInfo(onError, function(modules)
    {
        // console.log('Active Modules',modules);
        var activeModules = modules.filter(function(e) {
            if(e.isTask) {
                return false;
            } else {
                return e.active;
            }
        });
        onSuccess(activeModules);
    });
};

/**
 * Get information about the modules the user has installed for Switchboard.
 *
 * @param {function} onError The function to call if an error is encountered
 *      while reading module information.
 * @param {function} onSuccess The function to call after the module information
 *      is loaded. Should take one argument: an Array of Object with module
 *      information.
**/
exports.getModuleInfo = function(onError, onSuccess)
{
    fs_facade.getModuleInfo(onError, onSuccess);
};
