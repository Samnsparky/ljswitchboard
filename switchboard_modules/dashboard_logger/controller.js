var async = require('async');
var dict = require('dict');
var extend = require('node.extend');
var q = require('q');

var ljmmm = require('./ljmmm');

var REGISTERS_DATA_SRC = 'dashboard_logger/ljm_constants.json';
var DEVICE_CATEG_SELECT_TEMPLATE_SRC = 'dashboard_logger/device_category_selector.html';
var CHANNEL_LIST_TEMPLATE_SRC = 'dashboard_logger/channel_list.html';
var WATCHLIST_TEMPLATE_SRC = 'dashboard_logger/watchlist.html'

var CHANNEL_SELECTOR_HOLDER_SELECTOR = '#channel-selector-holder';

var selectedRegisters = [];


function selectDevice(event, registersByTag)
{
    var selectedDeviceInfo = $('#device-select-menu').val().split('-');
    var selectedSerial = selectedDeviceInfo[0];
    var selectedName = selectedDeviceInfo[1];

    var displayName = selectedSerial + ' (' + selectedName + ')';

    $('#device-selector').slideUp();
    $('#selected-device-display').html(displayName);
    $('#selected-device-display-holder').show();
    $('#category-selector').slideDown();

    $('#category-select-menu option').unbind();
    $('#category-select-menu option').click(function(event){
        selectCategory(event, registersByTag, selectedSerial, selectedName);
    });
}


function decorateSelectedRegisters(registers)
{
    var selectedAddresses = selectedRegisters.map(function(e){
        return e.register.address;
    });

    var retList = [];
    var newRegister;
    var curAddress;

    for(var i in registers)
    {
        newRegister = extend({}, registers[i]);
        curAddress = newRegister.address;
        newRegister.selected = selectedAddresses.indexOf(curAddress) != -1;
        retList.push(newRegister);
    }

    return retList;
}


function refreshWatchList()
{
    var location = fs_facade.getExternalURI(WATCHLIST_TEMPLATE_SRC);
    if(selectedRegisters.length > 0)
    {
        fs_facade.renderTemplate(
            location,
            {'channels': selectedRegisters},
            genericErrorHandler,
            function(renderedHTML)
            {
                $('#register-watch-table').html(renderedHTML);
            }
        );
    }
    else
    {
        $('#register-watch-table').hide();
    }
}


function selectCategory(event, registersByTag, selectedSerial, selectedName)
{
    var selectedCategory = $('#category-select-menu').val();
    $('#category-selector').slideUp();
    $('#selected-category-display').html(selectedCategory);
    $('#selected-category-display-holder').show();
    $('#register-selector').slideDown();

    var registers = registersByTag.get(selectedCategory);
    var decoratedRegisters = decorateSelectedRegisters(registers);

    var devices = device_controller.getDeviceKeeper().getDevices();

    var templateVals = {'registers': decoratedRegisters};

    var location = fs_facade.getExternalURI(CHANNEL_LIST_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        templateVals,
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#channel-select-menu').html(renderedHTML);
            
            $('.reg-checkbox').change(function(event){
                var checkboxID = event.target.id;
                var regInfo = checkboxID.replace('-reg-selector','').split('-');
                var regName = regInfo[0];
                var regAddress = Number(regInfo[1]);

                var jquerySelector = '#' + checkboxID;
                var selected = $(jquerySelector).prop('checked');
                
                if(selected)
                {
                    var register = registers.filter(function(e){
                        return e.address == regAddress
                    })[0];

                    var device = devices.filter(function(e){
                        return e.getSerial() === selectedSerial
                    })[0];

                    selectedRegisters.push(
                        {'register': register, 'device': device}
                    );
                }
                else
                {
                    selectedRegisters = selectedRegisters.filter(function(e){
                        return e.register.address != regAddress;
                    });
                }

                selectedRegisters.sort(function(a, b){
                    return a.register.address - b.register.address;
                });

                refreshWatchList();
            });
        }
    );
}


function renderChannelSelectControls(registersByTag)
{
    var deferred = q.defer();

    var devices = device_controller.getDeviceKeeper().getDevices();
    var categories = [];
    registersByTag.forEach(function(value, key){
        categories.push(key);    
    });

    var templateVals = {
        'devices': devices,
        'categories': categories
    };

    var location = fs_facade.getExternalURI(DEVICE_CATEG_SELECT_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        templateVals,
        genericErrorHandler,
        function(renderedHTML)
        {
            $(CHANNEL_SELECTOR_HOLDER_SELECTOR).html(renderedHTML);
            $('#category-selector').hide();
            $('#register-selector').hide();

            $('#device-select-menu option').click(function(event){
                selectDevice(event, registersByTag)
            });

            deferred.resolve();
        }
    );

    return deferred.promise;
}



function getRegistersByTag(registers)
{
    var deferred = q.defer();

    var retDict = dict();
    async.each(
        registers,
        function(register, callback)
        {
            for(var i in register.tags)
            {
                var tag = register.tags[i]
                if(tag.replace(' ', '') !== '')
                {
                    if(!retDict.has(tag))
                        retDict.set(tag, []);
                    retDict.get(tag).push(register);
                }
            }

            callback();
        },
        function(err)
        {
            if(err !== null)
            {
                genericErrorHandler(err);
                return;
            }
            deferred.resolve(retDict);
        }
    );

    return deferred.promise;
}


function getRegisters()
{
    var deferred = q.defer();

    var registerInfoSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
    fs_facade.getJSON(registerInfoSrc, genericErrorHandler, function(info){
        deferred.resolve(info['registers']);        
    });

    return deferred.promise;
}


/**
 * Interpret the name fields of entries as LJMMM fields.
 *
 * Interpret the name fields of entries as LJMMM fields, creating the
 * appropriate register information Objects during enumeration during that
 * LJMMM interpretation.
 *
 * @param {Array} entries An Array of Object with information about registers
 *      whose name field should be interpreted as LJMMM fields.
 * @return {q.deferred.promise} A Q promise that resolves to an Array of Array
 *      of Objects with information about registers. Each sub-array is the
 *      result of interpreting a register entry's name field as LJMMM and
 *      enumerating as appropriate.
**/
function expandLJMMMEntries(entries)
{
    var deferred = q.defer();

    async.map(
        entries,
        function(entry, callback){
            ljmmm.expandLJMMMEntry(entry, function(newEntries){
                callback(null, newEntries);
            });
        },
        function(error, newEntries){
            deferred.resolve(newEntries);
        }
    );

    return deferred.promise;
}


function flattenRegisters(registers)
{
    var deferred = q.defer();

    var retArray = [];
    async.each(
        registers,
        function(registerSet, callback)
        {
            for(var i in registerSet)
            {
                retArray.push(registerSet[i]);
            }

            callback();
        },
        function(err)
        {
            if(err !== null)
            {
                genericErrorHandler(err);
                return;
            }
            deferred.resolve(retArray);
        }
    );

    return deferred.promise;
}


$('#dashboard-logger').ready(function(){
    $('#polling-rate-control').slider();

    getRegisters()
    .then(expandLJMMMEntries)
    .then(flattenRegisters)
    .then(getRegistersByTag)
    .then(renderChannelSelectControls)
    .done();
});