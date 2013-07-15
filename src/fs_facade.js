/*jslint node: true */

var fs = require('fs');
var path = require('path');

var handlebars = require('handlebars');

var TEMPLATES_DIR = 'templates';


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
            onError(new Error('Template could not be found.'));
        }
    });
};
