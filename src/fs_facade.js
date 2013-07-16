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


exports.renderTemplate = function(fileName, context, onError, onSuccess)
{
    fs.exists(fileName, function(exists)
    {
        if(exists)
        {
            fs.readFile(fileName, 'utf8',
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
            onError(new Error('Template ' + fileName + ' could not be found.'));
        }
    });
};


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
                'Could not load modules info at ' + modulesDescriptorSrc + '.'
            );
            onError(error);
        }
    });
};
