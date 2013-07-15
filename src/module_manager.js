var fs_facade = require('./fs_facade');


exports.getActiveModules = function(onError, onSuccess)
{
    fs_facade.getLoadedModulesInfo(onError, function(modules)
    {
        var activeModules = modules.filter(function(e) {return e.active;});
        onSuccess(activeModules);
    });
};
