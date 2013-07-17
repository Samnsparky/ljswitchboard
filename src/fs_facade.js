/**
 * Convienece wrapper around file system and path manipulation operations.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

/*jslint node: true */

var fs = require('fs');
var path = require('path');

var handlebars = require('handlebars');

var MODULES_DIR = 'switchboard_modules';
var MODULES_DESC_FILENAME = 'modules.json';

var INTERNAL_TEMPLATES_DIR = 'templates';
var INTERNAL_STATIC_DIR = 'static';
var INTERNAL_JS_DIR = path.join(INTERNAL_STATIC_DIR, 'js');
var INTERNAL_CSS_DIR = path.join(INTERNAL_STATIC_DIR, 'css');

var EXTERNAL_RESOURCES_DIR = 'switchboard_modules';


/**
 * Get the full location (URI) for a resource bundled with the application.
 *
 * Get the the full URI or location for a resource that comes bundled with the
 * application executable. This cannot be used for late loaded modules.
 *
 * @param {String} resourceName The name of the resource to resolve the full URI
 *      for.
 * @return (String) The fully resolved URI or null if it could not be resolved.
**/
exports.getInternalURI = function(resourceName)
{
    var extension = path.extname(resourceName);

    if(extension === '.html')
    {
        return path.join(__dirname, INTERNAL_TEMPLATES_DIR, resourceName);
    }
    else if(extension === '.js')
    {
        return path.join(__dirname, INTERNAL_JS_DIR, resourceName);
    }
    else if(extension === '.css')
    {
        return path.join(__dirname, INTERNAL_CSS_DIR, resourceName);
    }
    else
    {
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
exports.getExternalURI = function(fullResourceName)
{
    var resourceNamePieces = fullResourceName.split('/');
    var moduleName = resourceNamePieces[0];
    var resourceName = resourceNamePieces[1];
    var parentDir = exports.getParentDir();
    return path.join(parentDir, EXTERNAL_RESOURCES_DIR, moduleName,
        resourceName);
};


// TODO: This is not yet cross platform
exports.getParentDir = function()
{
    var pathPieces = path.dirname(process.execPath).split(path.sep);
    
    var cutIndex;
    var numPieces = pathPieces.length;
    for(cutIndex=0; cutIndex<numPieces; cutIndex++)
    {
        if(pathPieces[cutIndex].indexOf('.app') != -1)
            break;
    }

    return pathPieces.slice(0, cutIndex).join(path.sep);
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
exports.renderTemplate = function(location, context, onError, onSuccess)
{
    fs.exists(location, function(exists)
    {
        if(exists)
        {
            fs.readFile(location, 'utf8',
                function (error, template)
                {
                    if (error)
                    {
                        onError(error);
                    }
                    else
                    {
                        onSuccess(handlebars.compile(template)(context));
                    }
                }
            );
        }
        else
        {
            onError(new Error('Template ' + location + ' could not be found.'));
        }
    });
};


/**
 * Get information about the modules the user has installed for Switchboard.
 *
 * @param {function} onError The function to call if an error is encountered
 *      while reading module information.
 * @param {function} onSuccess The function to call after the module information
 *      is loaded. Should take one argument: an Array of Object with module
 *      information.
**/
exports.getLoadedModulesInfo = function(onError, onSuccess)
{
    var moduleDir = path.join(exports.getParentDir(), MODULES_DIR);
    var modulesDescriptorSrc = path.join(moduleDir, MODULES_DESC_FILENAME);

    fs.exists(modulesDescriptorSrc, function(exists)
    {
        if(exists)
        {
            fs.readFile(modulesDescriptorSrc, 'utf8',
                function (error, contents)
                {
                    if (error)
                    {
                        onError(error);
                    }
                    else
                    {
                        onSuccess(JSON.parse(contents));
                    }
                }
            );
        }
        else
        {
            var error = new Error(
                'Could not find modules info at ' + modulesDescriptorSrc + '.'
            );
            onError(error);
        }
    });
};


exports.getJSON = function(location, onError, onSuccess)
{
    fs.exists(location, function(exists)
    {
        if(exists)
        {
            fs.readFile(location, 'utf8',
                function (error, contents)
                {
                    if (error)
                    {
                        onError(error);
                    }
                    else
                    {
                        onSuccess(JSON.parse(contents));
                    }
                }
            );
        }
        else
        {
            var error = new Error(
                'Could not find JSON at ' + location + '.'
            );
            onError(error);
        }
    });
};
