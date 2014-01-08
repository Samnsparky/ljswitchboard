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
    {register: 'AIN0', yLocation: 0.783, editStrategy: null},
    {register: 'AIN1', yLocation: 0.757, editStrategy: null},
    {register: 'AIN2', yLocation: 0.664, editStrategy: null},
    {register: 'AIN3', yLocation: 0.639, editStrategy: null},
    {register: 'DAC0', yLocation: 0.545, editStrategy: 'simpleWrite'},
    {register: 'DAC1', yLocation: 0.519, editStrategy: 'simpleWrite'},
    {register: 'FIO0', yLocation: 0.426, editStrategy: 'fioWrite'},
    {register: 'FIO1', yLocation: 0.403, editStrategy: 'fioWrite'},
    {register: 'FIO2', yLocation: 0.308, editStrategy: 'fioWrite'},
    {register: 'FIO3', yLocation: 0.283, editStrategy: 'fioWrite'}
];

var EDIT_CONTROLS_TEMPLATE_STR = '<div id="{{ . }}-edit-control" class="row-fluid edit-control">' +
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

    if (overlayElementSpec.editStrategy !== null) {
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
        console.log('writing to ' + overlayElementSpec.register);
        console.log('writing value ' + value.toString());
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


function readDeviceValues (refreshFunction, updateFunctions) {
    var registersToRead;
    var callbacks;

    if (!writing) {
        registersToRead = [];
        
        callbacks = updateFunctions.map(function (func) {
            return func(registersToRead);
        });

        callbacks = callbacks.filter(function (func) {
            return func !== null;
        });

        callbacks.forEach(function (func) {
            func(Math.random());
        });
        
        refreshFunction();

        setTimeout(
            function () {
                readDeviceValues(refreshFunction, updateFunctions);
            },
            1000
        );
    } else {
        setTimeout(
            function () {
                readDeviceValues(refreshFunction, updateFunctions);
            },
            500
        );
    }
}


createDrawing(TEST_OVERLAY_SPEC, readDeviceValues);