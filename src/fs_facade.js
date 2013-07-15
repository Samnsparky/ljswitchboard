/*jslint node: true */

var fs = require('fs');
var path = require('path');

var handlebars = require('handlebars');

var TEMPLATES_DIR = 'templates';
var MODULES_DIR = 'switchboard_modules';
var MODULES_DESC_FILENAME = 'modules.json';


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


exports.renderTemplate = function(templateName, context, onError, onSuccess)
{
    var fileName = path.join(__dirname, TEMPLATES_DIR, templateName);
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
