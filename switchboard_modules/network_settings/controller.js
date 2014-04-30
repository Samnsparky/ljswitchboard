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

    this.activeDevice;

    this.currentValues = dict();
    this.saveConfigResult = function(address, value, status) {
        if(status === 'success') {
            if(address === 'WIFI_SSID') {
                if(value !== '') {
                    self.currentValues.set(address,value);
                } else {
                    self.currentValues.set(address,null);
                }
            } else {
                self.currentValues.set(address,value);
            }
        } else {
            self.currentValues.set(address,null);
        }
    }

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
            2907: 'DHCP Started',
            2908: 'Unknown',
            2909: 'Other'
        }[status];
        if (statusString == undefined) {
            statusString = "Status Unknown";
        }
        return statusString;
    };

    this.ShowManualEthernetSettings = function() {
        $('#ethernet_settings .Auto_Value').hide();
        $('#ethernet_settings .Manual_Value').show();
    };
    this.ShowAutoEthernetSettings = function() {
        $('#ethernet_settings .Manual_Value').hide();
        $('#ethernet_settings .Auto_Value').show();
    };
    this.setEthernetSettings = function(mode) {
        if(mode === 'auto') {
            self.ShowAutoEthernetSettings();
        } else {
            self.ShowManualEthernetSettings();
        }
    };
    this.toggleEthernetSettings = function() {
        if($('#ethernet_settings .Manual_Value').css('display') === 'none') {
            self.ShowManualEthernetSettings();
        } else {
            self.ShowAutoEthernetSettings();
        }
    };
    this.ShowManualWifiSettings = function() {
        $('#wifi_settings .Auto_Value').hide();
        $('#wifi_settings .Manual_Value').show();
    };
    this.ShowAutoWifiSettings = function() {
        $('#wifi_settings .Manual_Value').hide();
        $('#wifi_settings .Auto_Value').show();
    };
    this.setWifiSettings = function(mode) {
        if(mode === 'auto') {
            self.ShowAutoWifiSettings();
        } else {
            self.ShowManualWifiSettings();
        }
    };
    this.toggleWifiSettings = function() {
        if($('#wifi_settings .Manual_Value').css('display') === 'none') {
            self.ShowManualWifiSettings();
        } else {
            self.ShowAutoWifiSettings();
        }
    };
    this.buildJqueryIDStr = function(idStr) {
        var jqueryStr = "";
        if(idStr.search('#') === 0) {
            jqueryStr = idStr;
        } else {
            jqueryStr = "#"+idStr;
        }
        return jqueryStr;
    };
    this.setAutoVal = function(settingID,val) {
        var autoValEl = $(self.buildJqueryIDStr(settingID) + '.Auto_Value');
        autoValEl.text(val);
    };
    this.getAutoVal = function(settingID) {
        var autoValEl = $(self.buildJqueryIDStr(settingID) + '.Auto_Value');
        return {value:autoValEl.text()};
    };
    this.setManualVal = function(settingID,val) {
        var manStr = " .Manual_Value input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        manualValEl[0].placeholder = val;
    };
    this.getManualVal = function(settingID) {
        var manStr = " .Manual_Value input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        var value = "";
        var isNew = false;
        if(manualValEl.hasClass('inputVerified')) {
            value = manualValEl.val();
            isNew = true;
        } else {
            value = manualValEl[0].placeholder;
            isNew = false;
        }
        return {value:value, isNew:isNew};
    };
    this.clearManualVal = function(settingID) {
        var manStr = " .Manual_Value input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        manualValEl.val('');
        manualValEl.trigger('change');
    };
    this.getIPRegisters = function(constList, attribute) {
        var regList = [];
        constList.forEach(function(reg) {
            if ((reg.type === 'ip') && (reg.isConfig)){
                if ((attribute === '')||(typeof(attribute) === 'undefined')) {
                    regList.push(reg);
                } else {
                    regList.push(reg[attribute]);
                }
            }
        });
        return regList;
    };
    this.getWiFiIPRegisterList = function() {
        return self.getIPRegisterList(self.wifiRegisters,'name');
    };
    this.getEthernetIPRegisterList = function() {
        return self.getIPRegisterList(self.ethernetRegisters,'name');
    };
    this.clearNewEthernetSettings = function() {
        self.getEthernetIPRegisterList().forEach(function(regName){
            var configData = self.clearManualVal(regName+'_VAL');
        });
    };
    this.getNewEthernetSettings = function() {
        var newEthernetSettingRegs = [];
        var newEthernetSettingVals = [];
        self.getEthernetIPRegisterList().forEach(function(regName){
            var configData = self.getManualVal(regName+'_VAL');
            if(configData.isNew) {
                newEthernetSettingRegs.push(regName);
                newEthernetSettingVals.push(configData.value);
            }
        });
        return {
            registers: newEthernetSettingRegs, 
            values: newEthernetSettingVals
        };
    };
    this.ipAddressValidator = function(event) {
        var settingID = event.target.parentElement.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;  

        var isValid = true;
        if(inputText !== "") {
            // Remove Existing styles 
            alertMessageEl.removeClass('icon-checkmark-3');
            alertEl.removeClass('alert-success');
            alertMessageEl.removeClass('icon-close');
            alertEl.removeClass('alert-block');
            alertEl.removeAttr('title');
            inputTextEl.removeClass('inputVerified');

            // Add appropriate styles
            if(inputText.match(ipformat))  {  
                alertMessageEl.addClass('icon-checkmark-3');
                alertEl.addClass('alert-success');
                alertEl.attr('title',"Valid IP Address");
                inputTextEl.addClass('inputVerified');
                alertEl.show();
                isValid = true;
            } else {  
                alertMessageEl.addClass('icon-close');
                alertEl.addClass('alert-block');
                alertEl.attr('title',"Invalid IP Address");
                inputTextEl.removeClass('inputVerified');
                alertEl.show(); 
                isValid = false;
            } 
        } else {
            alertEl.hide();
            alertMessageEl.addClass('icon-checkmark-3');
            alertEl.addClass('alert-success');
            alertEl.attr('title',"Valid IP Address");
            inputTextEl.removeClass('inputVerified');
            isValid = true;
        }
        if (settingID.search('ETHERNET') >= 0 ) {
            if(!isValid) {
                $('#ethernetApplyButton').attr('disabled','disabled');
            } else {
                var numValid = $('#ethernet_settings .alert-success').length;
                if(numValid >= 5) {
                    $('#ethernetApplyButton').removeAttr('disabled');
                }
            }
        } else {
            if(!isValid) {
                $('#wifiApplyButton').attr('disabled','disabled');
            } else {
                var numValid = $('#wifi_settings .alert-success').length;
                if(numValid >= 3) {
                    $('#wifiApplyButton').removeAttr('disabled');
                }
            }
        }
    };
    this.networkNameValidator = function(event) {
        // console.log('in networkNameValidator', event);
        var settingID = event.target.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var isValid = false;
        if(inputText !== "") {
            if(true) {
                alertMessageEl.addClass('icon-checkmark-3');
                alertEl.addClass('alert-success');
                alertEl.attr('title','Valid Input');
                inputTextEl.addClass('inputVerified');
                alertEl.show();
            }
            isValid = true;
        } else {
            alertEl.hide();
            alertMessageEl.addClass('icon-checkmark-3');
            alertEl.addClass('alert-success');
            alertEl.attr('title','Valid Input');
            inputTextEl.removeClass('inputVerified');
            isValid = true;
        }
    };
    this.networkPasswordValidator = function(event) {
        // console.log('in networkPasswordValidator', event);
        var settingID = event.target.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var isValid = false;
        if(inputText !== "") {
            if(true) {
                alertMessageEl.addClass('icon-checkmark-3');
                alertEl.addClass('alert-success');
                alertEl.attr('title','Valid Input');
                inputTextEl.addClass('inputVerified');
                alertEl.show();
            }
            isValid = true;
        } else {
            alertEl.hide();
            alertMessageEl.addClass('icon-checkmark-3');
            alertEl.addClass('alert-success');
            alertEl.attr('title','Valid Input');
            inputTextEl.removeClass('inputVerified');
            isValid = true;
        }
    };
    this.attachIPInputValidators = function() {
        var inputElements = $('.networkSetting .ipAddress');
        inputElements.bind('change',self.ipAddressValidator);
        // console.log('attaching validators',inputElements);
    };
    this.attachNetworkNameValidator = function() {
        var networkNameEl = $('#WIFI_SSID_DEFAULT_VAL input');
        // console.log('attaching validator...',networkNameEl);
        networkNameEl.bind('change',self.networkNameValidator);
    };
    this.attachNetworkPasswordValidator = function() {
        var networkPasswordEl = $('#WIFI_PASSWORD_DEFAULT_VAL input');
        // console.log('attaching validator...',networkPasswordEl);
        networkPasswordEl.bind('change',self.networkPasswordValidator);
    }
    this.attachInputValidators = function() {
        self.attachIPInputValidators();
        self.attachNetworkNameValidator();
        self.attachNetworkPasswordValidator();
    };
    this.ethernetPowerButton = function(data, onSuccess) {
        console.log('in ethernetPowerButton listener');
        onSuccess();
    };
    this.ethernetDHCPSelect = function(data, onSuccess) {
        console.log('in ethernetDHCPSelect listener',data.eventData);
        var dhcpOption = data.eventData.target.id
        if (dhcpOption === 'DHCP_Auto') {

        } else if (dhcpOption === 'DHCP_Manual') {

        }
        onSuccess();
    };
    this.ethernetApplyButton = function(data, onSuccess) {
        console.log('in ethernetApplyButton listener');
        onSuccess();
    };
    this.ethernetCancelButton = function(data, onSuccess) {
        console.log('in ethernetCancelButton listener');
        onSuccess();
    };
    this.wifiPowerButton = function(data, onSuccess) {
        console.log('in wifiPowerButton listener');
        onSuccess();
    };
    this.wifiDHCPSelect = function(data, onSuccess) {
        console.log('in wifiDHCPSelect listener');
        onSuccess();
    };
    this.wifiApplyButton = function(data, onSuccess) {
        console.log('in wifiApplyButton listener');
        onSuccess();
    };
    this.wifiCancelButton = function(data, onSuccess) {
        console.log('in wifiCancelButton listener');
        onSuccess();
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
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
            var binding = {};
            var format = undefined;
            var customFormatFunc = undefined;
            var isPeriodic = (typeof(regInfo.isPeriodic) === 'boolean');
            isPeriodic &= (regInfo.isPeriodic);
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
            
            binding.bindingName = regInfo.name;
            binding.format = format;
            binding.customFormatFunc = customFormatFunc;
            
            if (isPeriodic) {
                binding.smartName = 'readRegister';
                binding.periodicCallback = genericPeriodicCallback;
            } else {
                binding.smartName = 'setupOnlyRegister';
            }
            binding.configCallback = genericConfigCallback;
            smartBindings.push(binding);

        };

        // Add Ethernet readRegisters
        self.ethernetRegisters.forEach(addSmartBinding);
        // Add Wifi readRegisters
        self.wifiRegisters.forEach(addSmartBinding);

        var customSmartBindings = [
            {
                // Define binding to handle Ethernet Power button presses.
                bindingName: 'ethernetPowerButton', 
                smartName: 'clickHandler',
                callback: self.ethernetPowerButton
            },{
                // Define binding to handle Ethernet DHCP-select button presses.
                bindingName: 'ethernet-DHCP-Select-Toggle', 
                smartName: 'clickHandler',
                callback: self.ethernetDHCPSelect
            },{
                // Define binding to handle Ethernet Apply button presses.
                bindingName: 'ethernetApplyButton', 
                smartName: 'clickHandler',
                callback: self.ethernetApplyButton
            },{
                // Define binding to handle Ethernet Cancel button presses.
                bindingName: 'ethernetCancelButton', 
                smartName: 'clickHandler',
                callback: self.ethernetCancelButton
            },{
                // Define binding to handle Wifi Power button presses.
                bindingName: 'wifiPowerButton', 
                smartName: 'clickHandler',
                callback: self.wifiPowerButton
            },{
                // Define binding to handle Wifi DHCP-select button presses.
                bindingName: 'wifi-DHCP-Select-Toggle', 
                smartName: 'clickHandler',
                callback: self.wifiDHCPSelect
            },{
                // Define binding to handle Wifi Apply button presses.
                bindingName: 'wifiApplyButton', 
                smartName: 'clickHandler',
                callback: self.wifiApplyButton
            },{
                // Define binding to handle Wifi Cancel button presses.
                bindingName: 'wifiCancelButton', 
                smartName: 'clickHandler',
                callback: self.wifiCancelButton
            }
        ]
        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);
        // Save the customSmartBindings to the framework instance.
        framework.putSmartBindings(customSmartBindings);
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
        self.activeDevice = device;
        framework.clearConfigBindings();
        onSuccess();
    };
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        console.log('in onDeviceConfigured');
        setupBindings.forEach(function(setupBinding){
            // console.log('Addr',setupBinding.address,'Status',setupBinding.status,'Val',setupBinding.result);
            console.log('Addr',setupBinding.address,':',setupBinding.formattedResult);
            self.saveConfigResult(
                setupBinding.address,
                setupBinding.result,
                setupBinding.status
            );
        });
        
        // Load configuration data & customize view
        self.moduleContext.ethernetIPRegisters = {}

        // Get and save ethernetIPRegisterList
        var ethernetIPRegisters = self.getIPRegisters(self.ethernetRegisters);
        self.moduleContext.ethernetIPRegisters = ethernetIPRegisters;

        // Get and save wifiIPRegisterList
        var wifiIPRegisters = self.getIPRegisters(self.wifiRegisters);
        self.moduleContext.wifiIPRegisters = wifiIPRegisters;

        self.moduleContext.isPro = null;
        if (self.activeDevice.getSubclass()) {
            self.moduleContext.isPro = true
        }
        console.log('Device Selected:',self.activeDevice.getSubclass());
        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        self.attachInputValidators();
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
        // console.log('in onRefresh',framework.moduleName);
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        // console.log('in onRefreshed',framework.moduleName);
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
        if(typeof(description.retError) === 'number') {
            console.log(device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}

