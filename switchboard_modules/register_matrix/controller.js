/**
 * Logic for the register matrix LabJack Switchboard module.
 *
 * Logic for a matrix with information about registers that also allows users
 * to read and write the current value of those registers via raw values.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

function ACTIVE_KIPLING_MODULE() {

var async = require('async');
var handlebars = require('handlebars');
var simplesets = require('simplesets');
var q = require('q');

var labjack_nodejs = require('labjack-nodejs');
var ljmmm = require('./ljmmm');

var REGISTERS_DATA_SRC = 'register_matrix/ljm_constants.json';
var REGISTERS_TABLE_TEMPLATE_SRC = 'register_matrix/matrix.html';
var REGISTER_WATCH_LIST_TEMPLATE_SRC = 'register_matrix/watchlist.html';

var REGISTER_MATRIX_SELECTOR = '#register-matrix';
var REGISTER_WATCHLIST_SELECTOR = '#register-watchlist';

var DESCRIPTION_DISPLAY_TEMPLATE_SELECTOR_STR =
    '#{{address}}-description-display';
var ADD_TO_LIST_DESCRIPTOR_TEMPLATE_STR = '#{{address}}-add-to-list-button';
var WATCH_ROW_SELECTOR_TEMPLATE_STR = '#{{address}}-watch-row';
var WRITE_INPUT_SELECTOR_TEMPLATE_STR = '#write-reg-{{address}}-input';

var DESCRIPTION_DISPLAY_SELECTOR_TEMPLATE = handlebars.compile(
    DESCRIPTION_DISPLAY_TEMPLATE_SELECTOR_STR);
var ADD_TO_LIST_DESCRIPTOR_TEMPLATE = handlebars.compile(
    ADD_TO_LIST_DESCRIPTOR_TEMPLATE_STR);
var WATCH_ROW_SELECTOR_TEMPLATE = handlebars.compile(
    WATCH_ROW_SELECTOR_TEMPLATE_STR);
var WRITE_INPUT_SELECTOR_TEMPLATE = handlebars.compile(
    WRITE_INPUT_SELECTOR_TEMPLATE_STR);

var REFRESH_DELAY = 1000;

var selectedDevice;
var registerWatchList = [];
var curTabID = getActiveTabID();

var localRegistersList = [];
this.getLocalRegistersList = function() {
    return localRegistersList;
}


/**
 * Inform the user of an error via the GUI.
 *
 * @param {Object} err The error encountered. If err has a retError attribute,
 *      that error will be described by its retError attribute. Otherwise it
 *      will be described by its toString method.
**/
function showError(err) {
    var errMsg;

    if (err.retError === undefined) {
        errMsg = err.toString();
    } else {
        errMsg = err.retError.toString();
    }

    showAlert('Error while communicating with the device: ' + errMsg);
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
            if (error) {
                deferred.reject(error);
            } else {
                localRegistersList = newEntries;
                deferred.resolve(newEntries);
            }
        }
    );

    return deferred.promise;
}


/**
 * Load information about registers for all devices.
 *
 * @return {q.defer.promise} A Q promise that will resolve to an Array of Object
 *      where each object contains information about a register or set of
 *      registers. The later will have a name field that can be interpreted as
 *      LJMMM.
**/
function getRegisterInfo()
{
    var deferred = q.defer();
    var ljmRegisters = [];

    // Get and add the non-beta registers
    device_controller.ljm_driver.constants.origConstants.registers.forEach(function(reg){
        ljmRegisters.push(reg);
    });

    // Get and add the beta registers
    device_controller.ljm_driver.constants.origConstants.registers_beta.forEach(function(reg){
        ljmRegisters.push(reg);
    });
    deferred.resolve(ljmRegisters);

    return deferred.promise;
}


/**
 * Filter out register entries that are not available on the given device type.
 *
 * @param {Array} registers An Array of Object with information about a
 *      register or a set of registers. Each Object must have a device field
 *      with the type of Array of Object, each element having a name field.
 * @param {String} deviceName The device type to look for. All register entries
 *      that do not have this device type will be filtered out.
 * @return {q.defer.promise} A Q promise that will resolve to an Array of Object
 *      where each Object contains information about an register or class of
 *      registers. This Array will contain all of the registers originally
 *      passed in that have the given device type listed in their devices
 *      field. All others will be excluded.
**/
function filterDeviceRegisters(registers, deviceName)
{
    var deferred = q.defer();

    async.filter(
        registers,
        function(register, callback){
            var devices = register.devices;

            if (typeof devices == 'string' || devices instanceof String) {
                callback(devices === deviceName);
            } else {
                var names = devices.map(function(e){
                    if(e.device === undefined)
                        return e;
                    else
                        return e.device;
                });
                callback(names.indexOf(deviceName) != -1);
            }
        },
        function(registers){
            deferred.resolve(registers);
        }
    );

    return deferred.promise;
}


/**
 * Create a function as a closure over a device type for filterDeviceRegisters.
 *
 * Create a closure around device that calls filterDeviceRegisters with the
 * provided device type.
 *
 * @param {String} device The device type that is being filtered for.
 * @return {function} Closure with device type info. See filterDeviceRegisters.
**/
function createDeviceFilter(device)
{
    return function(registers){
        return filterDeviceRegisters(registers, device);
    };
}


/**
 * Add a new field to the given register information objects with firmware info.
 *
 * Add a new field to the given register information objects with the minimum
 * firmware at which the cooresponding register became available for the given
 * device type.
 *
 * @param {Array} registers An Array of Object with information about registers
 *      to decorate.
 * @param {String} device The name of the device type to find the minimum
 *      firmware version for.
 * @return {q.defer.promise} A Q promise that resovles to an Array of Object
 *      with information about a register or class of registers. These modified
 *      Objects will have an added relevantFwmin field.
**/
function fwminSelector(registers, device)
{
    var deferred = q.defer();

    async.map(
        registers,
        function(register, callback){
            var newRegister = $.extend({}, register);
            var device = register.devices[device];
            var relevantFwmin;
            if(device === undefined || device.fwmin === undefined)
                relevantFwmin = 0;
            else
                relevantFwmin = device.fwmin;
            newRegister.relevantFwmin = relevantFwmin;
            callback(null, newRegister);
        },
        function(error, registers){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(registers);
            }
        }
    );

    return deferred.promise;
}


/**
 * Create a closure around device type information for fwminSelector.
 *
 * Create a closure around device type information to call fwminSelector for
 * that device type.
 *
 * @param {String} device The device type to create the closure with.
 * @return {function} Closure around fwminSelector for the given device type.
 *      See fwminSelector.
**/
function createFwminSelector(device)
{
    return function(registers){
        return fwminSelector(registers, device);
    };
}


/**
 * jQuery event listener to show / hide documentation for a register entry.
 *
 * @param {Event} event Standard jQuery event information.
**/
function toggleRegisterInfo(event)
{
    var toggleButtonID = event.target.id;
    var jqueryToggleButtonID = '#' + toggleButtonID;
    var address = toggleButtonID.replace('-toggle-button', '');
    var expand = event.target.className.indexOf('expand') != -1;

    var descriptionSelector = DESCRIPTION_DISPLAY_SELECTOR_TEMPLATE(
        {address: address});

    if(expand)
    {
        $(descriptionSelector).fadeIn();
        $(jqueryToggleButtonID).addClass('collapse').removeClass('expand');
        $(jqueryToggleButtonID).addClass('icon-minus').removeClass(
            'icon-plus');
    }
    else
    {
        $(descriptionSelector).fadeOut();
        $(jqueryToggleButtonID).addClass('expand').removeClass('collapse');
        $(jqueryToggleButtonID).addClass('icon-plus').removeClass(
            'icon-minus');
    }
}


/**
 * Convert an Array of two Arrays to an Object.
 *
 * Convert an Array of Arrays with two elements to a dict such that each
 * Array's first element acts as a key to the second.
 *
 * @param {Array} data An Array of two Arrays to zip together into a dict.
 * @return {Object} Object created by combining the two arrays.
 * @throws Error thrown if one of data's Arrays does not contain exactly two
 *      elements.
**/
function zip(data)
{

    var retVal = {};

    var dataLen = data.length;
    for(var i=0; i<dataLen; i++)
    {
        if(data[i].length != 2)
        {
            throw new Error(
                'The collection to be zipped must have two elements.'
            );
        }
        retVal[data[i][0]] = data[i][1];
    }

    return retVal;
}


/**
 * Index a collection of registers by their addresses.
 *
 * Create an Object with address numbers for attributes and Objects describing
 * the corresponding register as values.
 *
 * @param {Array} registers An Array of Object with register information.
 * @return {Object} An Object acting as an index or mapping between address and
 *      register info Object.
**/
function organizeRegistersByAddress(registers)
{
    var pairs = registers.map(function(e){
        return [e.address, e];
    });

    return zip(pairs);
}


/**
 * Get a list of unique tags represented across all of the provided registers.
 *
 * @param {Array} entries Array of Object with register information.
 * @return {Array} An Array of String, each element a unique tag found in the
 *      provided corpus of registers. This represents the set of all unique tags
 *      across all of the provided entries.
**/
function getTagSet(entries)
{
    var tagsHierarchical = entries.map(function(e) {return e.tags;});
    var tags = [];

    var tagsHierarchicalLen = tagsHierarchical.length;
    for(var i=0; i<tagsHierarchicalLen; i++)
    {
        tags.push.apply(tags, tagsHierarchical[i]);
    }

    var tagSet = new simplesets.Set(tags);
    return tagSet.array();
}


/**
 * Force a redraw on the rendering engine.
**/
function runRedraw()
{
    document.body.style.display='none';
    document.body.offsetHeight; // no need to store this anywhere, the reference is enough
    document.body.style.display='block';
}


// TODO: LJMMM allows for 'all' to be a valid register name.
/**
 * Render a table with information about registers.
 *
 * Render the UI widgets to view / manipulate information about device
 * registers.
 *
 * @param {Array} entries An Array of Object with information about registers.
 * @param {Array} tags An Array of String, each String being unique in the Array
 *      and the name of a tag in the corpus of provided registers. All tags
 *      across all of the registers available in the selected device should be
 *      included.
 * @param {String} currentTag The tag that the user is currently filtereing
 *      on. Can be 'all' if no registers should be filtered out by tags.
 * @param {String} currentSearchTerm The term the user is searching for.
 * @return {q.defer.promise} A Q promise that resolves to null.
**/
function renderRegistersTable(entries, tags, filteredEntries, currentTag,
    currentSearchTerm)
{
    var deferred = q.defer();

    var location = fs_facade.getExternalURI(REGISTERS_TABLE_TEMPLATE_SRC);
    var entriesByAddress = organizeRegistersByAddress(entries);

    if(tags === undefined)
        tags = getTagSet(entries);
    if(currentTag === undefined)
        currentTag = 'all';
    if(currentSearchTerm === undefined)
        currentSearchTerm = '';
    if(filteredEntries === undefined)
        filteredEntries = entries;

    var templateVals = {
        'registers': filteredEntries,
        'hasRegisters': filteredEntries.length > 0,
        'tags': tags,
        'currentTag': currentTag,
        'currentSearchTerm': currentSearchTerm
    };

    fs_facade.renderTemplate(
        location,
        templateVals,
        showError,
        function(renderedHTML)
        {
            $(REGISTER_MATRIX_SELECTOR).html(renderedHTML);

            $('.toggle-info-button').click(toggleRegisterInfo);

            $('.add-to-list-button').click(function(event){
                addToWatchList(event, entriesByAddress);
            });

            $('.tag-selection-link').click(function(event){
                var tag = event.target.id.replace('-tag-selector', '');
                searchRegisters(entries, tags, tag, currentSearchTerm);
            });

            $('#search-button').click(function(event){
                var term = $('#search-box').val();
                searchRegisters(entries, tags, currentTag, term);
            });

            $('#search-box').keypress(function (e) {
                if (e.which != 13)
                    return;

                var term = $('#search-box').val();
                searchRegisters(entries, tags, currentTag, term);
            });

            // Redraw bug
            runRedraw();

            deferred.resolve();
        }
    );

    return deferred.promise;
}


// TODO: By LJMMM, 'all' is a valid tag.
/**
 * Filter / search registers by tag and search term.
 *
 * Filter / search registers by tag and search term, rendering a registers table
 * with the listing after filtering.
 *
 * @param {Array} entires An Array of Object with information about the corpus
 *      of registers to search through.
 * @param {Array} allTags An Array of String with the names of all tags in the
 *      provided corpus of registers.
 * @param {String} tag The tag to filter by. Can be 'all' to avoid filtering.
 * @param {String} searchTerm The term to search the description, name, and
 *      tags for. If the term cannot be found, the register will be filered out.
**/
function searchRegisters(entries, allTags, tag, searchTerm)
{
    var filteredEntries = entries;

    if(tag !== 'all')
    {
        filteredEntries = filteredEntries.filter(function(e){
            return e.tags.indexOf(tag) != -1;
        });
    }

    var termLow = searchTerm.toLowerCase();

    var matchesTerm = function (testTerm) {
        var matches = testTerm !== undefined;
        matches = matches && testTerm.toLowerCase().indexOf(termLow) != -1;
        return matches;
    };

    if(termLow !== '')
    {
        filteredEntries = filteredEntries.filter(function(e){
            var matchesName = matchesTerm(e.name);
            var matchesTag = matchesTerm(e.flatTagStr);
            var matchesDesc = matchesTerm(e.description);

            return matchesName || matchesTag || matchesDesc;
        });
    }

    renderRegistersTable(entries, allTags, filteredEntries, tag, searchTerm);
}


/**
 * Turn a hierarchical Array of register information into a linear one.
 *
 * Convert an Array with Array elements containing Objects with register
 * information to an Array of the same Objects.
 *
 * @param {Array} entries The Array of Arrays to convert.
 * @return {q.defer.promise} A Q promise that resolves to the "flattened" or
 *      converted Array of Object.
**/
function flattenEntries(entries)
{
    var deferred = q.defer();
    var retList = [];

    async.each(
        entries,
        function(itemSet, callback){
            var itemSetLen = itemSet.length;
            for(var i=0; i<itemSetLen; i++)
                retList.push(itemSet[i]);
            callback();
        },
        function(error){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(retList);
            }
        }
    );

    return deferred.promise;
}

/**
 * Convert the tags attribute of Objects with register info to a String.
 *
 * Convert the tags attribute of Objects with register info from an Array of
 * String tags to a String containing the same list of tags joined by a comma.
 * The list will be saved as a new attribute called flatTagStr on the same
 * objects.
 *
 * @param {Array} registers An Array of Objects with register information to
 *      create flattened tag strings for.
 * @return {q.defer.promise} A Q promise that resolves to the new Array of
 *      Object with flattened tag strings.
**/
function flattenTags(registers)
{
    var deferred = q.defer();

    async.map(
        registers,
        function(register, callback){
            var newRegister = $.extend({}, register);
            if(typeof(register.tags) !== 'undefined') {
                newRegister.flatTagStr = register.tags.join(',');
            } else {
                newRegister.flatTagStr = '';
            }
            callback(null, newRegister);
        },
        function(error, registers){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(registers);
            }
        }
    );

    return deferred.promise;
}


/**
 * Add information to register info Objects about register access restrictions.
 *
 * Parse the readwrite field of register information Objects, adding the Boolean
 * fields of readAccess and writeAccess indicating if the register can be read
 * and written to respectively.
 *
 * @param {Array} registers An Array of Object with register inforamtion to
 *      decorate.
 * @return {q.promise} A promise that resovles to the decorated / updated
 *      register information objects.
**/
function addRWInfo(registers)
{
    var deferred = q.defer();

    async.map(
        registers,
        function(register, callback){
            var newRegister = $.extend({}, register);
            newRegister.readAccess = newRegister.readwrite.indexOf('R') != -1;
            newRegister.writeAccess = newRegister.readwrite.indexOf('W') != -1;
            var writeOnly = newRegister.writeAccess && !newRegister.readAccess;
            newRegister.writeOnly = writeOnly;
            newRegister.useAsWrite = writeOnly;
            newRegister.type = newRegister.type;
            callback(null, newRegister);
        },
        function(error, registers){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(registers);
            }
        }
    );

    return deferred.promise;
}


/**
 * Refresh / re-render the list of registers being watchted by this module.
**/
function refreshWatchList()
{
    var location = fs_facade.getExternalURI(REGISTER_WATCH_LIST_TEMPLATE_SRC);
    registerWatchList.sort(function(a, b){
        return a.address - b.address;
    });

    if(registerWatchList.length > 0)
    {
        $('#watch-config-tooltip').hide();
        fs_facade.renderTemplate(
            location,
            {'registers': registerWatchList},
            genericErrorHandler,
            function(renderedHTML)
            {
                $(REGISTER_WATCHLIST_SELECTOR).html(renderedHTML);
                $(REGISTER_WATCHLIST_SELECTOR).show(runRedraw);

                var showRegiserEditControls = function(event){
                    var address = event.target.id.replace('edit-reg-', '');
                    var rowSelector = WATCH_ROW_SELECTOR_TEMPLATE({
                        'address': address
                    });

                    var numAddress = Number(address);
                    var targetRegister = registerWatchList.filter(function (e) {
                        return e.address == numAddress;
                    })[0];
                    targetRegister.useAsWrite = true;

                    $(rowSelector).find('.value-display').fadeOut('fast',
                        function () {
                            runRedraw();
                            $(rowSelector).find('.value-edit-controls').fadeIn(
                                'fast',
                                runRedraw
                            );
                        }
                    );
                };

                var hideRegisterEditControls = function(event){
                    var address = event.target.id;
                    address = address.replace('close-edit-reg-', '');
                    address = address.replace('icon-', '');
                    var rowSelector = WATCH_ROW_SELECTOR_TEMPLATE({
                        'address': address
                    });

                    var numAddress = Number(address);
                    var targetRegister = registerWatchList.filter(function (e) {
                        return e.address == numAddress;
                    })[0];
                    targetRegister.useAsWrite = false;

                    $(rowSelector).find('.value-edit-controls').fadeOut('fast',
                        function () {
                            runRedraw();
                            $(rowSelector).find('.value-display').fadeIn('fast',
                                runRedraw
                            );
                        }
                    );
                };

                var writeRegister = function(event){
                    var address = event.target.id;
                    address = address.replace('write-reg-', '');
                    address = address.replace('icon-', '');
                    var isString = $('#' + address.toString() + '-type-display').html() === 'STRING';
                    var rowSelector = WATCH_ROW_SELECTOR_TEMPLATE({
                        'address': address
                    });

                    var inputSelector = WRITE_INPUT_SELECTOR_TEMPLATE({
                        'address': address
                    });
                    var value = $(inputSelector).val();

                    var addressNum = Number(address);
                    var convValue;
                    if (isString) {
                        convValue = value;
                    } else {
                        convValue = Number(value);
                    }

                    $(rowSelector).find('.write-confirm-msg').slideDown(
                        function () {
                            selectedDevice.writeAsync(addressNum, convValue)
                            .then(
                                function () {
                                    $(rowSelector).find(
                                        '.write-confirm-msg'
                                    ).slideUp();
                                },
                                function (err) {
                                    showError(err);
                                }
                            );
                        }
                    );
                };

                $('.remove-from-list-button').click(removeFromWatchList);

                $('.edit-register-button').click(showRegiserEditControls);

                $('.close-value-editor-button').click(hideRegisterEditControls);

                $('.write-value-editor-button').click(writeRegister);
            }
        );
    }
    else
    {
        $(REGISTER_WATCHLIST_SELECTOR).hide();
        $('#watch-config-tooltip').fadeIn();
    }
}


/**
 * Event listener to add a new register to the watch list for this module.
 *
 * Event listener that will add a new register entry to the watch list for this
 * module, refresing the watch list in the process.
 *
 * @param {Event} event jQuery event information.
 * @param {Object} registerInfoByAddress Object acting as an address indexed
 *      access layer for register information. Attributes should be addresses
 *      of registers and values should be Objects with information about the
 *      corresponding register.
**/
function addToWatchList(event, registerInfoByAddress)
{
    var buttonID = event.target.id;
    var address = Number(buttonID.replace('-add-to-list-button', ''));
    var descriptor = ADD_TO_LIST_DESCRIPTOR_TEMPLATE({address: address});
    $(descriptor).hide();

    var targetRegister = registerInfoByAddress[address];
    registerWatchList.push(targetRegister);
    refreshWatchList();
    runRedraw();
}


/**
 * Event listener to remove a register from the watch list for this module.
 *
 * @param {Event} event jQuery event information.
**/
function removeFromWatchList(event)
{
    var buttonID = event.target.id;
    var address = buttonID.replace('-remove-from-list-button', '');

    var registersToRemove = registerWatchList.filter(
        function(e){ return e.address == address; }
    );
    registerWatchList = registerWatchList.filter(
        function(e){ return e.address != address; }
    );
    refreshWatchList();

    var registersToRemoveLen = registersToRemove.length;
    for(var i=0; i<registersToRemoveLen; i++)
    {
        var registerToRemove = registersToRemove[i];
        var descriptor = ADD_TO_LIST_DESCRIPTOR_TEMPLATE(
            {address: registerToRemove.address}
        );
        $(descriptor).show();
    }

    runRedraw();
}


function createUpdateReadNumberRegistersCallback (readAddresses)
{
    return function (results) {
        var deferred = q.defer();
        var numResults = results.length;
        for (var i=0; i<numResults; i++) {
            var register = readAddresses[i];
            var value = results[i];
            var displaySelector = '#' + String(register) + '-cur-val-display';
            $(displaySelector).html(value.toFixed(6));
        }
        deferred.resolve();
        return deferred.promise;
    };
}


function updateStringRegisterCallback (register, value)
{
    var displaySelector = '#' + String(register) + '-cur-val-display';
    $(displaySelector).html(value);
}


function splitByRetType (registers)
{
    var numberRegisters = [];
    var stringRegisters = [];

    registers.forEach(function (register) {
        if (register.type === 'STRING') {
            stringRegisters.push(register);
        } else {
            numberRegisters.push(register);
        }
    });

    return {numRegs: numberRegisters, strRegs: stringRegisters};
}


function updateReadRegisters ()
{
    var onError = function (err) {
        if (err) {
            showError(err);
        }
        setTimeout(updateReadRegisters, REFRESH_DELAY);
    };

    if (curTabID !== getActiveTabID()) {
        return;
    }

    var readRegisters = registerWatchList.filter(function (e) {
        return !e.useAsWrite;
    });

    var splitResult = splitByRetType(readRegisters);
    var numberReadRegisters = splitResult.numRegs;
    var stringReadRegisters = splitResult.strRegs;

    var numberReadAddresses = numberReadRegisters.map(function (e) {
        return e.address;
    });
    var stringReadAddresses = stringReadRegisters.map(function (e) {
        return e.address;
    });

    var promise;
    if (numberReadAddresses.length > 0) {
        promise = selectedDevice.readMany(numberReadAddresses);
        promise.then(
            createUpdateReadNumberRegistersCallback(numberReadAddresses),
            onError
        );
    } else {
        var immediateDeferred = q.defer();
        promise = immediateDeferred.promise;
        immediateDeferred.resolve();
    }

    stringReadAddresses.forEach(function (address) {
        promise.then(function () {
            var innerDeferred = q.defer();
            selectedDevice.readAsync(
                address,
                onError,
                function (val) {
                    updateStringRegisterCallback(address, val);
                    innerDeferred.resolve();
                }
            );
            return innerDeferred.promise;
        }, onError);
    });

    promise.then(
        function () { setTimeout(updateReadRegisters, REFRESH_DELAY); },
        onError
    );
}


function setSelectedDevice (serial)
{
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();
    var numDevices = devices.length;

    for (var i=0; i<numDevices; i++) {
        if (devices[i].getSerial() === serial)
            selectedDevice = devices[i];
    }
}


// TODO: Need to select device filter based on selected device
$('#register-matrix-holder').ready(function(){
    var filterByDevice = createDeviceFilter('T7');
    var selectFwmin = createFwminSelector('T7');

    $('.device-selection-radio').first().prop('checked', true);
    $('.device-selection-radio').change(function(){
        $('#device-selector').hide();
        $('#device-selector').fadeIn();
        var serialNum = $('input[name=deviceSelectionRadios]:checked').val();
        setSelectedDevice(serialNum);
    });

    getRegisterInfo()
    .then(filterByDevice)
    .then(selectFwmin)
    .then(flattenTags)
    .then(addRWInfo)
    .then(expandLJMMMEntries)
    // .then(appendEntriesToSearchbox)
    .then(flattenEntries)
    .then(renderRegistersTable)
    .done(function () {
        var keeper = device_controller.getDeviceKeeper();
        selectedDevice = keeper.getDevices()[0];
        setTimeout(updateReadRegisters, REFRESH_DELAY);
    });
});

}
var ACTIVE_KIPLING_MODULE = new ACTIVE_KIPLING_MODULE();
