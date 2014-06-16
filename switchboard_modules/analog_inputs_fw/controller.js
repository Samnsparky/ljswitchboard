/**
 * Logic for the Analog Input Control Module.
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
 *  1. Read AINx_EF_INDEX register to determine if configuring a channel will 
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
var MODULE_UPDATE_PERIOD_MS = 1500;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.ENABLE_DEBUGGING = false;
    this.moduleConstants = {};
    this.moduleContext = {};
    this.activeDevice = undefined;
    this.framework = undefined;
    this.defineDebuggingArrays = true;

    this.currentValues = dict();
    this.isValueNew = dict();
    this.newBufferedValues = dict();
    this.bufferedOutputValues = dict();

    this.ANALOG_INPUT_PRECISION = 6;

    this.deviceConstants = {};
    this.curDeviceOptions = dict();
    this.regParserDict = dict();
    this.regParser = dict();
    // this.regParser = {
    //     set: function(name,value) {
    //         return sdModule.regParserDict.set(name,value);
    //     },
    //     get: function(name) {
    //         var data = sdModule.regParserDict.get(name);
    //         if(typeof(data) === 'undefined') {
    //             return sdModule.deviceConstants.extraAllAinOptions[0];
    //         } else {
    //             return data;
    //         }
    //     },
    //     delete: function(name) {
    //          return sdModule.regParserDict.delete(name);
    //     },
    //     forEach: function(func) {
    //         return sdModule.regParserDict.forEach(func);
    //     },
    //     size: self.regParserDict.size
    // };
    this.initRegParser = function() {
        self.regParser = {};
        self.regParser.set = self.regParserDict.set;
        self.regParser.get = function(name) {
            var data = self.regParserDict.get(name);
            if(typeof(data) === 'undefined') {
                return self.deviceConstants.extraAllAinOptions[0];
            } else {
                return data;
            }
        };
        self.regParser.delete = self.regParserDict.delete;
        self.regParser.forEach = self.regParserDict.forEach;
        self.regParser.size = self.regParserDict.size;
        self.regParser.has = self.regParserDict.has;

    }

    //Define nop (do-nothing) function
    var nop = function(){};

    // Base-Register Variable for Configuring multiple thermocouples.
    var baseReg = 'AIN#(0:13)';

    // Expand baseReg & create baseRegister list using ljmmm.
    // ex: ['AIN0', 'AIN1', ... 'AIN13']
    var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);

    // Define support analog input ef-types
    var ain_ef_types = globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions;

    // Supported analog input range options.
    var ainRangeOptions = globalDeviceConstants.t7DeviceConstants.ainRangeOptions;

    // Supported analog input resolution options.
    var ainResolutionOptions = globalDeviceConstants.t7DeviceConstants.ainResolutionOptions;

    // Supported analog input resolution options.
    var ainSettlingOptions = globalDeviceConstants.t7DeviceConstants.ainSettlingOptions;

    // Supported analog input negative channel options
    var ainNegativeCHOptions = [{
        value: 199,
        name: "GND"
    }];
    this.getNegativeChOption = function(val){
        if(val%2 === 0) {
            return [
                {value: 199,name: "GND"},
                {value: val,name: 'AIN'+val.toString()}
            ];
        } else {
            return [
                {value: 199,name: "GND"}
            ];
        }
    };

    // Supported extra options
    var extraAllAinOptions = globalDeviceConstants.t7DeviceConstants.extraAllAinOptions;

    this.efTypeDict = dict();
    this.rangeOptionsDict = dict();
    this.resolutionOptionsDict = dict();
    this.settlingOptionsDict = dict();
    this.negativeChannelDict = dict();

    var overrideGraphRanges = false;
    var minGraphRange;
    var maxGraphRange;

    this.pDict = function(dict) {
        dict.forEach(function(value,name){
            console.log(name,value);
        })
    }
    this.expandLJMMMNameSync = 
    this.setupTypeConversionDicts = function(target,destination) {
        var setInfo = function(value,index){
            destination.set(value.value.toString(),value.name);
        };
        target.forEach(setInfo);
        var extraInfo = self.deviceConstants.extraAllAinOptions;
        extraInfo.forEach(setInfo);
    };
    this.buildDataParsers = function() {
        var parsers = self.deviceConstants.parsers;
        parsers.forEach(function(name){
            var dictName = name+'Dict';
            self.deviceConstants[dictName] = dict();
            if(typeof(self.deviceConstants[name].numbers) !== 'undefined'){
                var options = [];
                var base = self.deviceConstants[name];
                base.numbers.forEach(function(num){
                    options.push(base.func(num));
                });
                self.setupTypeConversionDicts(
                    options,
                    self.deviceConstants[dictName]
                );
            } else {
                self.setupTypeConversionDicts(
                    self.deviceConstants[name],
                    self.deviceConstants[dictName]
                );
            }
            // console.log('here!',self.deviceConstants[dictName].size);
        });
    };
    this.buildRegParser = function() {
        var configArray = self.deviceConstants.allConfigRegisters;
        var chConfigArray = self.deviceConstants.configRegisters;
        var addParser = function(data,index) {
            var formatReg = handlebars.compile(data.register);
            var compReg = formatReg(self.deviceConstants);
            var addrList = ljmmm_parse.expandLJMMMNameSync(compReg);
            if((data.options !== 'func') && (data.options !== 'raw')) {
                var dataObj = self.deviceConstants[data.options+'Dict'];
                var getData = function(val) {
                    var value = Math.round(val*1000)/1000;
                    return {value: val, name: dataObj.get(value.toString())}
                };
                addrList.forEach(function(addr){
                    self.regParser.set(addr,getData);
                });
            } else if (data.options === 'raw') {
                addrList.forEach(function(addr){
                    var getData = function(val) {
                        return {name:addr,value:val};
                    }
                    self.regParser.set(addr,getData);
                });
            } else if (data.options === 'func') {
                addrList.forEach(function(addr){
                    var dataObj = self.deviceConstants[data.func];
                    var getData = function(val) {
                        return dataObj.func(val);
                    };
                    self.regParser.set(addr,getData);
                });
            }
        };
        configArray.forEach(addParser);
        chConfigArray.forEach(addParser);
        addParser({
            register:self.deviceConstants.ainChannelNames,
            options: 'raw'
        });
    }
    this.buildOptionsDict = function() {
        var configArray = self.deviceConstants.allConfigRegisters;
        var chConfigArray = self.deviceConstants.configRegisters;

        var addOptions = function(data) {
            var formatReg = handlebars.compile(data.register);
            var compReg = formatReg(self.deviceConstants);
            var addrList = ljmmm_parse.expandLJMMMNameSync(compReg);
            var deviceOptionsData = {};
            deviceOptionsData.name = data.name;
            deviceOptionsData.cssClass = data.cssClass;
            if (data.options !== 'func') {
                addrList.forEach(function(addr){
                    var menuOptions = [];
                    menuOptions = self.deviceConstants[data.options];
                    deviceOptionsData.menuOptions = menuOptions;
                    self.curDeviceOptions.set(addr,deviceOptionsData);
                });
            } else if (data.options === 'func') {
                var findNum = new RegExp("[0-9]{1,2}");
                addrList.forEach(function(addr){
                    var addrNum = findNum.exec(addr);
                    var dataObj = self.deviceConstants[data.func];
                    var menuOptions = dataObj.filter(addrNum);
                    deviceOptionsData.menuOptions = menuOptions;
                    self.curDeviceOptions.set(addr,deviceOptionsData);
                });
            }
        };
        configArray.forEach(addOptions);
        chConfigArray.forEach(addOptions);
    }

    this.writeReg = function(address,value) {
        var ioDeferred = q.defer();
        self.activeDevice.qWrite(address,value)
        .then(function(){
            // console.log('success',address,value);
            self.bufferedOutputValues.set(address,value);
            ioDeferred.resolve();
        },function(err){
            // console.error('fail',address,err);
            ioDeferred.reject(err);
        })
        return ioDeferred.promise;
    }
    /**
     * Function to handle ain reading formatting & updating the mini-graph.
     */
    this.ainResultUpdate = function(info) {
        var ainReading = info.value;
        var binding = info.binding.binding;
        var rangeIdName = '#'+binding+'-analog-input-range-select';
        var barIdName = '#'+binding+'-input-bar';
        var minValIdName = '#'+binding+'-min-range-val';
        var maxValIdName = '#'+binding+'-max-range-val';
        var rangeVal = Number($(rangeIdName).val());
        var minRangeText = $(minValIdName).text();
        var maxRangeText = $(maxValIdName).text();
        var tStr;
        // console.log('binding',binding,'range: ',rangeVal);
        
        tStr = (-1 * rangeVal).toString();
        if (minRangeText !== tStr) {
            $(minValIdName).text(tStr);
        }
        tStr = '+'+(rangeVal.toString());
        if (maxRangeText !== tStr) {
            $(maxValIdName).text(tStr);
        }
        
        switch (rangeVal) {
            case 10:
                break;
            case 1:
                ainReading = ainReading * 10;
                break;
            case 0.1:
                ainReading = ainReading * 100;
                break;
            case 0.01:
                ainReading = ainReading * 1000;
                break;
            default:
                break;
        }
        var width = 100 * ((ainReading + 10) / 20);
        if (width > 100){
            width = 100;
        }
        if (width < 0) {
            width = 0;
        }
        $(barIdName).css('width', String(width) + '%');

        return sprintf('%10.6f',info.value);
    };
    this.genericConfigCallback = function(data, onSuccess) {
        // console.log('genericConfigCallback',data.binding.binding,data.value);
        var name = data.binding.binding;
        var value = data.value;
        self.currentValues.set(name,value);
        self.isValueNew.set(name,false);
        onSuccess();
    };
    this.genericPeriodicCallback = function(data, onSuccess) {
        // console.log('genericPeriodicCallback',data.binding.binding,data.value);
        var name = data.binding.binding;
        var value = data.value;
        var oldValue = self.currentValues.get(name);
        if(oldValue != value) {
            self.isValueNew.set(name,true);
            self.newBufferedValues.set(name,value);
        } else {
            self.isValueNew.set(name,false);
            self.newBufferedValues.delete(name);
        }
        onSuccess();
    };
    this.optionsClickHandler = function(data, onSuccess) {
        var clickId = '#'+data.binding.binding;
        var objId = clickId.split('callback')[0]+'options';
        var buttonId = clickId.split('-callback')[0];
        var objEl = $(objId)
        var buttonEl = $(buttonId);
        if(objEl.css('display') === 'none') {
            objEl.fadeIn(100,function(){
                buttonEl.removeClass('icon-plus');
                buttonEl.addClass('icon-minus');
                buttonEl.attr('title','Hide Options');
            });
        } else {
            objEl.fadeOut(100,function(){
                buttonEl.removeClass('icon-minus');
                buttonEl.addClass('icon-plus');
                buttonEl.attr('title','Show Options');
            });
        }
        onSuccess();
    };
    this.genericDropdownClickHandler = function(data, onSuccess) {
        var rootEl = data.eventData.toElement;
        var className = rootEl.className;
        var buttonEl;
        var buttonID = '';
        var selectEl;
        var register;
        var value;
        var newText = '';
        var newTitle = '';


        if(className === 'menuOption') {
            buttonEl = rootEl.parentElement.parentElement.parentElement;
            buttonID = buttonEl.id;
            selectEl = buttonEl.children[0].children[0];
            register = buttonID.split('-SELECT')[0];
            value = Number(rootEl.getAttribute('value'));
            newText = rootEl.text;
            newTitle = register + ' is set to ' + value.toString();

            
            //Set title
            selectEl.title = newTitle;
            //Set new text
            selectEl.innerText = newText;
            console.log('ID',className,buttonID,register,value);
            //Perform device IO
            self.writeReg(register,value)
            .then(function(){
                console.log('Successfully wrote data!');
            }, function(err){
                console.log('Failed to write data :(',err,register,value);
            });
        }
        onSuccess();
    };

    this.configureModule = function(onSuccess) {
        var devT;
        var subClass;
        var devConstStr;
        var baseReg;
        try{
            devT = self.activeDevice.getDeviceType();
            subclass = self.activeDevice.getSubclass();
            devConstStr = globalDeviceConstantsSwitch[devT+subclass];
            self.deviceConstants = globalDeviceConstants[devConstStr];
            baseReg = self.deviceConstants.ainChannelNames;
            if(typeof(self.deviceConstants)==='undefined'){
                console.error('Selected Device is not defined!!');
            }
        } catch(err) {
            console.error('Failed to configureModule',err);
        }
        // self.setupTypeConversionDicts(self.deviceConstants);
        self.initRegParser();
        self.buildDataParsers();
        self.buildRegParser();
        self.buildOptionsDict();

        // Define the module's setupBindings
        var bindingList = [];
        bindingList.push({"name": baseReg, "isPeriodic":true, "type":"FLOAT32"});
        var addRegs = function(data) {
            if(typeof(data.manual) === 'undefined') {
                var formatReg = handlebars.compile(data.register);
                var compReg = formatReg(self.deviceConstants);
                bindingList.push({"name": compReg, "isPeriodic":true});
            } else {
                if(!data.manual) {
                    var formatReg = handlebars.compile(data.register);
                    var compReg = formatReg(self.deviceConstants);
                    bindingList.push({"name": compReg, "isPeriodic":true});
                }
            }
        };
        self.deviceConstants.configRegisters.forEach(addRegs);
        self.deviceConstants.allConfigRegisters.forEach(addRegs);

        // Initialize smart register's array
        var smartBindings = [];

        // Add analog input registers
        var addAINInputReg = function(newBinding) {
            var binding = {};
            binding.bindingName = newBinding.name;
            if(newBinding.isPeriodic) {
                binding.smartName = 'readRegister';
            }
            if(typeof(newBinding.type) !== 'undefined') {
                if(newBinding.type === 'FLOAT32') {
                    binding.format = '%.' ;
                    binding.format += self.ANALOG_INPUT_PRECISION.toString();
                    binding.format += 'f';
                }
            }
            binding.periodicCallback = self.genericPeriodicCallback;
            binding.configCallback = self.genericConfigCallback;
            smartBindings.push(binding);

            var clickBinding = {};
            if(!(typeof(newBinding.type) !== 'undefined')) {
                clickBinding.bindingName = newBinding.name+'-SELECT';
                clickBinding.smartName = 'clickHandler';
                clickBinding.callback = self.genericDropdownClickHandler;
                smartBindings.push(clickBinding);
            }
            
        }
        bindingList.forEach(addAINInputReg);

        var customSmartBindings = [
            {
                // Define binding to handle user click events on options button.
                bindingName: baseReg+'-options-toggle-button', 
                smartName: 'clickHandler',
                callback: self.optionsClickHandler
            }
        ];

        self.framework.putSmartBindings(smartBindings);
        self.framework.putSmartBindings(customSmartBindings);
        onSuccess();
    }
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.framework = framework;
        // Enable framework-timing debugging
        if(self.ENABLE_DEBUGGING) {
            framework.enableLoopTimingAnalysis();
            framework.enableLoopMonitorAnalysis();
        }
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
        self.configureModule(onSuccess);
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // Initialize variable where module config data will go.
        self.moduleContext = {};
        var analogInputsDict = dict();
        if(self.defineDebuggingArrays){
            var analogInputs = [];
        }
        baseRegisters.forEach(function(reg,index){
            var ainChannel = {
                "name":reg,
                "value":null,
                "strVal":null,
                "optionsDict":dict(),
                "minGraphVal":null,
                "maxGraphVal":null
            };
            if(self.defineDebuggingArrays){
                ainChannel.options = [];
            }
            self.deviceConstants.configRegisters.forEach(function(configReg){
                var options = {};
                var menuOptions;
                var formatReg = handlebars.compile(configReg.register);
                var compReg = formatReg({ainChannelNames:reg});

                options.menuTitle = configReg.name;
                options.reg = compReg;
                options.curStr = null;
                options.curVal = null;
                options.cssClass = configReg.cssClass;
                // console.log('in configRegisters.forEach',configReg.title,configReg);
                if(configReg.options !== 'func') {
                    menuOptions = self.deviceConstants[configReg.options];
                } else {
                    var menuGenFunc = self.deviceConstants[configReg.func].filter;
                    menuOptions = menuGenFunc(index);
                }
                options.menuOptions = menuOptions;
                
                ainChannel.optionsDict.set(compReg,options);
                if(self.defineDebuggingArrays){
                    ainChannel.options.push(options);
                }
            });
            if(self.defineDebuggingArrays){
                analogInputs.push(ainChannel);
            }
            analogInputsDict.set(reg,ainChannel);
        });

        var findNum = new RegExp("[0-9]{1,2}");
        var isFound = function(haystack,needle) {
            return (haystack.indexOf(needle) != -1);
        }
        var getValStr = function(dict,val) {
            var res = dict.get(val);
            if(typeof(res) === 'undefined') {
                return 'select';
            } else {
                return res;
            }
        }

        // setup data for ain-ef types
        ainEFTypeInfo = {
            val:0,
            valStr: 'None'

        }

        var configRegistersDict = dict();

        self.moduleContext.allEFTypeVal = null;
        self.moduleContext.allEFTypesSame = true;
        self.moduleContext.allEFTypeOptions = ain_ef_types;

        self.currentValues.forEach(function(value,name){
            var dataObj = {};
            dataObj.reg = name;
            dataObj.val = value;
            var strVal = value.toString();
            // Switch on 
            if(!findNum.test(name)) {
                var newData = self.regParser.get(name)(value);
                var optionsData = self.curDeviceOptions.get(name);
                dataObj.curStr = newData.name;
                dataObj.curVal = newData.value;
                dataObj.menuOptions = optionsData.menuOptions;
                dataObj.name = optionsData.name;
                dataObj.cssClass = optionsData.cssClass;
                configRegistersDict.set(name,dataObj);
            } else {
                var res = findNum.exec(name);
                var index = Number(res[0]);
                // Get currently saved values
                var ainInfo = analogInputsDict.get('AIN'+index.toString());

                var newData = self.regParser.get(name)(value);
                if(isFound(name,'_')) {
                    var menuOptions = ainInfo.optionsDict.get(name);
                    menuOptions.curStr = newData.name;
                    menuOptions.curVal = newData.value;
                    ainInfo.optionsDict.set(name, menuOptions);
                } else {
                    var roundedRes = value.toFixed(self.ANALOG_INPUT_PRECISION);
                    ainInfo.value = value;
                    ainInfo.strVal = roundedRes + ' V';
                }

                // Update saved values
                analogInputsDict.set('AIN'+index.toString(),ainInfo);
            }
        });
        self.moduleContext.analogInputsDict = analogInputsDict;
        self.moduleContext.configRegistersDict = configRegistersDict;
        console.log('moduleContext',self.moduleContext);
        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        // Save the bindings to the framework instance.
        // framework.putConfigBindings(moduleBindings);
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
        try {
            // console.log('Refreshed!',framework.moduleName,self.newBufferedValues.size);
            self.bufferedOutputValues.forEach(function(value,name){
                console.log('updating cur-val',name,value);
                self.currentValues.set(name,value);
                self.bufferedOutputValues.delete(name);
            });
            self.newBufferedValues.forEach(function(value,name){
                if(name.indexOf('_') != -1){
                    console.log('Updating Select',name+'-SELECT');
                    var buttonID = '#' + name + '-SELECT';
                    var buttonEl = $(buttonID);
                    var selectEl = buttonEl.find('.currentValue');
                    var newText = self.regParser.get(name,{'value':-9999,'name':'N/A'})(value);
                    var newTitle = name + ' is set to ' + value.toString();
                    console.log('New Data',newText,newTitle);
                    selectEl.text(newText.name);
                    selectEl.attr('title',newTitle);
                }
                self.currentValues.set(name,value);
                self.newBufferedValues.delete(name);
            });
            onSuccess();
        } catch (err) {
            console.error('Caught Error... in onRefreshed',err,err.stack);
            onSuccess();
        }
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
        console.log('in onRefreshError', description,framework.moduleName);
        if(typeof(description.retError) === 'number') {
            console.log('in onRefreshError',device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
