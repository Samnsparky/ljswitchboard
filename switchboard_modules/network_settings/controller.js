/**
 * Goals for the Lua Script Debugger module.
 * This is a Lua script intro-app that performs a minimal number of scripting
 * operations.  It is simply capable of detecting whether or not a Lua script
 * is running and then prints out the debugging log to the window.  
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
 * Configuration:
 * No configuration of the device is required
 *
 * Periodic Processes:
 *     1. Read from "LUA_RUN" register to determine if a Lua script is running.
 *     2. Read from "LUA_DEBUG_NUM_BYTES" register to determine how much data is
 *         available in the debugging info buffer.
 *     3. If there is data available in the debugging buffer then get it from
 *         the device. 
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};
    this.configOnlyRegisters = {};
    this.ethernetRegisters = {};
    this.wifiRegisters = {};

    this.moduleContext = {};

    this.formatIPAddress = function(info) {
        var ipAddress = info.value;
        var ipString = "";
        ipString += ((ipAddress>>24)&0xFF).toString();
        ipString += ".";
        ipString += ((ipAddress>>16)&0xFF).toString();
        ipString += ".";
        ipString += ((ipAddress>>8)&0xFF).toString();
        ipString += ".";
        ipString += ((ipAddress)&0xFF).toString();
        return ipString;
    };
    this.formatStatus = function(info) {
        var status = info.value;
        var statusString = "";
        if(status > 0) {
            statusString = "Enabled";
        } else {
            statusString = "Disabled";
        }
        return statusString;
    };
    this.formatRSSI = function(info) {
        var rssi = info.value;
        var rssiString = "";
        rssiString = rssi.toString() + "dB";
        return rssiString;
    };
    this.formatWifiStatus = function(info) {
        var status = info.value;
        var statusString = {
            2900: 'Associated',
            2901: 'Associating',
            2902: 'Association Failed',
            2903: 'Un-Powered',
            2904: 'Booting Up',
            2905: 'Could Not Start',
            2906: 'Applying Settings',
            2907: 'Associated',
            2908: 'Unknown',
            2909: 'Other'
        }[status];
        if (statusString == undefined) {
            statusString = "Status Unknown";
        }
        return statusString;
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // Save Module Constant objects
        self.moduleConstants = framework.moduleConstants;
        self.configOnlyRegisters = framework.moduleConstants.configOnlyRegisters;
        self.ethernetRegisters = framework.moduleConstants.ethernetRegisters;
        self.wifiRegisters = framework.moduleConstants.wifiRegisters;

        var genericConfigCallback = function(data, onSuccess) {
            console.log('genericConfigCallback');
            onSuccess();
        };
        var genericPeriodicCallback = function(data, onSuccess) {
            // console.log('genericPeriodicCallback');
            onSuccess();
        };
        var genericCallback = function(data, onSuccess) {
            console.log('genericCallback');
            onSuccess();
        };
        console.log('moduleConstants', self.moduleConstants);
        var smartBindings = [];

        // Add setupOnlyRegisters
        self.configOnlyRegisters.forEach(function(regInfo){
            smartBindings.push({
                bindingName: regInfo.name, 
                smartName: 'setupOnlyRegister',
                configCallback: genericConfigCallback
            });
        });

        var addSmartBinding = function(regInfo) {
            var format = undefined;
            var customFormatFunc = undefined;
            if (regInfo.type === 'ip') {
                format = 'customFormat';
                customFormatFunc = self.formatIPAddress; 
            } else if (regInfo.type === 'status') {
                format = 'customFormat';
                customFormatFunc = self.formatStatus; 
            } else if (regInfo.type === 'rssi') {
                format = 'customFormat';
                customFormatFunc = self.formatRSSI;
            } else if (regInfo.type === 'wifiStatus') {
                format = 'customFormat';
                customFormatFunc = self.formatWifiStatus;
            }
            smartBindings.push({
                bindingName: regInfo.name, 
                smartName: 'readRegister',
                configCallback: genericConfigCallback,
                periodicCallback: genericPeriodicCallback,
                format: format,
                customFormatFunc: customFormatFunc
            });
        };

        // Add Ethernet readRegisters
        self.ethernetRegisters.forEach(addSmartBinding);
        // Add Wifi readRegisters
        self.wifiRegisters.forEach(addSmartBinding);


        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);
        onSuccess();
    };
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        framework.clearConfigBindings();
        onSuccess();
    };
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // Load configuration data & customize view
        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        // console.log('in onRegisterWrite',binding);
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        // console.log('in onRefreshed',results);
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        onSuccess();
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        onHandle(true);
    };

    var self = this;
}

