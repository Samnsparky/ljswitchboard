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

    this.activeDevice = undefined;

    this.isEthernetConnected = false;
    this.isWifiConnected = false;

    this.currentValues = dict();
    this.saveConfigResult = function(address, value, status) {
        if(status === 'success') {
            if(address === 'WIFI_SSID') {
                if(value !== '') {
                    self.currentValues.set(address,value);
                } else {
                    self.currentValues.set(address,{val:null,fVal:null,status:'error'});
                }
            } else {
                self.currentValues.set(address,value);
            }
        } else {
            self.currentValues.set(address,{val:null,fVal:null,status:'error'});
        }
    };
    this.saveCurrentValue = function(address,value,formattedVal) {
        self.currentValues.set(address,{val:value,fVal:formattedVal});
    };

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
    this.unformatIPAddress = function(ipString) {
        var value = 0;
        var stringArray = ipString.split('.');
        value += stringArray[0] << 24;
        value += stringArray[1] << 16;
        value += stringArray[2] << 8;
        value += stringArray[3];
        return value;
    };
    this.dot2num = function(dot) 
    {
        var d = dot.split('.');
        return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);
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
        if (statusString === undefined) {
            statusString = "Status Unknown";
        }
        return statusString;
    };
    this.hideEthernetAlerts = function() {
        $('#ethernet_settings .configSettingsTable .alert').hide();
    };
    this.selectivelyShowEthernetAlerts = function() {
        var elements = $('#ethernet_settings .configSettingsTable .networkSetting input');
        elements.trigger('change');
    };
    this.showManualEthernetSettings = function() {
        $('#ethernet_settings .Auto_Value').hide();
        $('#ethernet_settings .Manual_Value').show();
        var dhcpToggleEl = $('#ethernet-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#ethernet-DHCP-Select-Toggle #Ethernet_DHCP_Manual').text());
        self.selectivelyShowEthernetAlerts();
    };
    this.showAutoEthernetSettings = function() {
        $('#ethernet_settings .Manual_Value').hide();
        $('#ethernet_settings .Auto_Value').show();
        var dhcpToggleEl = $('#ethernet-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#ethernet-DHCP-Select-Toggle #Ethernet_DHCP_Auto').text());
        self.hideEthernetAlerts();
    };
    this.setEthernetSettings = function(mode) {
        if(mode === 'auto') {
            self.showAutoEthernetSettings();
        } else {
            self.showManualEthernetSettings();
        }
    };
    this.toggleEthernetSettings = function() {
        if($('#ethernet_settings .Manual_Value').css('display') === 'none') {
            self.showManualEthernetSettings();
        } else {
            self.showAutoEthernetSettings();
        }
    };
    this.hideWifiAlerts = function() {
        $('#wifi_settings .wifiConfigSettingsTable .alert').hide();
    };
    this.selectivelyShowWifiAlerts = function() {
        var elements = $('#wifi_settings .configSettingsTable .networkSetting input');
        elements.trigger('change');
    };
    this.showManualWifiSettings = function() {
        $('#wifi_settings .Auto_Value').hide();
        $('#wifi_settings .Manual_Value').show();
        var dhcpToggleEl = $('#wifi-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#wifi-DHCP-Select-Toggle #WiFi_DHCP_Manual').text());
        self.selectivelyShowWifiAlerts();
    };
    this.showAutoWifiSettings = function() {
        $('#wifi_settings .Manual_Value').hide();
        $('#wifi_settings .Auto_Value').show();
        var dhcpToggleEl = $('#wifi-DHCP-Select-Toggle .btnText');
        dhcpToggleEl.text($('#wifi-DHCP-Select-Toggle #WiFi_DHCP_Auto').text());
        self.hideWifiAlerts();
    };
    this.setWifiSettings = function(mode) {
        if(mode === 'auto') {
            self.showAutoWifiSettings();
        } else {
            self.showManualWifiSettings();
        }
    };
    this.toggleWifiSettings = function() {
        if($('#wifi_settings .Manual_Value').css('display') === 'none') {
            self.showManualWifiSettings();
        } else {
            self.showAutoWifiSettings();
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
    this.getDHCPVal = function(settingID) {
        var manStr = " .btnText";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        var dhcpValues = {
            'DHCP Manual':0,
            'DHCP Auto':1,
        };
        var strVal = manualValEl.text();
        var value = "";
        var isNew = false;

        if(manualValEl.hasClass('inputVerified')) {
            value = dhcpValues[strVal];
            isNew = true;
        } else {
            value = dhcpValues[strVal];
            isNew = false;
        }
        return {value:value, isNew:isNew};
    };
    this.getToggleVal = function(settingID) {
        var manStr = " input";
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
    this.getInputVal = function(settingID) {
        var manStr = " input";
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
    this.setInputVal = function(settingID,val) {
        var manStr = " input";
        var manualValEl = $(self.buildJqueryIDStr(settingID) + manStr);
        manualValEl.val(val);
    };
    this.setNetworkName = function(networkName) {
        self.setInputVal('#WIFI_SSID_DEFAULT_VAL',networkName);
    };
    this.setWifiPassword = function(password) {
        self.setInputVal('#WIFI_PASSWORD_DEFAULT_VAL',password);
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
            
            var initValObj = self.currentValues.get(reg.name);
            if(initValObj !== null) {
                reg.initVal = initValObj.fVal;
            }
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
        return self.getIPRegisters(self.wifiRegisters,'name');
    };
    this.getEthernetIPRegisterList = function() {
        return self.getIPRegisters(self.ethernetRegisters,'name');
    };
    this.clearNewEthernetSettings = function() {
        self.getEthernetIPRegisterList().forEach(function(regName){
            var configData = self.clearManualVal(regName+'_VAL');
        });
    };

    this.getNewEthernetSettings = function() {
        var newEthernetSettingRegs = [];
        var newEthernetSettingVals = [];
        var ethernetSettingRegs = [];
        var ethernetSettingVals = [];
        self.getEthernetIPRegisterList().forEach(function(regName){
            var configData = self.getManualVal(regName+'_VAL');
            var ipVal = parseInt(self.dot2num(configData.value));
            if(configData.isNew) {
                newEthernetSettingRegs.push(regName+'_DEFAULT');
                newEthernetSettingVals.push(ipVal);
            }
            ethernetSettingRegs.push(regName+'_DEFAULT');
            ethernetSettingVals.push(ipVal);
        });
        var dhcpSetting = self.getDHCPVal('#ethernetDHCPSelect');
        if(dhcpSetting.isNew) {
            newEthernetSettingRegs.push('ETHERNET_DHCP_ENABLE_DEFAULT');
            newEthernetSettingVals.push(dhcpSetting.value);
        }
        ethernetSettingRegs.push('ETHERNET_DHCP_ENABLE_DEFAULT');
        ethernetSettingVals.push(dhcpSetting.value);
        return {
            newRegisters: newEthernetSettingRegs, 
            newValues: newEthernetSettingVals,
            registers: ethernetSettingRegs,
            values: ethernetSettingVals
        };
    };
    this.getNewWifiSettings = function() {
        var newWifiSettingRegs = [];
        var newWifiSettingVals = [];
        var wifiSettingRegs = [];
        var wifiSettingVals = [];
        self.getWiFiIPRegisterList().forEach(function(regName){
            var configData = self.getManualVal(regName+'_VAL');
            var ipVal = parseInt(self.dot2num(configData.value));
            if(configData.isNew) {
                newWifiSettingRegs.push(regName+'_DEFAULT');
                newWifiSettingVals.push(ipVal);
            }
            wifiSettingRegs.push(regName+'_DEFAULT');
            wifiSettingVals.push(ipVal);
        });
        var dhcpSetting = self.getDHCPVal('#wifiDHCPSelect');
        if(dhcpSetting.isNew) {
            newWifiSettingRegs.push('WIFI_DHCP_ENABLE_DEFAULT');
            newWifiSettingVals.push(dhcpSetting.value);
        }
        wifiSettingRegs.push('WIFI_DHCP_ENABLE_DEFAULT');
        wifiSettingVals.push(dhcpSetting.value);
        return {
            newRegisters: newWifiSettingRegs, 
            newValues: newWifiSettingVals,
            registers: wifiSettingRegs,
            values: wifiSettingVals
        };
    };
    this.resetAlertIcon = function(alertEl,inputTextEl) {
        var alertMessageEl = alertEl.find('.messageIcon');
        alertEl.hide();
        alertMessageEl.removeClass('icon-close');
        alertMessageEl.addClass('icon-checkmark-3');
        alertEl.removeClass('alert-block');
        alertEl.addClass('alert-success');
        alertEl.attr('title',"Valid IP Address");
        inputTextEl.removeClass('inputVerified');
    };
    this.showInvalidAlertIcon = function(alertEl,inputTextEl) {
        var alertMessageEl = alertEl.find('.messageIcon');
        alertMessageEl.addClass('icon-close');
        alertEl.addClass('alert-block');
        alertEl.attr('title',"Invalid IP Address");
        inputTextEl.removeClass('inputVerified');
        alertEl.show(); 
    };
    this.showValidAlertIcon = function(alertEl,inputTextEl) {
        var alertMessageEl = alertEl.find('.messageIcon');
        alertMessageEl.addClass('icon-checkmark-3');
        alertEl.addClass('alert-success');
        alertEl.attr('title',"Valid IP Address");
        inputTextEl.addClass('inputVerified');
        alertEl.show();
    };
    this.updateValidationStatus = function(isValid,classId,applyButtonId) {
        if(isValid) {
            var numInvalid = $('#'+classId+' .alert-block').length;
            var numNew = $('#'+classId+' .inputVerified').length;
            if((numInvalid === 0) && (numNew > 0)) {
                $('#'+applyButtonId+'').removeAttr('disabled');
            } else {
                $('#'+applyButtonId+'').attr('disabled','disabled');
            }
        } else {
            $('#'+applyButtonId+'').attr('disabled','disabled');
        }
    };
    this.updateWifiValidationStatus = function(isValid) {
        self.updateValidationStatus(isValid,'wifi_settings','wifiApplyButton');
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
                self.showValidAlertIcon(alertEl,inputTextEl);
                isValid = true;
            } else {
                self.showInvalidAlertIcon(alertEl,inputTextEl);
                isValid = false;
            } 
        } else {
            self.resetAlertIcon(alertEl,inputTextEl);
            isValid = true;
        }
        if (settingID.search('ETHERNET') >= 0 ) {
            self.updateValidationStatus(isValid,'ethernet_settings','ethernetApplyButton');
        } else {
            self.updateWifiValidationStatus(isValid);
        }
    };
    this.networkNameValidator = function(event) {
        var settingID = event.target.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var isValid = false;
        inputTextEl.removeClass('inputVerified');
        if(inputText !== "") {
            if(true) {
                alertMessageEl.removeClass('icon-close');
                alertMessageEl.addClass('icon-checkmark-3');
                alertEl.removeClass('alert-block');
                alertEl.addClass('alert-success');
                alertEl.attr('title','Valid Input');
                inputTextEl.addClass('inputVerified');
                alertEl.show();
            }
            isValid = true;
        } else {
            alertEl.hide();
            alertMessageEl.removeClass('icon-checkmark-3');
            alertMessageEl.addClass('icon-close');
            alertEl.addClass('alert-success');
            // alertEl.removeClass('alert-block');
            alertEl.attr('title','Valid Input');
            inputTextEl.removeClass('inputVerified');
            isValid = true;
        }
        self.updateWifiValidationStatus(isValid);
    };
    this.networkPasswordValidator = function(event) {
        var settingID = event.target.parentElement.parentElement.id;
        var alertJQueryStr = '#'+settingID+' .alert';
        var alertEl = $(alertJQueryStr);
        var alertMessageJQueryStr = alertJQueryStr + ' .messageIcon';
        var alertMessageEl = $(alertMessageJQueryStr);
        var inputTextEl = $('#'+settingID+' input');
        var inputText = event.target.value;
        var isValid = false;
        inputTextEl.removeClass('inputVerified');
        if(inputText !== "") {
            if(true) {
                alertMessageEl.removeClass('icon-close');
                alertMessageEl.addClass('icon-checkmark-3');
                alertEl.removeClass('alert-block');
                alertEl.addClass('alert-success');
                alertEl.attr('title','Valid Password');
                inputTextEl.addClass('inputVerified');
                alertEl.show();
            }
            isValid = true;
        } else {
            alertMessageEl.removeClass('icon-checkmark-3');
            alertMessageEl.addClass('icon-close');
            alertEl.removeClass('alert-success');
            alertEl.addClass('alert-block');
            alertEl.attr('title','Password Required');
            inputTextEl.removeClass('inputVerified');
            alertEl.show();
            isValid = false;
        }
        self.updateWifiValidationStatus(isValid);
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
    };
    this.attachInputValidators = function() {
        self.attachIPInputValidators();
        self.attachNetworkNameValidator();
        self.attachNetworkPasswordValidator();
    };
    this.ethernetPowerButton = function(data, onSuccess) {
        console.log('in ethernetPowerButton listener');
        onSuccess();
    };
    this.showEthernetDHCPChanged = function() {
        $('#ethernetDHCPSelect .dhcpAlert').show();
    };
    this.hideEthernetDHCPChanged = function() {
        $('#ethernetDHCPSelect .dhcpAlert').hide();
    };
    this.showWifiDHCPChanged = function() {
        $('#wifiDHCPSelect .dhcpAlert').show();
    };
    this.hideWifiDHCPChanged = function() {
        $('#wifiDHCPSelect .dhcpAlert').hide();
    };
    this.toggleDHCP = function() {
        var isEthernet = $('#ethernetDHCPSelect .dhcpAlert').css('display');
        var isWifi = $('#wifiDHCPSelect .dhcpAlert').css('display');
        if(isEthernet === 'none') {
            self.showEthernetDHCPChanged();
        } else {
            self.hideEthernetDHCPChanged();
        }
        if(isWifi === 'none') {
            self.showWifiDHCPChanged();
        } else {
            self.hideWifiDHCPChanged();
        }
    };
    this.ethernetDHCPSelect = function(data, onSuccess) {
        // console.log('in ethernetDHCPSelect listener',data.eventData);
        var dhcpOption = data.eventData.toElement.id;
        var dhcpTextId;
        var dhcpTextEl;

        if (dhcpOption === 'Ethernet_DHCP_Auto') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showAutoEthernetSettings();
            if(self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT').val === 0) {
                self.showEthernetDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            } else {
                self.hideEthernetDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            }
            self.updateValidationStatus(true,'ethernet_settings','ethernetApplyButton');
        } else if (dhcpOption === 'Ethernet_DHCP_Manual') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showManualEthernetSettings();
            if(self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT').val === 0) {
                self.hideEthernetDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            } else {
                self.showEthernetDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            }
            self.updateValidationStatus(true,'ethernet_settings','ethernetApplyButton');
        }
        onSuccess();

        //WIFI CODE
        // console.log('in wifiDHCPSelect listener');
        var dhcpOption = data.eventData.toElement.id;
        var dhcpTextId;
        var dhcpTextEl;

        if (dhcpOption === 'WiFi_DHCP_Auto') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showAutoWifiSettings();
            if(self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val === 0) {
                self.showWifiDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            } else {
                self.hideWifiDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            }
        } else if (dhcpOption === 'WiFi_DHCP_Manual') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showManualWifiSettings();
            if(self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val === 0) {
                self.hideWifiDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            } else {
                self.showWifiDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            }
        }
        self.updateWifiValidationStatus(true);
        onSuccess();
    };
    this.qPowerCycleEthernet = function() {
        var ioDeferred = q.defer();
        self.activeDevice.writeMany(
            ['POWER_ETHERNET','POWER_ETHERNET'],
            [0,1]
        );
        
        ioDeferred.resolve();
        return ioDeferred.promise;
    };
    this.powerCycleEthernet = function() {
        self.qPowerCycleEthernet()
        .then(function() {
            console.log('Success!');
        }, function(err) {
            console.log('err',err);
        });
    };
    this.ethernetApplyButton = function(data, onSuccess) {
        console.log('in ethernetApplyButton listener');
        var configData = self.getNewEthernetSettings();
        console.log('configData',configData);
        var newNames = configData.newRegisters;
        var newVals = configData.newVals;
        var names = configData.registers;
        var vals = configData.values;

        var applySettings = false;
        var ioError = function(err) {
            var ioDeferred = q.defer();
            if(typeof(err) === 'number') {
                console.log(self.ljmDriver.errToStrSync(err));
            } else {
                console.log('Ethernet Applying Settings Error',err);
            }
            ioDeferred.resolve();
            return ioDeferred.promise;
        };
        var writeSettings = function() {
            var ioDeferred = q.defer();
            if(newNames.length > 0) {
                applySettings = true;
                console.log('Writing',names,vals);
                self.activeDevice.writeMany(names,vals)
                .then(function() {
                    console.log('Finished Writing Ethernet Settings');
                    ioDeferred.resolve();
                }, function() {
                    ioDeferred.reject();
                });
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var applyEthernetSettings = function() {
            var ioDeferred = q.defer();
            self.activeDevice.writeMany(
                ['POWER_ETHERNET','POWER_ETHERNET'],
                [0,1])
            .then(function(){
                console.log('Successfully configured ethernet');
                ioDeferred.resolve();
            },function(err){
                console.log('Error configuring Ethernet...',err);
                ioDeferred.reject(err);
            });
            return ioDeferred.promise;
        };
        writeSettings()
        .then(applyEthernetSettings,ioError)
        // self.activeDevice.writeMany(newNames,newVals)
        .then(onSuccess,function(err) {
            console.log('Error Applying Ethernet Settings',err);
            onSuccess();
        });
    };
    this.ethernetCancelButton = function(data, onSuccess) {
        console.log('in ethernetCancelButton listener');
        onSuccess();
    };
    this.wifiPowerButton = function(data, onSuccess) {
        var getWifiResFunc = function(val,type) {
            var messages = [
                {'success':'disable wifi success','err':'disable wifi error'},
                {'success':'enable wifi success','err':'enable wifi error'}
            ];
            var fValStr = ['Disabled','Enabled'];
            var btnText = ['Turn WiFi On','Turn WiFi Off'];
            return function(result) {
                console.log(messages[val][type],result);
                self.saveCurrentValue('POWER_WIFI',val,fValStr[val]);
                self.saveCurrentValue('POWER_WIFI_DEFAULT',val,fValStr[val]);
                $('#wifiPowerButton .buttonText').text(btnText[val]);
                onSuccess();
            };
        };
        var curStatus = sdModule.currentValues.get('POWER_WIFI').val;
        if(curStatus === 0) {
            self.activeDevice.writeMany(
                ['POWER_WIFI','POWER_WIFI_DEFAULT'],
                [1,1]
            )
            .then(getWifiResFunc(1,'success'),getWifiResFunc(1,'err'));
        } else {
            self.activeDevice.writeMany(
                ['POWER_WIFI','POWER_WIFI_DEFAULT'],
                [0,0]
            )
            .then(getWifiResFunc(0,'success'),getWifiResFunc(0,'err'));
        }
    };
    this.readWifiStatus = function(onSuccess) {
        self.activeDevice.readMany(
            ['POWER_WIFI','POWER_WIFI_DEFAULT']
            )
        .then(function(data){
                console.log(data);
                onSuccess(data);
            },function(err){
                console.log(err);
            }
        );
    };
    this.wifiDHCPSelect = function(data, onSuccess) {
        // console.log('in wifiDHCPSelect listener');
        var dhcpOption = data.eventData.toElement.id;
        var dhcpTextId;
        var dhcpTextEl;

        if (dhcpOption === 'WiFi_DHCP_Auto') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showAutoWifiSettings();
            if(self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val === 0) {
                self.showWifiDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            } else {
                self.hideWifiDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            }
        } else if (dhcpOption === 'WiFi_DHCP_Manual') {
            dhcpTextId = data.eventData.toElement.parentElement.parentElement.parentElement.id;
            dhcpTextEl = $('#'+dhcpTextId+' .btnText');
            self.showManualWifiSettings();
            if(self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT').val === 0) {
                self.hideWifiDHCPChanged();
                dhcpTextEl.removeClass('inputVerified');
            } else {
                self.showWifiDHCPChanged();
                dhcpTextEl.addClass('inputVerified');
            }
        }
        self.updateWifiValidationStatus(true);
        onSuccess();
    };
    // Function that stalls the execution queue to wait for proper wifi state
    this.waitForWifiNotBlocking = function() {
        var ioDeferred = q.defer();
        var checkWifiStatus = function() {
            var innerIODeferred = q.defer();
            console.log('Reading Wifi Status (reg)');
            self.activeDevice.qRead('WIFI_STATUS')
            .then(function(result) {
                console.log('Wifi status (reg)',result);
                if((result != 2904) && (result != 2902)) {
                    innerIODeferred.resolve();
                } else {
                    innerIODeferred.reject();
                }
            },innerIODeferred.reject);
            return innerIODeferred.promise;
        };
        var getDelayAndCheck = function(iteration) {
            var iteration = 0;
            var timerDeferred = q.defer();
            var configureTimer = function() {
                console.log('configuring wifi status timer');
                setTimeout(delayedCheckWifiStatus,500);
            };
            var delayedCheckWifiStatus = function() {
                console.log('Reading Wifi Status (delay)',iteration);
                self.activeDevice.qRead('WIFI_STATUS')
                .then(function(result) {
                    console.log('Wifi status (delay)',result,iteration);
                    if((result != 2904) && (result != 2902)) {
                        timerDeferred.resolve();
                    } else {
                        iteration += 1;
                        configureTimer();
                    }
                },timerDeferred.reject);
            };
            configureTimer();
            return timerDeferred.promise;
        };
        checkWifiStatus()
        .then(ioDeferred.resolve,getDelayAndCheck)
        .then(ioDeferred.resolve,function(err){
            console.log('Failed to wait for WIFI_STATUS',err);
            ioDeferred.reject();
        });
        return ioDeferred.promise;
    };
    this.wifiApplyButton = function(data, onSuccess) {
        var configData = self.getNewWifiSettings();
        var newNames = configData.newRegisters;
        var newVals = configData.newVals;
        var names = configData.registers;
        var vals = configData.values;
        var networkName = self.getInputVal('WIFI_SSID_DEFAULT_VAL');
        var networkPassword = self.getInputVal('WIFI_PASSWORD_DEFAULT_VAL');

        var applySettings = false;

        var getIOError = function(message) {
            return function(err) {
                var ioDeferred = q.defer();
                if(typeof(err) === 'number') {
                    console.log(message,self.ljmDriver.errToStrSync(err));
                } else {
                    console.log('Wifi Applying Settings Error',message,err);
                }
                ioDeferred.resolve();
                return ioDeferred.promise;
            };
        };
        // Function that stalls the execution queue to wait for proper wifi state
        var waitForWifi = function() {
            var ioDeferred = q.defer();
            var checkWifiStatus = function() {
                var innerIODeferred = q.defer();
                // console.log('Reading Wifi Status (reg)');
                self.activeDevice.qRead('WIFI_STATUS')
                .then(function(result) {
                    if(result != 2904) {
                        innerIODeferred.resolve();
                    } else {
                        innerIODeferred.reject();
                    }
                },innerIODeferred.reject);
                return innerIODeferred.promise;
            };
            var getDelayAndCheck = function(iteration) {
                var timerDeferred = q.defer();
                var configureTimer = function() {
                    setTimeout(delayedCheckWifiStatus,500);
                };
                var delayedCheckWifiStatus = function() {
                    // console.log('Reading Wifi Status (delay)',iteration);
                    self.activeDevice.qRead('WIFI_STATUS')
                    .then(function(result) {
                        if(result != 2904) {
                            timerDeferred.resolve();
                        } else {
                            iteration += 1;
                            configureTimer();
                        }
                    },timerDeferred.reject);
                };
                configureTimer();
                return function() {
                    return timerDeferred.promise;
                };
            };
            checkWifiStatus()
            .then(ioDeferred.resolve,getDelayAndCheck(0))
            .then(ioDeferred.resolve,ioDeferred.reject);
            return ioDeferred.promise;
        };

        var writeSettings = function() {
            var ioDeferred = q.defer();
            if(newNames.length > 0) {
                applySettings = true;
                self.activeDevice.writeMany(names,vals)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var writeNetworkName = function() {
            var ioDeferred = q.defer();
            if(networkName.isNew) {
                applySettings = true;
                self.activeDevice.qWrite('WIFI_SSID_DEFAULT',networkName.value)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var writeNetworkPassword = function() {
            var ioDeferred = q.defer();
            if(networkPassword.isNew) {
                applySettings = true;
                self.activeDevice.qWrite('WIFI_PASSWORD_DEFAULT',networkPassword.value)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var applyWifiSettings = function() {
            var ioDeferred = q.defer();
            if(applySettings) {
                self.activeDevice.qWrite('WIFI_APPLY_SETTINGS',1)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                console.log('Not Applying Wifi Settings');
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
        var performWrites = networkPassword.isNew;
        if(performWrites) {
            waitForWifi()
            .then(writeSettings,getIOError('disableWifi'))
            .then(writeNetworkName,getIOError('writeSettings'))
            .then(writeNetworkPassword,getIOError('writeNetworkName'))
            .then(applyWifiSettings,getIOError('writeNetworkPassword'))
            .then(function() {
                    console.log('Successfully Applied Wifi Settings',names,vals);
                    onSuccess();
                },function(err) {
                    console.log('Error Applying Wifi Settings',err);
                    onSuccess();
            });
        } else {
            console.log('Must Enter a Network Password before applying settings');
            onSuccess();
        }
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
            // console.log('genericConfigCallback');
            onSuccess();
        };
        var genericPeriodicCallback = function(data, onSuccess) {
            // console.log('genericPeriodicCallback');
            onSuccess();
        };
        var ethernetStatusListner = function(data, onSuccess) {
            onSuccess();
        };
        var wifiStatusListner = function(data, onSuccess) {
            var currentStatus = self.currentValues.get('WIFI_STATUS').val;
            var newStatus = data.value;
            if(currentStatus == newStatus) {
                if (newStatus == 2903 ) {
                    self.saveCurrentValue('POWER_WIFI',0,'Disabled');
                    $('#wifiPowerButton .buttonText').text('Turn WiFi On');
                }
            } else {
                // console.log('WiFi Status has changed',data.value,data.stringVal);
                self.saveCurrentValue('WIFI_STATUS',data.value,data.stringVal);
                if( newStatus == 2900 ) {
                    self.isWifiConnected = true;
                    // console.log('Wifi Connected!');
                } else {
                    self.isWifiConnected = false;
                    // console.log('Wifi Disconnected!');
                }
            }

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
            var format;
            var customFormatFunc;
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
                if (regInfo.name === 'ETHERNET_IP') {
                    binding.periodicCallback = ethernetStatusListner;
                } else if (regInfo.name === 'WIFI_STATUS') {
                    binding.periodicCallback = wifiStatusListner;
                } else {
                    binding.periodicCallback = genericPeriodicCallback;
                }
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
        ];
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
        console.log('in onDeviceSelected');
        self.activeDevice = device;
        // self.activeDevice.setDebugFlashErr(true);

        framework.clearConfigBindings();
        framework.setStartupMessage('Waiting for Wifi Module to start');
        var dummyQ = function() {
            var deferred = q.defer();
            deferred.resolve();
            return deferred.promise;
        };
        // self.waitForWifiNotBlocking()
        dummyQ()
        .then(function(){
            console.log('Successfully delayed start');
            onSuccess();
        },function(err) {
            console.log('Error Delaying',err);
            onSuccess();
        });
    };
    this.configureModuleContext = function(framework) {
        // Load configuration data & customize view
        // self.moduleContext.ethernetIPRegisters = [];
        // self.moduleContext.wifiIPRegisters = [];

        // Get and save wifiNetworkName
        var networkNameDefault = self.currentValues.get('WIFI_SSID').fVal;
        self.moduleContext.wifiNetworkName = networkNameDefault;

        // Get and save ethernetPowerStatus
        var isEthernetPowered = self.currentValues.get('POWER_ETHERNET').val;
        if(isEthernetPowered === 0) {
            self.moduleContext.isEthernetPowered = false;
            self.moduleContext.ethernetPowerButtonString = 'Turn Ethernet On';
        } else {
            self.moduleContext.isEthernetPowered = true;
            self.moduleContext.ethernetPowerButtonString = 'Turn Ethernet Off';
        }

        // Get and save wifiPowerStatus
        var isWifiPowered = self.currentValues.get('POWER_WIFI').val;
        if(isWifiPowered === 0) {
            self.moduleContext.isWifiPowered = false;
            self.saveCurrentValue('POWER_WIFI',0,'Disabled');
            self.moduleContext.wifiPowerButtonString = 'Turn WiFi On';
        } else {
            self.moduleContext.isWifiPowered = true;
            self.saveCurrentValue('POWER_WIFI',1,'Enabled');
            self.moduleContext.wifiPowerButtonString = 'Turn WiFi Off';
        }

        self.moduleContext.isPro = null;
        if (self.activeDevice.getSubclass()) {
            self.moduleContext.isPro = true;
        }

        var initialEthernetDHCPStatus = self.currentValues.get('ETHERNET_DHCP_ENABLE_DEFAULT');
        if (initialEthernetDHCPStatus.val === 0) {
            self.moduleContext.ethernetDHCPStatusBool = false;
            self.moduleContext.ethernetDHCPStatusString = "DHCP Manual";
        } else {
            self.moduleContext.ethernetDHCPStatusBool = true;
            self.moduleContext.ethernetDHCPStatusString = "DHCP Auto";
        }

        var initialWifiDHCPStatus = self.currentValues.get('WIFI_DHCP_ENABLE_DEFAULT');
        if (initialWifiDHCPStatus.val === 0) {
            self.moduleContext.wifiDHCPStatusBool = false;
            self.moduleContext.wifiDHCPStatusString = "DHCP Manual";
        } else {
            self.moduleContext.wifiDHCPStatusBool = true;
            self.moduleContext.wifiDHCPStatusString = "DHCP Auto";
        }
        // console.log('Ethernet DHCP',
        //     initialEthernetDHCPStatus,
        //     self.moduleContext.ethernetDHCPStatusBool,
        //     self.moduleContext.ethernetDHCPStatusString);

        var initialEthernetIP = self.currentValues.get('ETHERNET_IP').val;
        if(initialEthernetIP === 0) {
            self.isEthernetConnected = false;
        } else {
            self.isEthernetConnected = true;
        }
        var initialWifiStatus = self.currentValues.get('WIFI_STATUS').val;
        if (initialWifiStatus === 2900) {
            self.isWifiConnected = true;
        } else {
            self.isWifiConnected = false;
        }

        var i;
        var dhcpStatus;
        // Get and save ethernetIPRegisterList
        var ethernetIPRegisters = self.getIPRegisters(self.ethernetRegisters);
        //Add the isDHCPAuto flag
        for(i=0;i<ethernetIPRegisters.length;i++){
            dhcpStatus = self.moduleContext.ethernetDHCPStatusBool;
            ethernetIPRegisters[i].isDHCPAuto = dhcpStatus;
        }
        self.moduleContext.ethernetIPRegisters = ethernetIPRegisters;

        // Get and save wifiIPRegisterList
        var wifiIPRegisters = self.getIPRegisters(self.wifiRegisters);
        //Add the isDHCPAuto flag
        for(i=0;i<wifiIPRegisters.length;i++){
            dhcpStatus = self.moduleContext.wifiDHCPStatusBool;
            wifiIPRegisters[i].isDHCPAuto = dhcpStatus;
        }
        self.moduleContext.wifiIPRegisters = wifiIPRegisters;

        // console.log('Init context',self.moduleContext);
        framework.setCustomContext(self.moduleContext);
    };
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        console.log('in onDeviceConfigured');
        var isConfigError = false;
        var errorAddresses = [];
        var errorBindings = dict();
        setupBindings.forEach(function(setupBinding){
            // console.log('Addr',setupBinding.address,'Status',setupBinding.status,'Val',setupBinding.result);
            console.log('Addr',setupBinding.address,':',setupBinding.formattedResult,setupBinding.result,setupBinding.status);
            if(setupBinding.status === 'error') {
                isConfigError = true;
                var addr = setupBinding.address;
                var dnrAddr = [
                    'WIFI_MAC',
                    'ETHERNET_MAC',
                    'WIFI_PASSWORD_DEFAULT'
                ];
                if(dnrAddr.indexOf(addr) < 0) {
                    errorAddresses.push(addr);
                    errorBindings.set(addr,framework.setupBindings.get(addr));
                }
            }
            self.saveConfigResult(
                setupBinding.address,
                {val:setupBinding.result,fVal:setupBinding.formattedResult,status:setupBinding.status},
                setupBinding.status
            );
        });
        console.log('Addresses Failed to Read:',errorAddresses);
        async.eachSeries(
            errorAddresses,
            function( addr, callback) {
                // console.log('Failed to read:',addr,);
                var binding = errorBindings.get(addr);
                self.activeDevice.qRead(addr)
                .then(function(result){
                    var strRes = "";
                    if(binding.format === 'customFormat') {
                        strRes = binding.formatFunc({value:result});
                    } else {
                        strRes = result;
                    }
                    console.log('re-read-success',addr,result,strRes);
                    callback();
                }, function(err) {
                    console.log('re-read-err',addr,err);
                    showAlert('Issues Loading Module'+err.toString());
                    callback();
                });
            }, function(err){
                // if any of the file processing produced an error, err would equal that error
                if( err ) {
                  // One of the iterations produced an error.
                  // All processing will now stop.
                  console.log('An Addresses failed to process');
                } else {
                  console.log('All Addresses have been processed successfully');
                }
                self.configureModuleContext(framework);
                onSuccess();
            });
        // console.log('errorBindings:')
        // errorBindings.forEach(function(b,name){
        //     console.log(name,b);
        // });
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        self.attachInputValidators();

        // self.setNetworkName('5PoundBass');
        // self.setNetworkName('- DEN Airport Free WiFi');
        // self.setNetworkName('Courtyard_GUEST');
        // self.setWifiPassword('smgmtbmb3cmtbc');
        self.setNetworkName('AAA');
        self.setWifiPassword('timmarychriskevin');

        // force validations to occur
        self.selectivelyShowEthernetAlerts();
        self.selectivelyShowWifiAlerts();
        
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
        // self.activeDevice.setDebugFlashErr(false);
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
        // console.log('in onRefreshError', description);
        if(typeof(description.retError) === 'number') {
            console.log('in onRefreshError',device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}

