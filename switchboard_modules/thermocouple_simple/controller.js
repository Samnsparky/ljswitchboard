/**
 * Logic for the analog input module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
 * @author Chris Johnson (LabJack Corp, 2013)
**/

console.log('Defining The Module');
var MODULE_UPDATE_PERIOD_MS = 1000;
// var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = true;

function module() {
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        console.log('in onModuleLoaded');
        testBinding = {
            class: '#AIN0',
            template: 'AIN0',
            binding: 'AIN0',
            direction: 'read',
            format: '%.10f'
        };
        framework.putConfigBinding(testBinding);
        testBinding = {
            class: '#AIN0_EF_READ_A',
            template: 'AIN0_EF_READ_A',
            binding: 'AIN0_EF_READ_A',
            direction: 'read',
            format: '%.10f'
        };
        framework.putConfigBinding(testBinding);
        onSuccess();
    }
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        console.log('in onDeviceSelected', device);
                /**
        1. Re-configure analog input range registers using "AIN_ALL_RANGE" register
        2. Write 0 to AINx_EF_TYPE in order to re-set all EF config values
        3. Configure AINx_EF_TYPE to the proper thermocouple constant:
            20: typeE
            21: typeJ
            22: typeK
            23: typeR
            24: typeT
        4. Set AINx_EF_CONFIG_B to 60052 to __XXXX-DESCRIPTION-XXXX__
        **/
        device.write('AIN_ALL_RANGE',0.1);
        device.write('AIN0_EF_TYPE',0);
        device.write('AIN0_EF_TYPE',22);
        device.write('AIN0_EF_CONFIG_A',0);
        device.write('AIN0_EF_CONFIG_B',60052);
        onSuccess();
    }
    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        console.log('in onTemplateLoaded');
        onSuccess();
    }
    this.onRegisterWrite = function(framework, registerName, value, onError, onSuccess) {
        console.log('in onRegisterWrite');
        onSuccess();
    }
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        console.log('in onRegisterWritten');
        onSuccess();
    }
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        console.log('in onRefresh');
        onSuccess();
    }
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        console.log('in onRefreshed');
        onSuccess();
    }
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        console.log('in onCloseDevice', device);
        onSuccess();
    }
    this.onUnloadModule = function(framework, onError, onSuccess) {
        console.log('in onUnloadModule');
        onSuccess();
    }
    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    }
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    }
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        onHandle(false);
    }
}



 