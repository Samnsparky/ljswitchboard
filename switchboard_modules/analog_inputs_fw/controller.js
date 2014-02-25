/**
 * Logic for the Thermocouple Reading module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
 * @author Chris Johnson (LabJack Corp, 2013)
 *
 * Module Outline:
 *  1. Read Device Information
 *  2. Periodically Refresh Device Information
 *  3. Accept user input to Configure AINx Channels
 *  
 * Read Device Information:
 *  1. Read AINx_EF_TYPE register to determine if configuring a channel will 
 *     potentially have negative effects elsewhere.
 *  2. Read AINx_RANGE
 *  3. Read AINx_RESOLUTION_INDEX
 *  4. Read AINx_SETTLING_US
 *
 * Periodically Sample:
 *  1. AINx to get reported voltage value
 *  2. AINx_BINARY to get reported binary voltage value
 *
 * Configure AINx Channel:
 *  1. Accept input to change AINx_RANGE
 *  2. Accept input to change AINx_RESOLUTION_INDEX
 *  3. Accept input to change AINx_SETTLING_US
**/
var sprintf = require('sprintf').sprintf;

// Constant that determines device polling rate.
var MODULE_UPDATE_PERIOD_MS = 1000;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    //Define nop (do-nothing) function
    var nop = function(){};

    // Base-Register Variable for Configuring multiple thermocouples.
    var baseReg = 'AIN#(0:13)';

    // Expand baseReg & create baseRegister list using ljmmm.
    // ex: ['AIN0', 'AIN1', ... 'AIN13']
    var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);

    // Define support analog input ef-types
    var ain_ef_types = t7DeviceConstants.ainEFTypeOptions;

    // Supported analog input range options.
    var ainRangeOptions = t7DeviceConstants.ainRangeOptions;

    // Supported analog input resolution options.
    var ainResolutionOptions = t7DeviceConstants.ainResolutionOptions;

    // Supported analog input resolution options.
    var ainSettlingOptions = t7DeviceConstants.ainSettlingOptions;

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // Define the module's setupBindings
        var setupBindings = [
            {bindingClass: baseReg+'_EF_TYPE', binding: baseReg+'_EF_TYPE', direction: 'read'},
            {bindingClass: baseReg+'_RANGE', binding: baseReg+'_RANGE', direction: 'read'},
            {bindingClass: baseReg+'_RESOLUTION_INDEX', binding: baseReg+'_RESOLUTION_INDEX', direction: 'read'},
            {bindingClass: baseReg+'_SETTLING_US', binding: baseReg+'_SETTLING_US', direction: 'read'}
        ];

        // Save the setupBindings to the framework instance.
        framework.putSetupBindings(setupBindings);

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
        // Initialize variable where module config data will go.
        var moduleContext = {};

        // While configuring the device build a dict to be used for generating the
        // module's template.
        moduleContext.analogInputs = [];
        var configuredEFType = [];
        var configuredRange = [];
        var configuredResolution = [];
        var configuredSettlingUS = [];

        //Loop through results and save them appropriately.  
        setupBindings.forEach(function(binding, key){
            // console.log('key',key,'Address',binding.address,', Result: ',binding.result);
            if (key.search('_EF_TYPE') > 0) {
                if (binding.status === 'success') {
                    // Read was successful, save AINx_EF_TYPE state
                    configuredEFType.push(binding.result);
                } else {
                    // Read was not successful, on old devices this means 
                    // AINx_EF_TYPE is un-configured
                    configuredEFType.push(0);
                }
            } else if (binding.status === 'success') {
                if (key.search('_RANGE') > 0) {
                    configuredRange.push(binding.result.toFixed(3));
                } else if (key.search('_RESOLUTION_INDEX') > 0) {
                    configuredResolution.push(binding.result);
                } else if (key.search('_SETTLING_US') > 0) {
                    // console.log('settling: ',binding.result);
                    configuredSettlingUS.push(binding.result);
                }
            } else {
                console.log(
                    'SetupBinding Read Fail',
                    binding.address, 
                    binding.result
                );
            }
        });

        baseRegisters.forEach( function (reg, index) {
            var style = "display:none";
            var ainRangeMenuOptions = [];
            var ainResolutionMenuOptions = [];
            var ainSettlingMenuOptions = [];

            ainRangeOptions.forEach(function(type){
                ainRangeMenuOptions.push({
                    name:type.name,
                    value:type.value,
                    selected:''
                });
            });

            ainResolutionOptions.forEach(function(type){
                ainResolutionMenuOptions.push({
                    name:type.name,
                    value:type.value,
                    selected:''
                });
            });

            ainSettlingOptions.forEach(function(type){
                ainSettlingMenuOptions.push({
                    name:type.name,
                    value:type.value,
                    selected:''
                });
            });

            // Populate ainRangeMenuOptions
            for(i = 0; i < ainRangeMenuOptions.length; i++) {
                if(ainRangeMenuOptions[i].value == configuredRange[index]){
                    ainRangeMenuOptions[i].selected = 'selected';
                    break;
                }
            }

            // Populate ainResolutionMenuOptions
            for(i = 0; i < ainResolutionMenuOptions.length; i++) {
                if(ainResolutionMenuOptions[i].value == configuredResolution[index]){
                    ainResolutionMenuOptions[i].selected = 'selected';
                    break;
                }
            }

            // Populate ainSettlingMenuOptions
            // for(i = 0; i < ainSettlingMenuOptions.length; i++) {
            //     if(ainSettlingMenuOptions[i].value === configuredSettlingUS[index]){
            //         ainSettlingMenuOptions[i].selected = 'selected';
            //         break;
            //     }
            // }
            moduleContext.analogInputs.push({
                "name": reg,
                "style": style,
                "ainRangeMenuOptions": ainRangeMenuOptions,
                "ainResolutionMenuOptions": ainResolutionMenuOptions,
                "ainSettlingMenuOptions": ainSettlingMenuOptions,
            });
            
        });
        framework.setCustomContext(moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {

        // Define device-configuration event handler function.
        var configDevice = function(data, onSuccess) {
            var handleConfigError = function(err) {
                console.log('configError',err,binding,value);
                onSuccess();
            }
            console.log(data.binding.bindingClass,'!event!');
            var framework = data.framework;
            var device = data.device;
            var binding = data.binding.binding.split('-callback')[0];
            var value = Number(data.value);

            console.log('binding: ',binding,', value:',value);

            device.qWrite(binding,value)
            .then(onSuccess,handleConfigError)
        };

        // Define the module's run-time bindings:
        var moduleBindings = [
            {
                // Define binding to automatically read AINx Registers.
                bindingClass: baseReg, 
                template: baseReg, 
                binding: baseReg, 
                direction: 'read', 
                format: '%0.6f'
            },
            {
                // Define binding to automatically read AINx_BINARY Registers.
                bindingClass: baseReg+'_BINARY', 
                template: baseReg+'_BINARY',   
                binding: baseReg+'_BINARY',    
                direction: 'read',  
                format: '%d'
            },
            {
                // Define binding to handle AINx_RANGE user inputs.
                bindingClass: baseReg+'-analog-input-range-select',  
                template: baseReg+'-analog-input-range-select', 
                binding: baseReg+'_RANGE-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDevice
            },
            {
                // Define binding to handle AINx_RESOLUTION user inputs.
                bindingClass: baseReg+'-analog-input-resolution-select',  
                template: baseReg+'-analog-input-resolution-select', 
                binding: baseReg+'_RESOLUTION_INDEX-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDevice
            },
            {
                // Define binding to handle AINx_SETTLING_US user inputs.
                bindingClass: baseReg+'-analog-input-settling-select',  
                template: baseReg+'-analog-input-settling-select', 
                binding: baseReg+'_SETTLING_US-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDevice
            },
            {
                // Define binding to handle display/hide option-button presses.
                bindingClass: baseReg+'-options-toggle-button',  
                template: baseReg+'-options-toggle-button', 
                binding: baseReg+'-callback',  
                direction: 'write', 
                event: 'click',
                writeCallback: function(data, onSuccess) {
                    var binding = data.binding;
                    var value = data.value;
                    console.log('OptionsButton-event');
                    var btnObj = $('#'+binding.template);
                    // Switch based off icon state
                    if(btnObj.hasClass('icon-plus'))  {
                        btnObj.removeClass('icon-plus');
                        btnObj.addClass('icon-minus');
                        $('#'+binding.template+'-options').fadeIn(
                            FADE_DURATION,
                            onSuccess
                            );
                    } else if(btnObj.hasClass('icon-minus'))  {
                        btnObj.removeClass('icon-minus');
                        btnObj.addClass('icon-plus');
                        $('#'+binding.template+'-options').fadeOut(
                            FADE_DURATION,
                            onSuccess
                            );
                    } else {
                        onSuccess();
                    }
                }
            },
        ];

        // Save the bindings to the framework instance.
        framework.putConfigBindings(moduleBindings);
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        framework.clearConfigBindings();
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
