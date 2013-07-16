/**
 * Convienence functions for managing Switchboard modules.
 *
 * Convienence functions that allow for the management of late loaded modules
 * not bundled in the main executable.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var fs_facade = require('./fs_facade');


/**
 * Get the modules currently marked as active that the user has installed.
 *
 * Get all of the modules that the user has installed filtered for all that are
 * marked as being "active" and visible to the user.
 *
 * @param {function} onError The function to call if an error is encountered
 *      while reading and filtering module information.
 * @param {function} onSuccess The function to call after reading and filtering
 *      module information. Should take a single argument: an Array of Object
 *      with module information.
**/
exports.getActiveModules = function(onError, onSuccess)
{
    fs_facade.getLoadedModulesInfo(onError, function(modules)
    {
        var activeModules = modules.filter(function(e) {return e.active;});
        onSuccess(activeModules);
    });
};
