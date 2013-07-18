var DEVICE_SELECTOR_SRC = 'device_updater/device_selector.html';
var FIRMWARE_LISTING_SRC = 'device_updater/firmware_listing.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';
var FIRMWARE_LIST_SELECTOR = '#firmware-list';


function UpgradeableDeviceAdapter(device)
{
    this.getSerial = function()
    {
        return device.getSerial();
    };

    this.getName = function()
    {
        return device.getName();
    };

    this.getFirmwareVersion = function()
    {
        return '1.23';
    };

    this.getBootloaderVersion = function()
    {
        return '2.34';
    }
}


function getAvailableFirmwareListing(onError, onSuccess)
{
    var firmwareListing = [
        {'version': '1.24', 'latest': true},
        {'version': '1.23', 'latest': false},
        {'version': '1.22', 'latest': false},
        {'version': '1.21', 'latest': false},
        {'version': '1.20', 'latest': false}
    ];

    window.setTimeout(function(){
        displayFirmwareListing(firmwareListing);
    }, 2000);
}


function onChangeSelectedDevices()
{
    var selectedCheckboxes = $('.device-selection-checkbox:checked');
    if(selectedCheckboxes.length == 0)
        $('#device-configuration-pane').fadeOut();
    else
        $('#device-configuration-pane').fadeIn();
}


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

    getAvailableFirmwareListing(genericErrorHandler, displayFirmwareListing);
});
