/**
 * Convienence functions for managing Switchboard modules.
 *
 * Convienence functions that allow for the management of late loaded modules
 * not bundled in the main executable.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var device_controller = require('./device_controller');
var fs_facade = require('./fs_facade');
var dict = require('dict');


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
		if (module.supportedDevices === undefined)
			return true;

		return module.supportedDevices.some(function (spec) {
			var matchesType = spec.type == selector.type;

			var hasMinFirmware = spec.minFW === undefined;
			hasMinFirmware = hasMinFirmware || spec.minFW <= selector.firmware;

			var hasSubclass = spec.subclass === undefined;
			hasSubclass = hasSubclass || spec.subclass.some(function (subclass){
				console.log(selector.subclasses);
				return selector.subclasses.indexOf(subclass) != -1;
			});
			console.log('type', matchesType,'fw', hasMinFirmware,'subClass', hasSubclass);
			return matchesType && hasMinFirmware && hasSubclass;
		});
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
    	console.log(modules);
        var activeModules = modules.filter(function(e) {return e.active;});
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
