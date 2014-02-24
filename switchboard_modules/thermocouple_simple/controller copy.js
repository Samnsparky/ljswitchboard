/**
 * Logic for the Thermocouple Reading module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
 * @author Chris Johnson (LabJack Corp, 2013)
 *
 * Configure Device:
    1. Re-configure analog input range registers using "AIN_ALL_RANGE" register
    2. Write 0 to AINx_EF_TYPE in order to re-set all EF config values
    3. Configure AINx_EF_TYPE to the proper thermocouple constant:
        20: typeE
        21: typeJ
        22: typeK
        23: typeR
        24: typeT
    4. Set AINx_EF_CONFIG_B to 60052 to __XXXX-DESCRIPTION-XXXX__

 * Periodically sample:
    1. Read AINx_EF_READ_A for a converted thermocouple reading.  
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
    // Base-Register Variable for Configuring multiple thermocouples.
    var baseReg = 'AIN#(0:13)';

    // Expand baseReg & create baseRegister list using ljmmm.
    // ex: ['AIN0', 'AIN1', ... 'AIN13']
    var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);

    // Supported thermocouple types & associated constants.
    var thermocoupleTypes =  
        [
            {"name": "TypeE","value": 20},
            {"name": "TypeJ","value": 21},
            {"name": "TypeK","value": 22},
            {"name": "TypeR","value": 23},
            {"name": "TypeT","value": 24}
        ];
    this.thermocoupleTypes = thermocoupleTypes;

    // Supported thermocouple temperature metrics & associated constants.
    var tcTemperatureMetrics =  
        [
            {"name": "K","value": 0},
            {"name": "C","value": 1},
            {"name": "F","value": 2}
        ];
    this.tcTemperatureMetrics = tcTemperatureMetrics;
    
    // Initialize variable where module config data will go.
    var moduleContext = {};

    var INITIALIZED_CLICK_HANDLERS = false;

    var AIN_EF_SETUP_CONFIG_STR = '_EF_TYPE';

    /**
     * Function to handle thermocouple reading formatting & add conditional
     * statements for determining whether a thermocouple reading is out of range
     * or not connected vs it being a valid reading.
     */
    this.tcFormatFunc = function(tcReading) {
        if(tcReading == -9999) {
            return "TC Not Connected";
        } else {
            return sprintf('%.10f',tcReading);
        }
    }
    /** 
     * Function to simplify configuring thermocouple channels.
     * ex: configureChannel(device, 'AIN0', 'TypeK', 'K');
     * ex: configureChannel(device, 'AIN0', 22, 0);
    **/
    this.configureChannel = function(device, channelName, type, metric) {
        //Initialize values to defaults
        var tcTypeVal = 0;
        var tempMetricVal = 0;

        // Check and see if a valid type was given, if so, use that type
        // Can be a number or a string
        if(type !== undefined) {
            if(typeof(type) === "number") {
                tcTypeVal = type;
            } else {
                thermocoupleTypes.forEach(function(tcType) {
                    if(tcType.name === type) {
                        tcTypeVal = tcType.value;
                    }
                });
            }
        }
        // Check and see if a valid metric was given, if so, use that metric
        // Can be a number or a string
        if(metric !== undefined) {
            if(typeof(metric) === "number") {
                tempMetricVal = metric;
            } else {
                tcTemperatureMetrics.forEach(function(tcTempMetric) {
                    if(tcTempMetric.name === metric) {
                        tempMetricVal = tcTempMetric.value;
                    }
                });
            }
        }

        //Perform device I/O
        device.write(channelName + AIN_EF_SETUP_CONFIG_STR,0);
        device.write(channelName + '_RANGE',0.1);
        device.write(channelName + AIN_EF_SETUP_CONFIG_STR,tcTypeVal);
        device.write(channelName + '_EF_CONFIG_A',tempMetricVal);
        device.write(channelName + '_EF_CONFIG_B',60052);
    }

    this.editBindings = function(method, channelNumber) {
        var chNum;
        if (typeof(channelNumber) === 'string') {
            chNum = channelNumber;
        } else if (typeof(channelNumber) === 'number'){
            chNum = channelNumber.toString();
        }
        chNum = 'AIN' + chNum;
        var bindings = [
            {bindingClass: chNum, template: chNum,   binding: chNum,    direction: 'read',  format: '%.10f'},
            {bindingClass: chNum+'_BINARY', template: chNum+'_BINARY',   binding: chNum+'_BINARY',    direction: 'read',  format: '%.10f'},
            {bindingClass: chNum+'_EF_READ_A',  template: chNum+'_EF_READ_A', binding: chNum+'_EF_READ_A',  direction: 'read',  format: 'customFormat', customFormatFunc: self.tcFormatFunc},
            {bindingClass: chNum+'_EF_READ_B',  template: chNum+'_EF_READ_B', binding: chNum+'_EF_READ_B',  direction: 'read',  format: '%.10f'},
            {bindingClass: chNum+'_EF_READ_C',  template: chNum+'_EF_READ_C', binding: chNum+'_EF_READ_C',  direction: 'read',  format: '%.10f'},
            {bindingClass: chNum+'_EF_READ_D',  template: chNum+'_EF_READ_D', binding: chNum+'_EF_READ_D',  direction: 'read',  format: '%.10f'}
        ];
        if(method === 'put') {
            // Save the bindings to the framework instance.
            framework.putConfigBindings(bindings);
        } else if(method === 'delete') {
            // Delete the bindings from the framework instance.
            framework.deleteConfigBindings(bindings);
        }
    }

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        /**
         * Format for a single binding,
         * bindingClass: The string constant made available in the handlebars template. ex: {{AIN0.direction}}
         * template: The string constant that must be present as the id, 
         *     ex: <p id="AIN0">0.000</p>
         *     in the module's 'view.html' file to serve as the location to get automatically 
         *     updated by the framework.
         * binding: The string constant representing the register to be read. ex: 'AIN0'
         * direction:
         * format: 
        **/
        var moduleBindings = [
            {bindingClass: baseReg, template: baseReg,   binding: baseReg,    direction: 'read',  format: '%.10f'},
            {bindingClass: baseReg+'_BINARY', template: baseReg+'_BINARY',   binding: baseReg+'_BINARY',    direction: 'read',  format: '%.10f'},
            {bindingClass: baseReg+'_EF_READ_A',  template: baseReg+'_EF_READ_A', binding: baseReg+'_EF_READ_A',  direction: 'read',  format: 'customFormat', customFormatFunc: self.tcFormatFunc},
            {bindingClass: baseReg+'_EF_READ_B',  template: baseReg+'_EF_READ_B', binding: baseReg+'_EF_READ_B',  direction: 'read',  format: '%.10f'},
            {bindingClass: baseReg+'_EF_READ_C',  template: baseReg+'_EF_READ_C', binding: baseReg+'_EF_READ_C',  direction: 'read',  format: '%.10f'},
            {bindingClass: baseReg+'_EF_READ_D',  template: baseReg+'_EF_READ_D', binding: baseReg+'_EF_READ_D',  direction: 'read',  format: '%.10f'}
        ];

        var setupBindings = [
            {bindingClass: baseReg+AIN_EF_SETUP_CONFIG_STR, binding: baseReg+AIN_EF_SETUP_CONFIG_STR, direction: 'read'},
            {bindingClass: baseReg+'_EF_CONFIG_A', binding: baseReg+'_EF_CONFIG_A', direction: 'read'}
        ]

        // Save the setupBindings to the framework instance.
        framework.putSetupBindings(setupBindings);
        onSuccess();
    }
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        // // While configuring the device build a dict to be used for generating the
        // // module's template.
        // moduleContext['tcInputs'] = [];

        // baseRegisters.forEach(function(reg, index) {
        //     // console.log('index',index);
        //     self.configureChannel(device, reg, 'TypeK', 'K');
        //     moduleContext['tcInputs'].push({
        //         "name": reg,
        //         "types": thermocoupleTypes, 
        //         "metrics": tcTemperatureMetrics
        //     });
        // });

        // // save the custom context to the framework so it can be used when
        // // rendering the module's template.
        // framework.setCustomContext(moduleContext);
        onSuccess();

    }

    this.onDeviceConfigured = function(framework, device, configbindings, onError, onSuccess) {
        // While configuring the device build a dict to be used for generating the
        // module's template.
        moduleContext['tcInputs'] = [];
        var configuredEFType = [];
        var configuredMetric = [];

        configbindings.forEach(function(binding, key){
            // console.log('key',key,'Address',binding.address,', Result: ',binding.result);
            if(key.search(AIN_EF_SETUP_CONFIG_STR) > 0) {
                configuredEFType.push(binding.result);
            }
            if(key.search('_EF_CONFIG_A') > 0) {
                configuredMetric.push(binding.result);
            }
        });

        baseRegisters.forEach(function(reg, index) {
            // console.log('index',index);
            // self.configureChannel(device, reg, 'TypeK', 'K');
            var style = "display:none"
            var validTCType = false;
            var confMetric = 'none';
            thermocoupleTypes.forEach(function(type){
                if(type.value == configuredEFType[index]){
                    validTCType = true;
                    style = '';
                    console.log(reg+' is configured for type: ',type.name);
                }
            });
            tcTemperatureMetrics.forEach(function(type){
                if(type.value == configuredMetric[index]){
                    validTCType = type.name;
                    console.log(reg+' is configured for metric: ',type.name);
                }
            });
            if(validTCType) {
                self.editBindings('put',index);
            }
            moduleContext['tcInputs'].push({
                "name": reg,
                "types": thermocoupleTypes, 
                "metrics": tcTemperatureMetrics,
                "isConfigured": validTCType,
                confMetric: true,
                "style": style
            });
        });
        framework.setCustomContext(moduleContext);
        onSuccess();
    }

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        if(!INITIALIZED_CLICK_HANDLERS) {
            var moduleBindings = [
                {bindingClass: baseReg+'-thermocouple-type-select',  template: baseReg+'-thermocouple-type-select', binding: baseReg+'_EF_TYPE',  direction: 'write', event: 'change'},
                {bindingClass: baseReg+'-thermocouple-metric-select',  template: baseReg+'-thermocouple-metric-select', binding: baseReg+'_EF_CONFIG_A',  direction: 'write', event: 'change'},
                {bindingClass: baseReg+'-options-toggle-button',  template: baseReg+'-options-toggle-button', binding: baseReg+'-invalid',  direction: 'write', event: 'click'}
            ];

            // Save the bindings to the framework instance.
            framework.putConfigBindings(moduleBindings);

            // Save that click-handlers have been configured
            INITIALIZED_CLICK_HANDLERS = true;
        }
        onSuccess();
    }
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        var overRideWrite = false;
        baseRegisters.forEach(function(reg) {
            if(binding.template === (reg + '-thermocouple-type-select')) {
                overRideWrite = true;
                var tcTempMetric = $('#'+reg+'-thermocouple-metric-select').val();
                // console.log('overRidden',reg, 'type:',value, 'metric',tcTempMetric);
                self.configureChannel(framework.getSelectedDevice(),reg,parseInt(value),parseInt(tcTempMetric));
                
            } else if(binding.template === (reg + '-thermocouple-metric-select')) {
                overRideWrite = true;
                var tcType = $('#'+reg+'-thermocouple-type-select').val();
                // console.log('overRidden',reg, 'type',tcType, 'metric:',value);
                // Delete active binding from framework:
                self.self.editBindings('delete',reg.split('AIN')[1]);
                self.configureChannel(framework.getSelectedDevice(),reg,parseInt(tcType),parseInt(value));
                //Add the binding back if it is a valid channel.
                if(tcType != 0) {
                    self.self.editBindings('put',reg.split('AIN')[1]);
                }
                
            }

            } else if(binding.template === (reg + '-options-toggle-button')) {
                overRideWrite = true;
                var btnObj = $('#'+binding.template);
                if(btnObj.hasClass('icon-plus'))  {
                    btnObj.removeClass('icon-plus');
                    btnObj.addClass('icon-minus');
                    $('#'+reg+'-hidden-options').fadeIn();
                } else if(btnObj.hasClass('icon-minus'))  {
                    btnObj.removeClass('icon-minus');
                    btnObj.addClass('icon-plus');
                    $('#'+reg+'-hidden-options').fadeOut();
                }
            }
        });
        onSuccess(overRideWrite);
    }
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    }
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    }
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        onSuccess();
    }
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        onSuccess();
    }
    this.onUnloadModule = function(framework, onError, onSuccess) {
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
        onHandle(true);
    }

    var self = this;
}
