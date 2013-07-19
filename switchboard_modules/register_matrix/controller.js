var async = require('async');
var sprintf = require('sprintf-js');
var lazy = require('lazy');
var q = require('q');

var REGISTERS_DATA_SRC = 'register_matrix/ljm_constants.json';
var REGISTERS_TABLE_TEMPLATE_SRC = 'register_matrix/matrix.html';

var REGISTER_MATRIX_SELECTOR = '#register-matrix';


// TODO: This is implementing a subset of LJMMM
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


function expandLJMMMEntry(entry, onSuccess)
{
    var expandedEntries = expandLJMMMName(entry.name, function(names){

        var expandedEntries = names.map(
            function(name){
                var newEntry = $.extend({}, entry);
                newEntry.name = name;
                return newEntry
            }
        );

        onSuccess(expandedEntries);

    });
}


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


function getRegisterInfo()
{
    var deferred = q.defer();

    var registerInfoSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
    fs_facade.getJSON(registerInfoSrc, genericErrorHandler, function(info){
        deferred.resolve(info['registers']);        
    });

    return deferred.promise;
}


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


function createDeviceFilter(device)
{
    return function(registers){
        return filterDeviceRegisters(registers, device);
    }
}


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


function createFwminSelector(device)
{
    return function(registers){
        return fwminSelector(registers, device);
    }
}


function renderRegistersTable(entries)
{
    var deferred = q.defer();

    var location = fs_facade.getExternalURI(REGISTERS_TABLE_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': entries},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(REGISTER_MATRIX_SELECTOR).hide();
            $(REGISTER_MATRIX_SELECTOR).html(renderedHTML);
            $(REGISTER_MATRIX_SELECTOR).fadeIn();

            deferred.resolve();
        }
    );

    return deferred.promise;
}


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


$('#register-matrix-holder').ready(function(){
    var filterByDevice = createDeviceFilter('T7');
    var selectFwmin = createFwminSelector('T7');

    getRegisterInfo()
    .then(filterByDevice)
    .then(selectFwmin)
    .then(expandLJMMMEntries)
    .then(flattenEntries)
    .then(renderRegistersTable)
    .done();
});
