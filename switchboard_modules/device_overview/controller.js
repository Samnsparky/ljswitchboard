var LABJACK_OVERVIEW_IMG_SRC = 'http://gleap.org/static/img/T7-cartoon.png';
var DEVICE_IMAGE_X_OFFSET = 150;
var DEVICE_IMAGE_Y_OFFSET = 10;
var VALUE_LABEL_X_OFFSET = -40;
var DEVICE_IMG_WIDTH = 225;
var DEVICE_IMG_HEIGHT = 525;
var VALUE_TEXT_X_OFFSET = -50;
var VALUE_TEXT_Y_OFFSET = -6;
var EDIT_RECT_X_OFFSET = -30;
var EDIT_RECT_Y_OFFSET = 0;
var EDIT_RECT_WIDTH = 27;
var EDIT_RECT_HEIGHT = 12;
var EDIT_TEXT_X_OFFSET = 3;
var EDIT_TEXT_Y_OFFSET = 0;

var TEST_OVERLAY_SPEC = [
    {register: 'AIN0', yLocation: 0.783, type: null},
    {register: 'AIN1', yLocation: 0.757, type: null},
    {register: 'AIN2', yLocation: 0.664, type: null},
    {register: 'AIN3', yLocation: 0.639, type: null},
    {register: 'DAC0', yLocation: 0.545, type: 'dac'},
    {register: 'DAC1', yLocation: 0.519, type: 'dac'},
    {register: 'FIO0', yLocation: 0.426, type: 'fio'},
    {register: 'FIO1', yLocation: 0.403, type: 'fio'},
    {register: 'FIO2', yLocation: 0.308, type: 'fio'},
    {register: 'FIO3', yLocation: 0.283, type: 'fio'}
];

var INITIALIZATION_STRATEGIES = {
    'fio': noopStrategy,
    'dac': noopStrategy
};

var START_READ_STRATEGIES = {
    'fio': setFIOToInput,
    'dac': noopStrategy
};

var START_WRITE_STRATEGIES = {
    'fio': setFIOToOutput,
    'dac': noopStrategy
};

var EDIT_CONTROLS_TEMPLATE_STR = '<div class="edit-control row-fluid" id="{{ . }}-edit-control">' +
    '<div class="span1 edit-label">{{ . }}</div>' +
    '<div class="span5 val-input-holder"><input id="{{ . }}-val-input" type="text" placeholder="val to write"></div>' +
    '<div class="span6">' +
    '<a href="#" id="{{ . }}-write-btn" class="write-button btn btn-success">write</a>' +
    '<a href="#" id="{{ . }}-close-btn" class="close-button btn btn-warning">return {{ . }} to read-mode</a>' +
    '</div>' +
    '</div>';
var EDIT_CONTROLS_TEMPLATE = handlebars.compile(EDIT_CONTROLS_TEMPLATE_STR);
var EDIT_CONTROL_ID_TEMPLATE = handlebars.compile('#{{ . }}-edit-control');
var WRITE_BTN_ID_TEMPLATE = handlebars.compile('#{{ . }}-write-btn');
var CLOSE_BTN_ID_TEMPLATE = handlebars.compile('#{{ . }}-close-btn');
var VAL_INPUT_ID_TEMPLATE = handlebars.compile('#{{ . }}-val-input');

var writing = false;
var selectedDevice = device_controller.getDeviceKeeper().getDevices()[0];
var currentDeviceSelection = 0;
var tabID = getActiveTabID();


function formatNum(target) {
    return parseFloat(Math.round(target * 100000) / 100000).toFixed(5);
}


function getOverlayElementYPos(yElementOffset) {
    return DEVICE_IMAGE_Y_OFFSET + yElementOffset * DEVICE_IMG_HEIGHT;
}


function createOverlayLinePoints(yElementOffset) {
    return [
        DEVICE_IMAGE_X_OFFSET,             
        getOverlayElementYPos(yElementOffset),
        DEVICE_IMAGE_X_OFFSET + VALUE_LABEL_X_OFFSET,
        getOverlayElementYPos(yElementOffset)
    ];
}


function createOverlayElement(layer, overlayElementSpec) {
    var connectingLine;
    var valueText;
    var textXPos;
    var textYPos;
    var editRect;
    var editText;
    var editCtrl;
    var editCtrlXOffset;
    var editCtrlYOffset;
    var state;
    var updateFunction;
    var writeFunction;

    textXPos = VALUE_LABEL_X_OFFSET + DEVICE_IMAGE_X_OFFSET;
    textXPos += VALUE_TEXT_X_OFFSET; 
    textYPos = getOverlayElementYPos(overlayElementSpec.yLocation);
    textYPos += VALUE_TEXT_Y_OFFSET;
    editCtrlXOffset = textXPos + EDIT_RECT_X_OFFSET;
    editCtrlYOffset = textYPos + EDIT_RECT_Y_OFFSET;

    connectingLine = new Kinetic.Line({
        points: createOverlayLinePoints(overlayElementSpec.yLocation),
        stroke: '#A0A0A0',
        strokeWidth: 1,
        lineCap: 'round',
        lineJoin: 'round'
    });

    valueText = new Kinetic.Text({
        x: textXPos,
        y: textYPos,
        text: 'wait...',
        fontSize: 13,
        fontFamily: 'Helvetica',
        fill: 'black'
    });

    state = {
        isEditing: false
    };

    layer.add(connectingLine);
    layer.add(valueText);

    if (overlayElementSpec.type !== null) {
        editCtrl = new Kinetic.Group({
            x: editCtrlXOffset,
            y: editCtrlYOffset
        });

        editRect = new Kinetic.Rect({
            x: 0,
            y: 0,
            width: EDIT_RECT_WIDTH,
            height: EDIT_RECT_HEIGHT,
            fill: '#D0D0D0'
        });

        editText = new Kinetic.Text({
            x: EDIT_TEXT_X_OFFSET,
            y: EDIT_TEXT_Y_OFFSET,
            text: 'edit',
            fontSize: 12,
            fontFamily: 'Helvetica',
            fill: '#404040'
        });

        editCtrl.on('mouseover', function() {
            editRect.setFill('black');
            editText.setFill('white');
            layer.draw();
        });
      
        editCtrl.on('mouseout', function() {
            editRect.setFill('#D0D0D0');
            editText.setFill('#404040');
            layer.draw();
        });

        editCtrl.on('mousedown', function() {
            state.isEditing = true;
            editCtrl.remove();
            layer.draw();
            showEditControls(
                overlayElementSpec.register,
                writeFunction,
                function () {
                    state.isEditing = false;
                    layer.add(editCtrl);
                    layer.draw();
                }
            );
        });

        editCtrl.add(editRect);
        editCtrl.add(editText);
        layer.add(editCtrl);
    }

    updateFunction = function (registersToRead) {
        if (state.isEditing)
            return null;

        registersToRead.push(overlayElementSpec.register);
        return function (result) {
            valueText.setText(formatNum(result));
        };
    };

    writeFunction = function (value) {
        writing = true;
        selectedDevice.write(overlayElementSpec.register, value);
        valueText.setText(formatNum(value));
        writing = false;
    };

    return updateFunction;
}


function showEditControls (registerLabel, writeFunction, closeFunction) {
    var resultingHTML = EDIT_CONTROLS_TEMPLATE(registerLabel);
    var editControlID = EDIT_CONTROL_ID_TEMPLATE(registerLabel);
    var writeBtnID = WRITE_BTN_ID_TEMPLATE(registerLabel);
    var closeBtnID = CLOSE_BTN_ID_TEMPLATE(registerLabel);
    var valInputID = VAL_INPUT_ID_TEMPLATE(registerLabel);

    $('#edit-fields').append(resultingHTML);
    $(editControlID).hide();
    $(editControlID).slideDown();
    $(writeBtnID).click(function () {
        // TODO: Error handler here if cannot convert
        writeFunction(parseFloat($(valInputID).val()));
        return false;
    });
    $(closeBtnID).click(function () {
        $(editControlID).slideUp(function () {
            $(editControlID).remove();
        });
        closeFunction();
    });
}


function createDrawing (overlaySpec, onFinish) {
    var stage;
    var layer;
    var deviceImageObj;
    var updateFunctions;

    // Create containing structures
    stage = new Kinetic.Stage({
        container: 'container',
        width: 400,
        height: 550
    });
    layer = new Kinetic.Layer();

    // Create device image
    var createDeviceImage = function (onFinish) {
        deviceImageObj = new Image();
        deviceImageObj.onload = function() {
            var deviceImage = new Kinetic.Image({
                x: DEVICE_IMAGE_X_OFFSET,
                y: DEVICE_IMAGE_Y_OFFSET,
                image: deviceImageObj,
                width: DEVICE_IMG_WIDTH,
                height: DEVICE_IMG_HEIGHT
            });
            layer.add(deviceImage);
            if (onFinish) { onFinish(); }
        };
        deviceImageObj.src = LABJACK_OVERVIEW_IMG_SRC;
    };

    // Create overlay graphical elements
    var createOverlayElements = function (onFinish) {
        updateFunctions = overlaySpec.map(function (e) {
            return createOverlayElement(layer, e);
        });
        if (onFinish) { onFinish(updateFunctions); }
    };

    // add the layer to the stage
    var addLayerToStage = function (onFinish) {
        stage.add(layer);
        if (onFinish) { onFinish(); }
    };

    var refreshFunction = function () {
        layer.draw();
    };

    createDeviceImage(function () {
        createOverlayElements(function () {
            addLayerToStage(function () {
                onFinish(refreshFunction, updateFunctions);
            });
        });
    });
}


function readDeviceValues (refreshFunction, updateFunctions, deviceSelection) {
    var registersToRead;
    var numCallbacks;
    var callbacks;
    var setReadTimeout;

    var changedDevice = deviceSelection !== currentDeviceSelection;
    var changedTab = tabID !== getActiveTabID();
    if (changedDevice || changedTab)
        return;

    setReadTimeout = function () {
        setTimeout(
            function () {
                readDeviceValues(
                    refreshFunction,
                    updateFunctions,
                    deviceSelection
                );
            },
            750
        );
    };

    if (!writing) {
        registersToRead = [];
        
        callbacks = updateFunctions.map(function (func) {
            return func(registersToRead);
        });

        callbacks = callbacks.filter(function (func) {
            return func !== null;
        });

        selectedDevice.readMany(registersToRead)
        .then(
            function (values) {
                numCallbacks = callbacks.length;
                for (var i=0; i<numCallbacks; i++) {
                    callbacks[i](values[i]);
                }

                setReadTimeout();
            },
            function (err) {
                showError(err);
            }
        )
        
        refreshFunction();

    } else {
        setReadTimeout();
    }
}


function setFIOToInput (device, registerInfo) {

}


function setFIOToOutput (device, registerInfo) {

}


function noopStrategy (device, registerInfo) {}


function setupDevice (targetSpec) {
    var targetFunc;

    selectedDevice.write('FIO_DIRECTION', 0);

    targetSpec.forEach(function (specComponent) {
        targetFunc = INITIALIZATION_STRATEGIES[specComponent.type];
        if(targetFunc !== undefined)
            targetFunc(selectedDevice, specComponent);
    });
}


$('#device-info-inspector').ready(function () {
    $('.device-selection-radio').first().prop('checked', true);
    $('.device-selection-radio').change( function (event) {
        var serial = event.target.id.replace('-selector', '');
        $('.edit-control').slideUp(function () {
            $('.edit-control').remove();
        });
        $('#container').fadeOut(function () {
            var deviceKeeper = device_controller.getDeviceKeeper();
            selectedDevice = deviceKeeper.getDevice(serial);
            setupDevice(TEST_OVERLAY_SPEC);
            currentDeviceSelection++;
            createDrawing(
                TEST_OVERLAY_SPEC,
                function (refreshFunction, updateFunctions) {
                    readDeviceValues(
                        refreshFunction,
                        updateFunctions,
                        currentDeviceSelection
                    );
                }); 
            $('#container').fadeIn();
        });
    });

    var devices = device_controller.getDeviceKeeper().getDevices();
    selectedDevice = devices[0];
    setupDevice(TEST_OVERLAY_SPEC);
    createDrawing(
        TEST_OVERLAY_SPEC,
        function (refreshFunction, updateFunctions) {
            readDeviceValues(
                refreshFunction,
                updateFunctions,
                currentDeviceSelection
            );
        }
    );
});
