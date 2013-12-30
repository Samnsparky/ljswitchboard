/**
 * Logic for the device updater module for LabJack Swichboard.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/


var DEVICE_SELECTOR_SRC = 'device_updater/device_selector.html';
var FIRMWARE_LISTING_SRC = 'device_updater/firmware_listing.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';
var FIRMWARE_LIST_SELECTOR = '#firmware-list';

var request = require('request');

var FIRMWARE_LINK_REGEX = /href\=\".*T7firmware\_(\d+)\_(\d+)\.bin"/g;


/**
 * A wrapper around a device to make device update operations easier.
 *
 * @param {Objct} device The device to adapt.
**/
function UpgradeableDeviceAdapter(device)
{
    /**
     * Get the serial number of the device that is this decorator encapsulates.
     *
     * @return {Number} The serial number of the inner device.
    **/
    this.getSerial = function()
    {
        return device.getSerial();
    };

    /**
     * Get the name of the device that this decorator encapsulates.
     *
     * @return {String} The name of the inner device.
    **/
    this.getName = function()
    {
        return device.getName();
    };

    /**
     * Get the type of device that this decorator encapsulates.
     *
     * @return {String} The string description of the model of the device that
     *      this decorator encapsulates.
    **/
    this.getDeviceType = function()
    {
        return device.getDeviceType();
    }

    /**
     * Get the version of the firmware currently loaded on the given device.
     *
     * @return {Number} The version of the firmware on this decorator's
     *      encapsulated device.
    **/
    this.getFirmwareVersion = function()
    {
        return device.getFirmwareVersion().toFixed(4);
    };

    /**
     * Get the version of the bootloader currently loaded on the given device.
     *
     * @return {Number} The version of the bootloader on this decorator's
     *      encapsulated device.
    **/
    this.getBootloaderVersion = function()
    {
        return device.getBootloaderVersion().toFixed(4);
    }
}


/**
 * Download a list of available firmware versions.
 *
 * @param {function} onError The function to call if an error is encountered
 *      while downloading the firmware versions.
 * @param {function} onSuccess The function to call after the firmware version
 *      listing has been downloaded.
**/
function getAvailableFirmwareListing(onError, onSuccess)
{
    request(
        'http://www.labjack.com/support/firmware/t7',
        function (error, response, body) {
            if (error || response.statusCode != 200) {
                return; // TODO: More proper error reporting
            }

            var firmwareListing = [];
            
            var match = FIRMWARE_LINK_REGEX.exec(body);
            while (match !== null) {
                firmwareListing.push(
                    {version: parseFloat(match[1])/10000, latest: false}
                );
                match = FIRMWARE_LINK_REGEX.exec(body);
            }

            var numFirmwares = firmwareListing.length;
            var highestFirmware = firmwareListing[0];
            for (var i=1; i<numFirmwares; i++) {
                if (highestFirmware.version < firmwareListing[i].version)
                    highestFirmware = firmwareListing[i];
            }
            highestFirmware.latest = true;

            onSuccess(firmwareListing);
        }
    );
}


/**
 * Handler for selecting / unselecting devices for updating.
 *
 * Handler for checkboxes that select / unselect devices for updating. If no
 * devices are selected, the configuration pane / updater pane is hidden.
**/
function onChangeSelectedDevices()
{
    var selectedCheckboxes = $('.device-selection-checkbox:checked');
    if(selectedCheckboxes.length == 0)
        $('#device-configuration-pane').fadeOut();
    else
        $('#device-configuration-pane').fadeIn();
}


/**
 * Handler for when a firmware version is selected.
 *
 * Handler for when a firmware version is selected. Updates the dropdown menu
 * that allows the user to select a firmware.
 *
 * @param {Object} event The jQuery event information.
**/
function onFirmwareLinkSelect(event)
{
    var firmwareDisplayStr;

    var version = event.target.id.replace('-selector', '');

    if(event.target.getAttribute('latest') === 'true')
        firmwareDisplayStr = version + ' (latest)';
    else
        firmwareDisplayStr = version;

    $('#selected-firmware').html(firmwareDisplayStr);
    $('#selected-firmware').attr('selected-version', version);
}


/**
 * Populate the firmware options dropdown menu.
 *
 * Populate the firmware options dropdown menu, making the first firmware marked
 * as "latest" as the default choice.
 *
 * @param {Array} firmwareInfo An Array of Object with firmware version
 *      information.
**/
function displayFirmwareListing(firmwareInfo)
{
    var latestFirmwares = firmwareInfo.filter(function(e){ return e.latest; });
    var latestFirmware = latestFirmwares[0];

    $('#selected-firmware').html(latestFirmware.version + ' (latest)');
    $('#selected-firmware').attr('selected-version', latestFirmware.version);

    var location = fs_facade.getExternalURI(FIRMWARE_LISTING_SRC);
    fs_facade.renderTemplate(
        location,
        {'firmwares': firmwareInfo},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(FIRMWARE_LIST_SELECTOR).html(renderedHTML);
            $('.firmware-selection-link').click(onFirmwareLinkSelect);
            
            $('#web-load-waiting-indicator').hide();
            $('#firmware-select').fadeIn();
        }
    );
}


$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new UpgradeableDeviceAdapter(device);
    });

    var location = fs_facade.getExternalURI(DEVICE_SELECTOR_SRC);
    fs_facade.renderTemplate(
        location,
        {'devices': decoratedDevices},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(DEVICE_SELECTOR_PANE_SELECTOR).html(renderedHTML);
            $('.device-selection-checkbox').click(onChangeSelectedDevices);
        }
    );

    $('#browse-link').click(function () {
        var chooser = $('#file-dialog-hidden');
        chooser.change(function(evt) {
            var fileLoc = $(this).val();
            $('#file-loc-input').val(fileLoc);
        });

        chooser.trigger('click');

        return false;
    });

    getAvailableFirmwareListing(genericErrorHandler, displayFirmwareListing);
});
