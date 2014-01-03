/**
 * Logic for the device selector integrated module.
 *
 * @author A. Samuel Pottinger (LabJack, 2013)
**/

var handlebars = require('handlebars');

var device_controller = require('./device_controller');

var OPEN_FAIL_MESSAGE = handlebars.compile(
    'Sorry. Failed to the open device. Please check the ' +
    'physical connection and try again or contact support@labjack.com. ' +
    'Driver error number: {{.}}');

/**
 * Event handler to show the connect buttons for a device.
 *
 * Event handler that displays the GUI widgets that allow a user to select which
 * method (USB, Ethernet, WiFi, etc.) he / she wants to use to communicate with
 * a device.
 * 
 * @param {jquery.Event} event jQuery event. The widgets manipulated will be
 *      relative to the target and should be show-connect-button or comperable.
**/
function showConnectButtons(event)
{
    var jqueryID = '#' + event.target.id;
    $(jqueryID).parents('#info').slideUp(function(){
        var parents = $(jqueryID).parents('#info-holder');
        var children = parents.children('#connect-buttons');
        children.slideDown();
    });
}


/**
 * Event handler to hide the connect buttons for a device.
 *
 * Event handler that hides the GUI widgets that allow a user to select which
 * method (USB, Ethernet, WiFi, etc.) he / she wants to use to communicate with
 * a device.
 *
 * @param {jquery.Event} event jQuery event. The widgets manipulated will be
 *      relative to the target and should be cancel-connect-button or
 *      comperable.
**/
function hideConnectButtons(event)
{
    var jqueryID = '#' + event.target.id;
    $(jqueryID).parents('#connect-buttons').slideUp(function(){
        $(jqueryID).parents('#info-holder').children('#info').slideDown();
    });
}


/**
 * Event handler that opens a connection to a device.
 *
 * @param {jquery.Event} event jQuery event whose target should have an ID of
 *      the form deviceType-serial-connectionType (AngularJS should be used
 *      next time).
**/
function connectNewDevice(event)
{
    var deviceInfo = event.target.id.split('-');
    var jqueryID = '#' + event.target.id;

    var serial = deviceInfo[1];
    var ipAddress = deviceInfo[2].replace(/\_/g, '.');
    var connectionType = parseInt(deviceInfo[4]);
    var deviceType = parseInt(deviceInfo[5]);

    var info = $(jqueryID).parents('#info-holder').children('#info');
    info.children('.device-load-progress').show();
    info.children('#show-connect-button-holder').hide();
    $('#finish-button').slideUp();
    $('.connect-button').slideUp();

    hideConnectButtons(event);

    var onDeviceOpenend = function(device)
    {
        device_controller.getDeviceKeeper().addDevice(device);
        showFinishButton();
        $('.connect-button').slideDown();
        info.children('.progress').fadeOut(function(){
            info.children('#disconnect-button-holder').fadeIn();
        });
    };

    device_controller.openDevice(serial, ipAddress, connectionType, deviceType,
        showAlert, onDeviceOpenend);
}


/**
 * Event handler that disconnects a device.
 *
 * @param {jquery.Event} event jQuery event whose target should have an ID of
 *      the form serial-.... The serial number will be parsed and that device
 *      will be disconnected. AngularJS or equivalent should be used next time.
**/
function disconnectDevice(event)
{
    var deviceInfo = event.target.id.split('-');
    var jqueryID = '#' + event.target.id;
    var serial = deviceInfo[0];

    var info = $(jqueryID).parents('#info-holder').children('#info');

    info.children('#disconnect-button-holder').hide();
    info.children('.progress').fadeIn();

    var device = device_controller.getDeviceKeeper().getDevice(serial);

    var onDeviceClosed = function(device)
    {
        var deviceKeeper = device_controller.getDeviceKeeper();

        deviceKeeper.removeDevice(device);
        info.children('.progress').fadeOut(function(){
            info.children('#show-connect-button-holder').fadeIn();
        });

        if(deviceKeeper.getNumDevices() == 0)
        {
            hideFinishButton();
        }
    }

    device_controller.closeDevice(device, onDeviceClosed, showAlert);
}


/**
 * Convenience function to show the finish button.
 *
 * Convenience function to show the button that allows the user to move past the
 * device selector. Should only be shown when >0 devices are connected.
**/
function showFinishButton()
{
    $('#finish-button').slideDown();
}


/**
 * Convenience function to hide the finish button.
 *
 * Convenience function to hide the button that allows the user to move past the
 * device selector. Should only be hidden when <1 devices are connected.
**/
function hideFinishButton()
{
    $('#finish-button').slideUp();
}


/**
 * Hide the alert error display at the top of the screen.
**/
function closeAlert()
{
    $('#alert-message').fadeOut(function(){
        $('.device-selector-holder').css('margin-top', '45px');
    });
}


/**
 * Transition the user view to the software modules.
 *
 * Transition away from the device selector and replace it with the module
 * chome and starting module.
**/
function moveToModules()
{
    renderTemplate(
        'module_chrome.html',
        {},
        CONTENTS_ELEMENT,
        true,
        ['module_chrome.css'],
        ['module_chrome.js'],
        genericErrorHandler
    );
}


/**
 * Show an error message in an alert modal at the top of the screen.
 *
 * Show an error message in an alert modal positioned at the top of the screen.
 * This modal should be embedded and fixed (no moving). However, it should be
 * closeable.
 *
 * @param {String} errorMessage The message to display.
**/
function showAlert(errorMessage)
{
    var message = OPEN_FAIL_MESSAGE(errorMessage);
    $('#error-display').html(message);
    $('.device-selector-holder').css('margin-top', '0px');
    $('#alert-message').fadeIn();
}


function refreshDevices()
{
    $('#device-search-msg').show();
    $('#content-holder').html('');
    var onDevicesLoaded = function(devices) {
        var context = {'connection_types': includeDeviceDisplaySizes(devices)};
        $('#device-search-msg').hide();
        renderTemplate(
            'device_selector.html',
            context,
            CONTENTS_ELEMENT,
            true,
            ['device_selector.css'],
            ['device_selector.js'],
            genericErrorHandler
        );
    };

    var devices = device_controller.getDevices(
        genericErrorHandler,
        onDevicesLoaded
    );
}


$('#device-selector-holder').ready(function(){
    $('.show-connect-button').click(showConnectButtons);
    $('.cancel-connection-button').click(hideConnectButtons);
    $('.connect-button').click(connectNewDevice);
    $('.close-alert-button').click(closeAlert);
    $('.disconnect-button').click(disconnectDevice);
    $('#refresh-button').click(refreshDevices);
    $('#finish-button').click(moveToModules);

    var deviceKeeper = device_controller.getDeviceKeeper();

    if(deviceKeeper.getNumDevices() > 0)
        $('#finish-button').show();
});
