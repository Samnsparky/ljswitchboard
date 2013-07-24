/**
 * Logic for the register matrix LabJack Switchboard module.
 *
 * Logic for a matrix with information about registers that also allows users
 * to read and write the current value of those registers via raw values.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var async = require('async');
var handlebars = require('handlebars');
var simplesets = require('simplesets');
var sprintf = require('sprintf-js');
var lazy = require('lazy');
var q = require('q');

var REGISTERS_DATA_SRC = 'register_matrix/ljm_constants.json';
var REGISTERS_TABLE_TEMPLATE_SRC = 'register_matrix/matrix.html';
var REGISTER_WATCH_LIST_TEMPLATE_SRC = 'register_matrix/watchlist.html';

var REGISTER_MATRIX_SELECTOR = '#register-matrix';
var REGISTER_WATCHLIST_SELECTOR = '#register-watchlist'

var DESCRIPTION_DISPLAY_TEMPLATE_SELECTOR_STR =
    '#{{address}}-description-display';
var ADD_TO_LIST_DESCRIPTOR_TEMPLATE_STR = '#{{address}}-add-to-list-button';

var DESCRIPTION_DISPLAY_SELECTOR_TEMPLATE = handlebars.compile(
    DESCRIPTION_DISPLAY_TEMPLATE_SELECTOR_STR);
var ADD_TO_LIST_DESCRIPTOR_TEMPLATE = handlebars.compile(
    ADD_TO_LIST_DESCRIPTOR_TEMPLATE_STR);

var DATA_TYPE_SIZES = {
    UINT64: 4,
    INT32: 2,
    STRING: 2,
    UINT16: 1,
    UINT32: 2,
    FLOAT32: 2
};

var registerWatchList = [];


// TODO: This is implementing a subset of LJMMM
/**
 * Enumerates / interprets an LJMMM field.
 *
 * @param {String} name The field to interpret as an LJMMM string.
 * @param {function} onSuccess The function to call after the LJMMM field has
 *      been interpreted. The callback should take a single argument which
 *      will be an Array of String or, in other words, the expansion / result of
 *      the interpretation of the LJMMM field.
**/
function expandLJMMMName(name, onSuccess)
{
    var ljmmmRegex = /^(.*)\#\((\d+)\:(\d+)\:?(\d+)?\)(.*)$/;
    var values = name.match(ljmmmRegex);

    if(values === null)
    {
        onSuccess([name]);
        return;
    }

    var before = values[1];
    var startNum = Number(values[2]);
    var endNum = Number(values[3]);
    var after = values[5];

    var registerRange = lazy.range(sprintf.sprintf('%d..%d',startNum,endNum+1));
    registerRange.join(function(regNums){
        var fullyQualifiedNames = regNums.map(function(regNum){
            return sprintf.sprintf('%s%d%s', before, regNum, after);
        });
        onSuccess(fullyQualifiedNames);
    });
}


/**
 * Get the size of the data of a given type in registers.
 *
 * Determine the size of the data of a given data type as indicated by a type
 * name. The size will be reported in MODBUS registers, each of which is two
 * bytes. Unknown data types are returned as -1 registers.
 *
 * @param {String} typeName The name of the type to get the data type size for.
 * @return {Number} The number of registers that values of the given data type 
 *      take up. -1 is returned if the type could not be found.
**/
function getTypeRegSize(typeName)
{
    if(DATA_TYPE_SIZES[typeName] === undefined)
        return -1;
    return DATA_TYPE_SIZES[typeName];
}


/**
 * Interpret an entry's name field as LJMMM, enumerating as appropriate.
 *
 * @param {Object} entry An Object containing information about a register or
 *      set of registers.
 * @param {function} onSuccess The function to call after enumerating.
 * @return {Array} An Array of Object that results from interpreting the name
 *      of the provided entry as an LJMMM field, enumerating and creating the
 *      appropriate entries when interpreting that field.
**/
function expandLJMMMEntry(entry, onSuccess)
{
    var expandedEntries = expandLJMMMName(entry.name, function(names){

        var expandedEntries = [];

        var address = entry.address;
        var regTypeSize = getTypeRegSize(entry.type);

        for(i in names)
        {
            var name = names[i];
            var newEntry = $.extend({}, entry);
            newEntry.name = name;
            newEntry.address = address;
            address += regTypeSize;
            expandedEntries.push(newEntry);
        }

        onSuccess(expandedEntries);

    });
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
            expandLJMMMEntry(entry, function(newEntries){
                callback(null, newEntries);
            });
        },
        function(error, newEntries){
            deferred.resolve(newEntries);
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

    var registerInfoSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
    fs_facade.getJSON(registerInfoSrc, genericErrorHandler, function(info){
        deferred.resolve(info['registers']);        
    });

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
            var names = register.devices.map(function(e){
                if(e.name === undefined)
                    return e;
                else
                    return e.name
            });
            callback(names.indexOf(deviceName) != -1);
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
    }
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
            if(error !== null)
                genericErrorHandler(error);
            deferred.resolve(registers);
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
    }
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


function zip(data)
{
    var retVal = {};

    for(var i in data)
    {
        retVal[data[i][0]] = data[i][1];
    }

    return retVal;
}


function organizeRegistersByAddress(registers)
{
    var pairs = registers.map(function(e){
        return [e.address, e];
    });

    return zip(pairs);
}


function getTagSet(entries)
{
    var tagsHierarchical = entries.map(function(e) {return e.tags;});
    var tags = [];

    for(var i in tagsHierarchical)
    {
        tags.push.apply(tags, tagsHierarchical[i]);
    }

    var tagSet = new simplesets.Set(tags);
    return tagSet.array();
}


/**
 * Render a table with information about registers.
 *
 * Render the UI widgets to view / manipulate information about device
 * registers.
 *
 * @param {Array} entries An Array of Object with information about registers.
 * @return {q.defer.promise} A Q promise that resolves to null.
**/
function renderRegistersTable(entries, tags, filteredEntries, currentTag,
    currentSearchTerm)
{
    var deferred = q.defer();

    var location = fs_facade.getExternalURI(REGISTERS_TABLE_TEMPLATE_SRC);
    var entriesByAddress = organizeRegistersByAddress(entries);

    if(tags == undefined)
        tags = getTagSet(entries);
    if(currentTag === undefined)
        currentTag = 'all';
    if(currentSearchTerm === undefined)
        currentSearchTerm = '';
    if(filteredEntries === undefined)
        filteredEntries = entries;

    var templateVals = {
        'registers': filteredEntries,
        'tags': tags,
        'currentTag': currentTag,
        'currentSearchTerm': currentSearchTerm
    };

    fs_facade.renderTemplate(
        location,
        templateVals,
        genericErrorHandler,
        function(renderedHTML)
        {
            $(REGISTER_MATRIX_SELECTOR).html(renderedHTML);
            $(REGISTER_MATRIX_SELECTOR).show();

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

            deferred.resolve();
        }
    );

    return deferred.promise;
}


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
    if(termLow !== '')
    {
        filteredEntries = filteredEntries.filter(function(e){
            var inName = e.name.toLowerCase().indexOf(termLow) != -1;
            var inTag = e.flatTagStr.toLowerCase().indexOf(termLow) != -1;
            var inDesc = e.description.toLowerCase().indexOf(termLow) != -1;

            return inName || inTag || inDesc;
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
            for(i in itemSet)
                retList.push(itemSet[i]);
            callback();
        },
        function(error){
            deferred.resolve(retList);
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
            newRegister.flatTagStr = register.tags.join(',');
            callback(null, newRegister);
        },
        function(error, registers){
            if(error !== null)
                genericErrorHandler(error);
            deferred.resolve(registers);
        }
    );

    return deferred.promise;
}


function refreshWatchList()
{
    var location = fs_facade.getExternalURI(REGISTER_WATCH_LIST_TEMPLATE_SRC);
    if(registerWatchList.length > 0)
    {
        fs_facade.renderTemplate(
            location,
            {'registers': registerWatchList},
            genericErrorHandler,
            function(renderedHTML)
            {
                $(REGISTER_WATCHLIST_SELECTOR).html(renderedHTML);
                $(REGISTER_WATCHLIST_SELECTOR).show();

                $('.remove-from-list-button').click(removeFromWatchList);
            }
        );
    }
    else
    {
        $(REGISTER_WATCHLIST_SELECTOR).hide();
    }
}


function addToWatchList(event, registerInfoByAddress)
{
    var buttonID = event.target.id;
    var address = Number(buttonID.replace('-add-to-list-button', ''));
    var descriptor = ADD_TO_LIST_DESCRIPTOR_TEMPLATE({address: address});
    $(descriptor).hide();

    var targetRegister = registerInfoByAddress[address];
    registerWatchList.push(targetRegister);
    refreshWatchList();
}


function removeFromWatchList(event)
{
    var buttonID = event.target.id;
    var address = buttonID.replace('-remove-from-list-button', '');

    console.log(registerWatchList);

    var registersToRemove = registerWatchList.filter(
        function(e){ return e.address == address; }
    );
    registerWatchList = registerWatchList.filter(
        function(e){ return e.address != address; }
    );
    refreshWatchList();

    for(var i in registersToRemove)
    {
        var registerToRemove = registersToRemove[i];
        var descriptor = ADD_TO_LIST_DESCRIPTOR_TEMPLATE(
            {address: registerToRemove.address}
        );
        $(descriptor).show();
    }
}


$('#register-matrix-holder').ready(function(){
    var filterByDevice = createDeviceFilter('T7');
    var selectFwmin = createFwminSelector('T7');

    getRegisterInfo()
    .then(filterByDevice)
    .then(selectFwmin)
    .then(flattenTags)
    .then(expandLJMMMEntries)
    .then(flattenEntries)
    .then(renderRegistersTable)
    .done();
});
