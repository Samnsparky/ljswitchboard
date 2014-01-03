/**
 * Logic for the device updater module for LabJack Swichboard.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var DEVICE_SELECTOR_SRC = 'device_updater/device_selector.html';
var FIRMWARE_LISTING_SRC = 'device_updater/firmware_listing.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';
var FIRMWARE_LIST_SELECTOR = '#firmware-list';
var FIRMWARE_LINK_REGEX = /href\=\".*T7firmware\_(\d+)\_(\d+)\.bin"/g;
var NUM_UPGRADE_STEPS = 4.0;

var async = require('async');
var request = require('request');

var labjack_t7_upgrade = require('./labjack_t7_upgrade');

var selectedSerials = [];


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
    };

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
    };
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
            var targetURL = match[0].replace(/href\=\"/g, '');
            targetURL = targetURL.replace(/\"/g, '');

            while (match !== null) {
                firmwareListing.push(
                    {
                        version: parseFloat(match[1])/10000,
                        latest: false,
                        url: targetURL
                    }
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
    if(selectedCheckboxes.length === 0) {
        selectedSerials = [];
        $('#device-configuration-pane').fadeOut();
    }
    else {
        selectedSerials = [];
        selectedCheckboxes.each(function (index, item)  {
            selectedSerials.push($(item).attr('id'));
        });
        $('#device-configuration-pane').fadeIn();
    }
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

    $('#selected-firmware').html('version ' + firmwareDisplayStr);
    $('#selected-firmware').attr('selected-version', version);
    $('#selected-firmware').attr('remote', $(event.target).attr('remote'));
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

    $('#selected-firmware').html(
        'version ' + latestFirmware.version + ' (latest)'
    );
    $('#selected-firmware').attr('selected-version', latestFirmware.version);
    $('#selected-firmware').attr('remote', latestFirmware.url);

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


function updateFirmware (firmwareFileLocation) {
    $('.firmware-source-option').slideUp();
    $('#working-status-pane').slideDown();

    var keeper = device_controller.getDeviceKeeper();

    var ProgressListener = function () {

        this.update = function (value, callback) {
            $('#device-upgrade-progress-indicator-bar').css(
                {'width': value.toString() + '%'}
            );
            if (callback !== undefined)
                callback();
        };

        this.update(0);
    };

    async.each(
        selectedSerials,
        function (serial, callback) {
            console.log('start...');
            var device = keeper.getDevice(serial);
            var progressListener = new ProgressListener();
            labjack_t7_upgrade.updateFirmware(
                device.device,
                firmwareFileLocation,
                progressListener
            ).then(function (bundle) {
                var firmwareDisplaySelector = '#';
                firmwareDisplaySelector += serial.toString();
                firmwareDisplaySelector += '-firmware-display';
                device.device = bundle.getDevice();
                $(firmwareDisplaySelector).html(bundle.getFirmwareVersion());
                callback(null);
            });
        },
        function (err) {
            if (err) {
                console.log(err);
                return;
            }
            $('.firmware-source-option').slideDown();
            $('#working-status-pane').slideUp();
        }
    );
}


$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new UpgradeableDeviceAdapter(device);
    });

    selectedSerials = [decoratedDevices[0].getSerial()];

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

    $('#local-update-button').click(function () {
        updateFirmware($('#file-loc-input').val());
        return false;
    });

    $('#web-update-button').click(function () {
        updateFirmware($('#selected-firmware').attr('remote'));
        return false;
    });

    getAvailableFirmwareListing(genericErrorHandler, displayFirmwareListing);
});
