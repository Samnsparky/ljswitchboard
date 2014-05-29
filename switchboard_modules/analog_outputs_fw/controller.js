/**
 * Goals for the Lua Script Debugger module.
 * This is a Lua script intro-app that performs a minimal number of scripting
 * operations.  It is simply capable of detecting whether or not a Lua script
 * is running and then prints out the debugging log to the window.  
 *
 * @author Chris Johnson (LabJack Corp, 2014)
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
var MODULE_UPDATE_PERIOD_MS = 500;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};
    this.DACRegisters = {};
    this.moduleContext = {};
    this.activeDevice = undefined;

    this.currentValues = dict();
    this.bufferedValues = dict();
    this.bufferedOutputValues = dict();

    this.hasChanges = false;

    this.DAC_CHANNEL_READ_DELAY = 2;

    this.DAC_CHANNEL_PRECISION = 3;

    

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
        // Save Module Constant objects
        self.moduleConstants = framework.moduleConstants;
        self.DACRegisters = framework.moduleConstants.DACRegisters;

        var genericConfigCallback = function(data, onSuccess) {
            console.log('genericConfigCallback');
            onSuccess();
        };
        var genericPeriodicCallback = function(data, onSuccess) {
            
            var name = data.binding.binding;
            var value = Number(data.value.toFixed(self.DAC_CHANNEL_PRECISION));
            self.bufferedValues.set(name,value);
            // console.log('genericPeriodicCallback',data.binding.binding,value);
            onSuccess();
        };
        var writeBufferedDACValues = function(data, onSuccess) {
            if (self.hasChanges) {
                // console.log('in writeBufferedDACValues');
                self.bufferedOutputValues.forEach(function(newVal,address){
                    console.log('Updating',address,'with',newVal);
                    self.activeDevice.write(address,newVal);
                    self.currentValues.set(address,newVal);
                });
                self.hasChanges = false;
            }
            onSuccess();
        }
        var genericCallback = function(data, onSuccess) {
            console.log('genericCallback');
            onSuccess();
        };
        console.log('moduleConstants', self.moduleConstants);
        var smartBindings = [];

        var addSmartBinding = function(regInfo) {
            var binding = {};
            binding.bindingName = regInfo.name;
            binding.smartName = 'readRegister';
            binding.iterationDelay = self.DAC_CHANNEL_READ_DELAY;
            binding.periodicCallback = genericPeriodicCallback;
            binding.configCallback = genericConfigCallback;
            smartBindings.push(binding);
        };

        // Add DAC readRegisters
        self.DACRegisters.forEach(addSmartBinding);

        var customSmartBindings = [
            {
                // Define binding to handle Ethernet-Status updates.
                bindingName: 'dacUpdater', 
                smartName: 'periodicFunction',
                periodicCallback: writeBufferedDACValues
            }
            // ,{
            //     // Define binding to handle Ethernet Cancel button presses.
            //     bindingName: 'wifiHelpButton', 
            //     smartName: 'clickHandler',
            //     callback: self.wifiHelpButton
            // }
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

        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        onSuccess();
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        setupBindings.forEach(function(setupBinding){
            var name = setupBinding.address;
            var value;
            if(setupBinding.status === 'error') {
                value = 0;
            } else {
                value = setupBinding.result;
            }
            self.currentValues.set(name,value);
            self.bufferedOutputValues.set(name,value);
            self.hasChanges = false;
        });

        self.moduleContext.outputs = self.DACRegisters;
        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.formatVoltageTooltip = function(value) {
        return sprintf.sprintf("%.2f V", value);
    };
    this.writeDisplayedVoltage = function(register, selectedVoltage) {
        console.log(register,selectedVoltage);
        self.bufferedOutputValues.set(register,selectedVoltage);
        $('#' + register + '_input_slider').slider('setValue', selectedVoltage);
        $('#' + register + '_input_spinner').spinner('value', selectedVoltage);
        self.hasChanges = true;
    }
    this.onVoltageSelected = function(event) {
        var firingID = event.target.id;
        var selectedVoltage;
        var isValidValue = false;
        var register = firingID
            .replace('_input_spinner', '')
            .replace('_input_slider', '');

        if (firingID.search('_input_spinner') > 0) {
            var spinText = $('#'+firingID).val();
            if(spinText !== null) {
                isValidValue = (spinText !== null && spinText.match(/[\d]+(\.\d+)?$/g) !== null);
                selectedVoltage = Number(spinText);
            }
        } else {
            selectedVoltage = Number(
                $('#'+firingID).data('slider').getValue()
            );
            isValidValue = true;
        }
        if(isValidValue) {
            console.log('newVal',typeof(selectedVoltage),selectedVoltage,register);
            $('#'+register+'_input_spinner').css('border', 'none');
            self.writeDisplayedVoltage(register,selectedVoltage);
        } else {
            if (firingID.search('_input_spinner') > 0) {
                var spinText = $('#'+firingID).val();
                if (spinText !== null && !spinText.match(/\d+\./g)) {
                    $('#'+register+'_input_spinner').css('border', '1px solid red');
                }
            }
        }
    };
    // function onVoltageSelected(event)
    // {
    //     var register = Number(event.target.id.replace('-control', ''));
        
    //     var confirmationSelector = CONFIRMATION_DISPLAY_TEMPLATE(
    //         {register: register}
    //     );

    //     var selectedVoltage = Number($('#'+event.target.id).val());
        
    //     console.log($('#'+event.target.id).slider('getValue'));
    //     $(confirmationSelector).html(
    //         formatVoltageTooltip(selectedVoltage)
    //     );

    //     analogOutputDeviceController.setDAC(register, selectedVoltage).fail(
    //         function (err) {showAlert(err.retError);});
    // }
    /**
     * Create the DAC / analog output controls.
    **/
    this.createSliders = function()
    {
        $('.slider').unbind();
        var sliderObj = $('.slider').slider(
            {'formater': self.formatVoltageTooltip, 'value': 4.9}
        );
        // sliderObj.data('slider').setValue(1);
        sliderObj.bind('slide', self.onVoltageSelected);
        // $('.slider').slider(
        //     {'formater': self.formatVoltageTooltip, 'value': 0}
        // ).
    }
    this.createSpinners = function() {
        $( ".spinner" ).unbind();
        $( ".spinner" ).spinner({
            'step': 0.001,
            'numberFormat': "nV",
            'max': 5,
            'min': 0,
            'spin': self.onVoltageSelected,
            'stop': self.onVoltageSelected
        });
    }
    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        self.createSpinners();
        onSuccess();
    };
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        // console.log('in onTemplateDisplayed');
        self.createSliders();    
        self.DACRegisters.forEach(function(register){
            var val = self.currentValues.get(register.register);
            self.writeDisplayedVoltage(register.register,val);
        });
        onSuccess();
    }
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
        self.bufferedValues.forEach(function(value,key){
            self.currentValues.set(key,value);
        })
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
        console.log('in onRefreshError', description);
        if(typeof(description.retError) === 'number') {
            console.log('in onRefreshError',device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
