function getDeviceDashboardController() {
    var DEVICE_D3_CONTAINER;
    var DEVICE_IMAGE_CONTAINER;
    this.displayTemplateData = {};
    
    // Device Image Info
    var LABJACK_OVERVIEW_IMG_SRC = './static/img/T7-cartoon.png';
    var DEVICE_IMAGE_X_OFFSET = 150;
    var DEVICE_IMAGE_Y_OFFSET = 10;
    var DEVICE_IMG_WIDTH = 225;
    var DEVICE_IMG_HEIGHT = 525;

    // DB Image Info
    var LABJACK_DB_IMG_SRC = './static/img/T7-DB-cartoon.png'
    var DB_IMG_WIDTH = 225;
    var DB_IMG_HEIGHT = 525;
    var DB_IMAGE_X_OFFSET = 150;
    var DB_IMAGE_Y_OFFSET = 10;

    var LINE_X_OFFSET = 120;
    var LINE_Y_OFFSET = 6;
    var DEVICE_IMAGE_X_OVERLAP = 30;
    var CONNECTOR_SIZE_X = DEVICE_IMAGE_X_OFFSET + DEVICE_IMAGE_X_OVERLAP;

    var REGISTER_DISPLAY_ID_TEMPLATE = handlebars.compile('{{register}}-display');
    var TRANSLATE_TEMPLATE = handlebars.compile('translate({{x}},{{y}})');
    var STRATEGY_NAME_TEMPALTE = handlebars.compile('{{type}}-{{direction}}');
    var PATH_TEMPALTE = handlebars.compile(
        'M {{start.x}} {{start.y}} C{{#each coords}} {{x}} {{y}}{{/each}}'
    );
    var DIGITAL_CONTROL_HEADER = handlebars.compile(
        '<div id="{{register}}-digitalControl" class="digitalControlObject">'
    );

    var REGISTER_OVERLAY_SPEC = [
        {register: 'AIN0', yLocation: 0.783, type: null, board: 'device', side: 'left'},
        {register: 'AIN1', yLocation: 0.757, type: null, board: 'device', side: 'left'},
        {register: 'AIN2', yLocation: 0.664, type: null, board: 'device', side: 'left'},
        {register: 'AIN3', yLocation: 0.639, type: null, board: 'device', side: 'left'},
        {register: 'DAC0', yLocation: 0.545, yOffset: 6, type: 'dac', board: 'device', side: 'left'},
        {register: 'DAC1', yLocation: 0.519, yOffset: -6, type: 'dac', board: 'device', side: 'left'},
        {register: 'FIO0', yLocation: 0.428, type: 'dio', yOffset: 6, board: 'device', side: 'left'},
        {register: 'FIO1', yLocation: 0.403, type: 'dio', yOffset: -6, board: 'device', side: 'left'},
        {register: 'FIO2', yLocation: 0.308, yOffset: 6, type: 'dio', board: 'device', side: 'left'},
        {register: 'FIO3', yLocation: 0.283, yOffset: -6, type: 'dio', board: 'device', side: 'left'},
        {register: 'AIN1', yLocation: 0.900-0.01, type: null, board: 'connector', side: 'left'},
        {register: 'AIN3', yLocation: 0.875-0.01, type: null, board: 'connector', side: 'left'},
        {register: 'AIN5', yLocation: 0.850-0.01, type: null, board: 'connector', side: 'left'},
        {register: 'AIN7', yLocation: 0.825-0.01, type: null, board: 'connector', side: 'left'},
        {register: 'AIN9', yLocation: 0.800-0.01, type: null, board: 'connector', side: 'left'},
        {register: 'AIN11', yLocation: 0.775-0.01, type: null, board: 'connector', side: 'left'},
        {register: 'AIN13', yLocation: 0.750-0.01, type: null, board: 'connector', side: 'left'},
        {register: 'DAC0', yLocation: 0.725-0.01, type: 'dac', board: 'connector', side: 'left'},
        {register: 'MIO1', yLocation: 0.625-0.015, type: 'dio', board: 'connector', side: 'left'},
        {register: 'FIO0', yLocation: 0.600-0.015, type: 'dio', board: 'connector', side: 'left'},
        {register: 'FIO2', yLocation: 0.575-0.015, type: 'dio', board: 'connector', side: 'left'},
        {register: 'FIO4', yLocation: 0.550-0.015, type: 'dio', board: 'connector', side: 'left'},
        {register: 'FIO6', yLocation: 0.525-0.015, type: 'dio', board: 'connector', side: 'left'},
        {register: 'EIO6', yLocation: 0.275+0.020, type: 'dio', board: 'connector', side: 'left'},
        {register: 'EIO4', yLocation: 0.250+0.020, type: 'dio', board: 'connector', side: 'left'},
        {register: 'EIO2', yLocation: 0.225+0.020, type: 'dio', board: 'connector', side: 'left'},
        {register: 'EIO0', yLocation: 0.200+0.020, type: 'dio', board: 'connector', side: 'left'},
        {register: 'CIO1', yLocation: 0.175+0.020, type: 'dio', board: 'connector', side: 'left'},
        {register: 'CIO3', yLocation: 0.150+0.020, type: 'dio', board: 'connector', side: 'left'},
        {register: 'AIN0', yLocation: 0.900 + 0.005, type: null, board: 'connector', side: 'right'},
        {register: 'AIN2', yLocation: 0.875 + 0.005, type: null, board: 'connector', side: 'right'},
        {register: 'AIN4', yLocation: 0.850 + 0.005, type: null, board: 'connector', side: 'right'},
        {register: 'AIN6', yLocation: 0.825 + 0.005, type: null, board: 'connector', side: 'right'},
        {register: 'AIN8', yLocation: 0.800 + 0.003, type: null, board: 'connector', side: 'right'},
        {register: 'AIN10', yLocation: 0.775 + 0.003, type: null, board: 'connector', side: 'right'},
        {register: 'AIN12', yLocation: 0.750 + 0.003, type: null, board: 'connector', side: 'right'},
        {register: 'DAC1', yLocation: 0.700, type: 'dac', board: 'connector', side: 'right'},
        {register: 'MIO2', yLocation: 0.625, type: 'dac', board: 'connector', side: 'right'},
        {register: 'MIO0', yLocation: 0.600, type: 'dac', board: 'connector', side: 'right'},
        {register: 'FIO1', yLocation: 0.575, type: 'dac', board: 'connector', side: 'right'},
        {register: 'FIO3', yLocation: 0.550, type: 'dac', board: 'connector', side: 'right'},
        {register: 'FIO5', yLocation: 0.525, type: 'dac', board: 'connector', side: 'right'},
        {register: 'FIO7', yLocation: 0.500, type: 'dac', board: 'connector', side: 'right'},
        {register: 'EIO7', yLocation: 0.300+0.010, type: 'dio', board: 'connector', side: 'right'},
        {register: 'EIO5', yLocation: 0.275+0.010, type: 'dio', board: 'connector', side: 'right'},
        {register: 'EIO3', yLocation: 0.250+0.010, type: 'dio', board: 'connector', side: 'right'},
        {register: 'EIO1', yLocation: 0.225+0.010, type: 'dio', board: 'connector', side: 'right'},
        {register: 'CIO2', yLocation: 0.175+0.010, type: 'dio', board: 'connector', side: 'right'},
        {register: 'CIO0', yLocation: 0.150+0.010, type: 'dio', board: 'connector', side: 'right'}
    ];

    // console.log(JSON.stringify(REGISTER_OVERLAY_SPEC));

    this.loadResources = function(onSuccess) {
        var fileList = [
            'ain-in',
            'dac-out',
            'dio'
        ];
        var fileBase = 'dashboard/resources/';
        var fileExtension = '.html';

        var loadFile = function(fileName, continueFunc) {
            var filePath = fileBase + fileName + fileExtension;
            // Load Template File
            fs_facade.readModuleFile(
                filePath,
                function(err) {
                    var templateLoad = "Error loading file: ";
                    templateLoad += filePath + ". Error Message: ";
                    templateLoad += err.toString();

                    console.error(templateLoad,err);
                    continueFunc('failed to load: ' + filePath);
                },
                function(data) {
                    self.displayTemplateData[fileName] = '';
                    self.displayTemplateData[fileName] = handlebars.compile(
                        data);
                    continueFunc();
                }
            );
        };
        async.forEach(
            fileList,
            loadFile,
            function(err) {
                if(err) {
                    console.error('ERROR LOADING FILES, getDeviceDashboardController.js');
                }
                if(typeof(onSuccess) !== 'undefined') {
                    onSuccess();
                }
            }
        );
    };
    this.drawDBs = function (containerID, initializedData) {
        // Save the necessary ID's for creating the DBs D3 object
        DB_D3_CONTAINER = containerID;
        DB_IMAGE_CONTAINER = containerID + '-svg';
        DB_REGISTERS_CONTAINER = containerID + '-registers';

        // Define a function that returns the y-location of where each register
        // should be placed in relation to the DB's image.
        var getOverlayYPos = function(registerInfo) {
            var yFromTopOfImage = registerInfo.yLocation * DB_IMG_HEIGHT;
            return DB_IMAGE_Y_OFFSET + yFromTopOfImage;
        };
        // Get a few module-attributes needed to calculate imageY, a constant 
        // required to calculate the y-location of where each register-object 
        // should be placed
        var moduleContentsOffset = $('#module-chrome-contents').position().top;
        var deviceSelectorOffset = $('#device-view').position().top;
        var imageY = moduleContentsOffset + deviceSelectorOffset-20;
        var getOverlayYPosWithPx = function (registerInfo) {
            return imageY + getOverlayYPos(registerInfo) + 'px';
        };
        //---------------------- Draw DB image ---------------------------------
        // Add the image to the DIV containing the device visualization in order
        // to add the db-cartoon.
        var image = d3.select(DB_IMAGE_CONTAINER)                               // Tell D3 to insert data into the DEVICE_IMAGE_CONTAINER div-id
        .append('image')                                                        // Tell D3 to make an image object
        .attr('xlink:href', LABJACK_DB_IMG_SRC)                                 // Set the image src. to be the LABJACK_OVERVIEW_IMG_SRC
        .attr('x', DB_IMAGE_X_OFFSET)                                           // Set the X-offset.  Padding added to the left of image.
        .attr('y', DB_IMAGE_Y_OFFSET)                                           // Set the Y-offset.  Padding added to the top of image.
        .attr('width', DB_IMG_WIDTH)
        .attr('height', DB_IMG_HEIGHT);

        //---------------------- Draw Lines image ------------------------------
        // Again, select the DIV containing the device visualization.  This time
        // to draw the object that the lines protruding off to the left of the 
        // device will go into.
        var lineGroup = d3.select(DB_IMAGE_CONTAINER)
        .selectAll('.connector-line-left')                                      // Not quite sure what is being select here...
        .data(function () {                                                     // Adding data to the D3 object by...
            return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {       // Filtering the REGISTER_OVERLAY_SPEC
                return (registerInfo.board === 'connector') 
                && (registerInfo.side === 'left');                              // To get only 'device' registers.
            });
        })
        .enter()                                                                // Enter each data point defined above.
        .append('g')                                                            // Create an html attribute called "g".  D3:
        .attr('transform', function (registerInfo) {                            // Set the X and Y coordinates for where the base of the line should go
            var y = getOverlayYPos(registerInfo);
            return TRANSLATE_TEMPLATE({x: 0, y: y});                            // Define drawn X and Y coordinates
        });

        // Define a function that places the "spline" lines.  These 4 points 
        // are why the some of the lines are curvey & others aren't.  
        var lineFunction = function (coordSpec) {
            var yOffset = coordSpec.yOffset;
            if (yOffset === undefined)                                          // if a yOffset is defined in REGISTER_OVERLAY_SPEC then use it.
                yOffset = 0;
            var xOffset = 0;
            if(coordSpec.side === 'right') {
                xOffset = 100;
            }
            return PATH_TEMPALTE({                                              // Use the yOffset to make the curvey line.
                start: {x: CONNECTOR_SIZE_X+xOffset, y: 0},                     // Start line
                coords: [
                    {x: CONNECTOR_SIZE_X-40+xOffset, y: 0},                     // First "Spline" line
                    {x: LINE_X_OFFSET+40+xOffset, y: yOffset},                  // First "Spline" line
                    {x: LINE_X_OFFSET+xOffset, y: yOffset}                      // Finish line at this point
                ]
            });
        };

        // Determine if antialiasing should be used.  Antialiasing causes the
        // "blured" straight lines instead of making them "crisp".
        var determineAntialiasing = function (spec) {
            // If a yOffset is defined in the REGISTER_OVERLAY_SPEC then set to
            // auto.
            if (spec.yOffset)
                return 'auto';
            else
                return 'crispEdges';
        };

        // Append Paths that each of the previously defined line objects should 
        // follow. Draw the white line that goes in each of the defined line 
        // groups. (3px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'white')
        .attr('fill', 'none')
        .attr('stroke-width', 3)
        .style('shape-rendering', determineAntialiasing);
        
        // Append Paths that each of the previously defined line objects should 
        // follow. Draw the black line that goes in each of the defined line 
        // groups. (1px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('stroke-width', 1)
        .style('shape-rendering', determineAntialiasing);
    }
    this.drawDevice = function (containerID, initializedData) {
        // Save the necessary ID's for creating the D3 object
        DEVICE_D3_CONTAINER = containerID;
        DEVICE_IMAGE_CONTAINER = containerID + '-svg';
        DEVICE_REGISTERS_CONTAINER = containerID + '-registers';

        // Define function that returns the y-location of where each register
        // should be placed
        var getOverlayYPos = function (registerInfo) {
            var yFromTopOfImage = registerInfo.yLocation * DEVICE_IMG_HEIGHT;
            return DEVICE_IMAGE_Y_OFFSET + yFromTopOfImage;
        };

        // Determine the top-margin that should be applied to properly align the 
        // registers.
        var marginTopVal;
        if($(window).width() < 768) {
            marginTopVal = 0;
        } else {
            marginTopVal = (-1 * $('#device-view').offset().top);
        }

        // Set the margin-top .css style of the registers-container.
        $(DEVICE_REGISTERS_CONTAINER).css(
            'margin-top', 
            marginTopVal.toString() + 'px'
        );
        $(DEVICE_IMAGE_CONTAINER).css(
            'margin-top', 
            (-1 * marginTopVal).toString() + 'px'
        );

        // Get a few module-attributes needed to calculate imageY, a constant 
        // required to calculate the y-location of where each register-object 
        // should be placed
        var moduleContentsOffset = $('#module-chrome-contents').position().top;
        var deviceSelectorOffset = $('#device-view').position().top;
        var imageY = moduleContentsOffset + deviceSelectorOffset-20;
        if($(window).width() < 768) {
            imageY -= $(DEVICE_IMAGE_CONTAINER).position().top;
        }

        var getOverlayYPosWithPx = function (registerInfo) {
            return imageY + getOverlayYPos(registerInfo) + 'px';
        };

        // Add the image to the DIV containing the device visualization in order
        // to add the device-cartoon.
        var image = d3.select(DEVICE_IMAGE_CONTAINER)                           // Tell D3 to insert data into the DEVICE_IMAGE_CONTAINER div-id
        .append('image')                                                        // Tell D3 to make an image object
        .attr('xlink:href', LABJACK_OVERVIEW_IMG_SRC)                           // Set the image src. to be the LABJACK_OVERVIEW_IMG_SRC
        .attr('x', DEVICE_IMAGE_X_OFFSET)                                       // Set the X-offset.  Padding added to the left of image.
        .attr('y', DEVICE_IMAGE_Y_OFFSET)                                       // Set the Y-offset.  Padding added to the top of image.
        .attr('width', DEVICE_IMG_WIDTH)
        .attr('height', DEVICE_IMG_HEIGHT);
        
        // Again, select the DIV containing the device visualization.  This time
        // to draw the object that the lines protruding off to the left of the 
        // device will go into.
        var lineGroup = d3.select(DEVICE_IMAGE_CONTAINER)
        .selectAll('.connector-line')                                           // Not quite sure what is being select here...
        .data(function () {                                                     // Adding data to the D3 object by...
            return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {       // Filtering the REGISTER_OVERLAY_SPEC
                return registerInfo.board === 'device';                         // To get only 'device' registers.
            });
        })
        .enter()                                                                // Enter each data point defined above.
        .append('g')                                                            // Create an html attribute called "g".  D3:
        .attr('transform', function (registerInfo) {                            // Set the X and Y coordinates for where the base of the line should go
            var y = getOverlayYPos(registerInfo);
            return TRANSLATE_TEMPLATE({x: 0, y: y});                            // Define drawn X and Y coordinates
        });

        // Define a function that places the "spline" lines.  These 4 points 
        // are why the some of the lines are curvey & others aren't.  
        var lineFunction = function (coordSpec) {
            var yOffset = coordSpec.yOffset;
            if (yOffset === undefined)                                          // if a yOffset is defined in REGISTER_OVERLAY_SPEC then use it.
                yOffset = 0;

            return PATH_TEMPALTE({                                              // Use the yOffset to make the curvey line.
                start: {x: CONNECTOR_SIZE_X, y: 0},                             // Start line
                coords: [
                    {x: CONNECTOR_SIZE_X-40, y: 0},                             // First "Spline" line
                    {x: LINE_X_OFFSET+40, y: yOffset},                          // First "Spline" line
                    {x: LINE_X_OFFSET, y: yOffset}                              // Finish line at this point
                ]
            });
        };

        // Determine if antialiasing should be used.  Antialiasing causes the
        // "blured" straight lines instead of making them "crisp".
        var determineAntialiasing = function (spec) {
            // If a yOffset is defined in the REGISTER_OVERLAY_SPEC then set to
            // auto.
            if (spec.yOffset)
                return 'auto';
            else
                return 'crispEdges';
        };

        // Append Paths that each of the previously defined line objects should 
        // follow. Draw the white line that goes in each of the defined line 
        // groups. (3px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'white')
        .attr('fill', 'none')
        .attr('stroke-width', 3)
        .style('shape-rendering', determineAntialiasing);
        
        // Append Paths that each of the previously defined line objects should 
        // follow. Draw the black line that goes in each of the defined line 
        // groups. (1px tall)
        lineGroup.append('path')
        .attr('d', lineFunction)
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('stroke-width', 1)
        .style('shape-rendering', determineAntialiasing);
        
        // var lineFunction = d3.svg.line()
        // .x(function(d) { return d.x; })
        // .y(function(d) { return d.y; })
        // .interpolate("linear");
        
        // lineGroup.append('path')
        // .attr('x1', LINE_X_OFFSET)
        // .attr('y1', 0)
        // .attr('stroke', 'white')
        // .attr('fill', 'none')
        // .attr('stroke-width', 3);
        
        // lineGroup.append('line')
        // .attr('x1', LINE_X_OFFSET)
        // .attr('y1', 0)
        // .attr('x2', CONNECTOR_SIZE_X)
        // .attr('y2', 0)
        // .attr('stroke', 'black')
        // .attr('fill', 'none')
        // .attr('stroke-width', 1);

        // Create a DIV for each of the registers for the main device
        var overlays = d3.select(DEVICE_REGISTERS_CONTAINER)
        .selectAll('.register-overlay')                                         // Try to replace any existing elements w/ this class
        .data(function () {                                                     // fill all of the elements with data.
            return REGISTER_OVERLAY_SPEC.filter(function (registerInfo) {
                return registerInfo.board === 'device';
            });
        })
        .enter()
        .append('div')
        .attr('class', function (registerInfo) {
            if (registerInfo.type === 'dio')
                return 'register-overlay fio-overlay';
            else
                return 'register-overlay';
        })
        .style('top', function (registerInfo) {
            var yFromTopOfImage = imageY + getOverlayYPos(registerInfo);
            if (registerInfo.yOffset)
                yFromTopOfImage += registerInfo.yOffset;
            return yFromTopOfImage + 'px';
        })
        .attr('id', function (registerInfo) {
            return REGISTER_DISPLAY_ID_TEMPLATE(registerInfo);
        })
        .html(function (registerInfo) {
            var curData = initializedData.get(registerInfo.register,{state:null,direction:null,type:null,value:null});
            registerInfo.state = curData.state;
            registerInfo.direction = curData.direction;
            registerInfo.regType = curData.type;
            registerInfo.value = curData.value;
            try {
                if(registerInfo.register.indexOf('DAC') !== -1) {
                    registerInfo.value = registerInfo.value.toFixed(4);
                } else if(registerInfo.register.indexOf('AIN') !== -1) {
                    registerInfo.value = registerInfo.value.toFixed(6);
                }
            } catch(err) {
                registerInfo.value = -9999;
            }
            var loadname = 'ain-in';
            if (registerInfo.type === 'dio') {
                loadname = 'dio';
            } else if (registerInfo.type === 'dac') {
                loadname = 'dac-out';
            }
            return self.displayTemplateData[loadname](registerInfo);
        });
    };
    this.roundReadings = function(reading) {
        return Math.round(reading*1000)/1000;
    }
     /**
      * Interprets the dict of currentValues for appropriate digital I/O data
      * @param  {string} reg            register name to parse from dict
      * @param  {dict} currentValues    Last-saved device values
      * @return {object}                Parsed state and direction values
    **/
    this.getCurInfo = function(reg, currentValues) {
        var baseReg = reg.slice(0,reg.length-1);
        var offset = Number(reg[reg.length-1]);
        var stateReg = baseReg + '_STATE';
        var directionReg = baseReg + '_DIRECTION';

        var stateMask = currentValues.get(stateReg);
        var directionMask = currentValues.get(directionReg);

        var stateVal = (stateMask >> offset) & 0x1;
        var directionVal = (directionMask >> offset) & 0x1;
        return {state:stateVal,direction:directionVal};
    };

    /**
     * A function that gets called by the controller.js onRefreshed function 
     * that updates the GUI with changed values.  Allows other applications to
     * edit the device settings over a different connection type and the values
     * to be automatically updated here.  More importantly it updates the analog
     * input and digital input values periodically.
     * @param  {array} channels        Array of channels to be updated w/ data
     * @param  {dict} currentValues    Dict of Last-saved device values
    **/
    this.updateValues = function (channels,currentValues) {
        var outputStrategies = {
            'analogInput-': function (channel, register) {
                var id = REGISTER_DISPLAY_ID_TEMPLATE({register: register});
                var ainVal = $('#'+id).find('.value');
                ainVal.html(Number(channel.value).toFixed(6));
            },
            'analogOutput-': function (channel, register) {
                var val = channel.value;
                $('#' + register + '_input_spinner').spinner('value', val);
            },
            'dynamic-0': function (channel, register) {
                var id = REGISTER_DISPLAY_ID_TEMPLATE({register: register});
                var state = {
                    '0': {'status': 'inactive', 'text': 'Low'},
                    '1': {'status': 'active', 'text': 'High'}
                }[channel.state.toString()];
                // Get the previously set state & direction for current register
                var curState = self.getCurInfo(register,currentValues);
                if(curState.direction == 1) {
                    // if the previous set direction was 1 (Output), configure GUI as input
                    var inputDisplayId = '#' + register + '-INDICATOR';
                    var outputDisplayId = '#' + register + '-STATE-SELECT';
                    var dirDisplayId = '#' + register + '-DIRECTION-SELECT .currentValue';
                    var outObj = $(outputDisplayId);
                    var inObj = $(inputDisplayId);
                    var dirObj = $(dirDisplayId);
                    outObj.hide();
                    inObj.show();
                    dirObj.html('Input');
                }
                // Update input GUI element text color and state-text
                var topElement = $('#' + id);
                var stateIndicator = topElement.find('.state-indicator')
                .removeClass('active inactive')
                .addClass(state.status);
                stateIndicator.html(state.text);
            },
            'dynamic-1': function (channel, register) {
                // Get the previously set state & direction for current register
                var curState = self.getCurInfo(register,currentValues);
                if(curState.direction == 0) {
                    // if the previous set direction was 0 (Input), configure GUI as output
                    var inputDisplayId = '#' + register + '-INDICATOR';
                    var outputDisplayId = '#' + register + '-STATE-SELECT';
                    var dirDisplayId = '#' + register + '-DIRECTION-SELECT .currentValue';
                    var outObj = $(outputDisplayId);
                    var inObj = $(inputDisplayId);
                    var dirObj = $(dirDisplayId);
                    inObj.hide();
                    outObj.show();
                    dirObj.html('Output');
                }
                // Update the GUI element text High/Low
                var statusId = '#' + register + '-STATE-SELECT .currentValue';
                var statusEl = $(statusId);
                var state = {
                    '0': {'text': 'Low'},
                    '1': {'text': 'High'}
                }[channel.state.toString()];
                statusEl.html(state.text);
            }
        };

        channels.forEach(function (channel, register) {
            outputStrategies[STRATEGY_NAME_TEMPALTE(channel)](
                channel,
                register
            );
        });
    };
    var self = this;
}