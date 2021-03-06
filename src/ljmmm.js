var extend = require('node.extend');
var lazy = require('lazy');
var sprintf = require('sprintf-js');

var DATA_TYPE_SIZES = {
    UINT64: 4,
    INT32: 2,
    STRING: 2,
    UINT16: 1,
    UINT32: 2,
    FLOAT32: 2
};


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
// exports.expandLJMMMName = function(name, onSuccess)
exports.expandLJMMMName = function(name, onSuccess)
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
};


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
// exports.expandLJMMMEntry = function(entry, onSuccess)
exports.expandLJMMMEntry = function(entry, onSuccess)
{
    var expandedEntries = exports.expandLJMMMName(entry.name, function(names){

        var expandedEntries = [];

        var address = entry.address;
        var regTypeSize = getTypeRegSize(entry.type);

        for (var i in names)
        {
            var name = names[i];
            var newEntry = extend({}, entry);
            newEntry.name = name;
            newEntry.address = address;
            address += regTypeSize;
            expandedEntries.push(newEntry);
        }

        onSuccess(expandedEntries);

    });
};
