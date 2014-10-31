/**
 * Convienece wrapper around file system and path manipulation operations.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

/*jslint node: true */

var fs = require('fs');
var path = require('path');
var dict = require('dict');

var handlebars = require('handlebars');
var os = require('os');

var MODULES_DIR = 'switchboard_modules';
var MODULE_DESC_FILENAME = 'module.json';
var MODULE_CONST_FILENAME = 'moduleConstants.json';
var MODULES_DESC_FILENAME = 'modules.json';

var INTERNAL_TEMPLATES_DIR = 'templates';
var INTERNAL_STATIC_DIR = 'static';
var INTERNAL_JS_DIR = path.join(INTERNAL_STATIC_DIR, 'js');
var INTERNAL_CSS_DIR = path.join(INTERNAL_STATIC_DIR, 'css');

var EXTERNAL_RESOURCES_DIR = 'switchboard_modules';

var NODE_WEBKIT_INSTANCE = true;
exports.setIsNodeWebkitInstance = function(state) {
    NODE_WEBKIT_INSTANCE = state;
};

var FS_FACADE_TEMPLATE_CACHE = dict();
exports.numCachedTemplates = function() {
    return FS_FACADE_TEMPLATE_CACHE.size;
};

var fileSaveAsID = "#file-save-dialog-hidden";
var getFileLoadID = "#file-dialog-hidden";

var defaultFilePath = {
    'linux': '/home/path',
    'linux2': '/home/path',
    'sunos': '/home/path',
    'solaris': '/home/path',
    'freebsd': '/home/path',
    'openbsd': '/home/path',
    'darwin': process.env.HOME,
    'mac': process.env.HOME,
    'win32': 'C:\\Windows',
    'win64': 'C:\\Windows'
}[process.platform];
exports.testFunction = function() {
    return "testing...";
};
exports.getFileSaveAsID = function() {
    return fileSaveAsID;
};
exports.getFileLoadID = function() {
    return getFileLoadID;
};
exports.getDefaultFilePath = function() {
    return defaultFilePath;
};

var FS_FACADE_LoadErrors = [];

var addLoadError = function(data) {
    FS_FACADE_LoadErrors.push(data);
};
var safeJSONParse = function(filePath, contents) {
    var constants = {};
    try {
        constants = JSON.parse(contents);
    } catch (err) {
        var pathArray = [];
        var fileName = "";
        if (filePath.split('/').length > 1) {
            pathArray = filePath.split('/');
            fileName = pathArray[pathArray.length-1];
        } else {
            pathArray = filePath.split('\\');
            fileName = pathArray[pathArray.length-1];
        }
        var text = "Error parising JSON file: <strong>" + fileName + "</strong><br>";
        text +=  "Full File Path: " + filePath + "<br>";
        text +=  "Error: " + err.toString() + "<br>";
        text +=  "Consider using <strong>http://pro.jsonlint.com/</strong> or <br>";
        text +=  "Consider using <strong>http://jsonlint.com/</strong> for assistance <br>";
        console.log('Error Parsing JSON file: ',filePath);
        addLoadError(text);
    }
    return constants;
};
exports.safeJSONParser = function(filePath, contents) {
    return safeJSONParse(filePath, contents);
};

exports.getLoadErrors = function() {
    return FS_FACADE_LoadErrors;
};


handlebars.registerHelper('eachDict', function(context, options) {
    var ret = "";
    var data = {};
    context.forEach(function(value,name){
        if(value) {
            data.key = name;
            data.info = value;
        }
        ret = ret + options.fn(value, {data: data});
    });
    return ret;
});

/**
 * Get the full location (URI) for a resource bundled with the application.
 *
 * Get the the full URI or location for a resource that comes bundled with the
 * application executable. This cannot be used for late loaded modules.
 *
 * @param {String} resourceName The name of the resource to resolve the full URI
 *      for.
 * @return {String} The fully resolved URI or null if it could not be resolved.
**/
exports.getInternalURI = function(resourceName) {
    var extension = path.extname(resourceName);

    if (extension === '.html') {
        return path.join(__dirname, INTERNAL_TEMPLATES_DIR, resourceName);
    } else if (extension === '.js') {
        return path.join(__dirname, INTERNAL_JS_DIR, resourceName);
    } else if (extension === '.css') {
        return path.join(__dirname, INTERNAL_CSS_DIR, resourceName);
    } else {
        return null;
    }
};


/**
 * Get the full location (URI) for a resource not bundled with the application.
 *
 * Get the full URI or location for a resource that is not bundled with the
 * application executable. This should be used for late loaded modules.
 *
 * @param {String} fullResourceName The name of the resource to resolve.
 * @return {String} The fully resolved URI or null if it could not be resolved.
**/
exports.getExternalURI = function(fullResourceName) {
    var resourceNamePieces = fullResourceName.split('/');
    var moduleName = "";
    var resourceName = resourceNamePieces[(resourceNamePieces.length - 1)];
    var i = 0;
    for (i = 0; i < (resourceNamePieces.length - 1); i++) {
        moduleName = path.join(moduleName, resourceNamePieces[i]);
    }
    var parentDir = exports.getParentDir();
    var fullPath = path.join(parentDir, EXTERNAL_RESOURCES_DIR, moduleName,
        resourceName);
    return fullPath;
};


/**
 * Get the directory that the executable is being run out of.
 *
 * @return {string} The full path to the directory that this executable is being
 *      run out of.
**/
exports.getParentDir = function() {
    // Code that allows fs_facade to work outside of node_webkit instance
    var isWebkitInstance = true;
    try {
        if(NODE_WEBKIT_INSTANCE) {
            isWebkitInstance = true;
        } else {
            isWebkitInstance = false;
        }
    } catch(err) {
        isWebkitInstance = true;
    }

    // TODO: I'm not quite sure to search for at the moment/how to determine 
    // whether the instance is in K3 or a cmd line running node so I will just 
    // do this:
    if(process.execPath.search('/usr/local/Cellar/node') >= 0) {
        isWebkitInstance = false;
    }
    
    if(isWebkitInstance) {
        var pathPieces = path.dirname(process.execPath).split(path.sep);
        
        var cutIndex;
        var numPieces = pathPieces.length;
        for (cutIndex=0; cutIndex<numPieces; cutIndex++) {
            if (pathPieces[cutIndex].indexOf('.app') != -1) {
                break;
            }
        }
        return pathPieces.slice(0, cutIndex).join(path.sep);
    } else {
        var PATH_TXT = '/';
        if (process.platform === 'win32') {
            PATH_TXT = '\\';
        }
        var MODULES_DESC_FILENAME = 'modules.json';

        var currentDir = process.cwd();
        var switchboard_modules_dir = currentDir + PATH_TXT + '..';
        return switchboard_modules_dir;
    }
};


/**
 * Render a Handlebars template.
 *
 * @param {String} location The location of the template to render.
 * @param {Object} context The context to render the template with.
 * @param {function} onError The function to call if an error is encountered
 *      while rendering the template. Should take a single argument which
 *      would be the error.
 * @param {function} onSuccess The function to call after the template is
 *      successfully rendered. Should take a single argument which would
 *      be the String rendred html.
**/
exports.renderTemplate = function(location, context, onError, onSuccess) {
    if (FS_FACADE_TEMPLATE_CACHE.has(location)) {
        var curTemplate = FS_FACADE_TEMPLATE_CACHE.get(location);
        onSuccess(curTemplate(context));
    } else {
        fs.exists(location, function(exists) {
            if (exists) {
                fs.readFile(location, 'utf8',
                    function (error, template) {
                        if (error) {
                            onError(error);
                        } else {
                            var curTemplate = handlebars.compile(template);
                            FS_FACADE_TEMPLATE_CACHE.set(location,curTemplate);
                            onSuccess(curTemplate(context));
                        }
                    }
                );
            } else {
                onError(new Error('Template ' + location + ' could not be found.'));
            }
        });
    }
};





// TODO: Move to module manager
/**
 * Get information about a specific module.
 *
 * Get the standard information about a specific module that the user has
 * already downloaded. Does not query any remote repositories.
 *
 * @param {String} name The name of the module to query.
 * @param {function} onError The function to call if the module is not found
 *      or could not otherwise be quieried.
 * @param {function} onSuccess The function to call with the module information
 *      after it is loaded.
**/
exports.getModuleInfo = function(name, onError, onSuccess) {
    var moduleDir = path.join(exports.getParentDir(), MODULES_DIR);
    var modulesDescriptorSrc = path.join(moduleDir, name,
        MODULE_DESC_FILENAME);

    fs.exists(modulesDescriptorSrc, function(exists) {
        if (exists) {
            fs.readFile(modulesDescriptorSrc, 'utf8',
                function (error, contents) {
                    if (error) {
                        onError(error);
                    } else {
                        var filePath = modulesDescriptorSrc;
                        var moduleConstants = safeJSONParse(filePath, contents);

                        moduleConstants.activePath = modulesDescriptorSrc;
                        onSuccess(moduleConstants);
                    }
                }
            );
        } else {
            var error = new Error(
                'Could not find modules info at ' + modulesDescriptorSrc + '.'
            );
            onError(error);
        }
    });
};

exports.getModuleConstants = function(name, onError, onSuccess) {
    var moduleDir = path.join(exports.getParentDir(), MODULES_DIR);
    var modulesDescriptorSrc = path.join(moduleDir, name,
        MODULE_CONST_FILENAME);

    fs.exists(modulesDescriptorSrc, function(exists) {
        if (exists) {
            fs.readFile(modulesDescriptorSrc, 'utf8',
                function (error, contents) {
                    if (error) {
                        onError(error);
                    } else {
                        var filePath = modulesDescriptorSrc;
                        onSuccess(safeJSONParse(filePath, contents));
                    }
                }
            );
        } else {
            //return no-data
            var constants = {};
            onSuccess(constants);
        }
    });
};

exports.readModuleFile = function(filePath, onError, onSuccess) {
    var fullPath = exports.getExternalURI(filePath);
    fs.exists(fullPath, function(exists) {
        if (exists) {
            fs.readFile(fullPath, 'utf8',
                function (error, contents) {
                    if (error) {
                        onError(error);
                    } else {
                        onSuccess(contents);
                    }
                }
            );
        } else {
            var error = new Error(
                'Could not find modules info at ' + fullPath + '.'
            );
            onError(error);
        }
    });
};

// TODO: Move to module manager
/**
 * Get information about the modules the user has installed for Switchboard.
 *
 * @param {function} onError The function to call if an error is encountered
 *      while reading module information.
 * @param {function} onSuccess The function to call after the module information
 *      is loaded. Should take one argument: an Array of Object with module
 *      information.
**/
exports.getLoadedModulesInfo = function(onError, onSuccess) {
    var moduleDir = path.join(exports.getParentDir(), MODULES_DIR);
    var modulesDescriptorSrc = path.join(moduleDir, MODULES_DESC_FILENAME);

    fs.exists(modulesDescriptorSrc, function(exists) {
        if (exists) {
            fs.readFile(modulesDescriptorSrc, 'utf8',
                function (error, contents) {
                    if (error) {
                        onError(error);
                    } else {
                        var filePath = modulesDescriptorSrc;
                        onSuccess(safeJSONParse(filePath, contents));
                    }
                }
            );
        } else {
            var error = new Error(
                'Could not find modules info at ' + modulesDescriptorSrc + '.'
            );
            onError(error);
        }
    });
};

exports.saveDataToFile = function(location, data, onError, onSuccess) {
    fs.exists(location, function(exists) {
        fs.writeFile(
            location,
            data,
            function (err) {
                if (err) {
                    onError(err);
                } else {
                    onSuccess();
                }
            }
        );
    });
};

exports.loadFile = function(location, onError, onSuccess) {
    fs.exists(location, function(exists) {
        if (exists) {
            fs.readFile(location, 'utf8',
                function (error, contents) {
                    if (error) {
                        onError(error);
                    } else {
                        onSuccess(contents);
                    }
                }
            );
        } else {
            var error = new Error('Could not find File at ' + location + '.');
            onError(error);
        }
    });
};

/**
 * Convienence function to get and decode a JSON file.
 *
 * @param {String} location The full path of the JSON file to load.
 * @param {function} onError The function to call if an error is encountered
 *      while reading this JSON file.
 * @param {function} onSuccess The funciton to call after the JSON has been
 *      successfully loaded. The only function parameter should be for the Array
 *      or Object loaded.
**/
exports.getJSON = function(location, onError, onSuccess) {
    fs.exists(location, function(exists) {
        if (exists) {
            fs.readFile(location, 'utf8',
                function (error, contents) {
                    if (error) {
                        onError(error);
                    } else {
                        var filePath = location;
                        onSuccess(safeJSONParse(filePath, contents));
                    }
                }
            );
        } else {
            var error = new Error(
                'Could not find JSON at ' + location + '.'
            );
            onError(error);
        }
    });
};
