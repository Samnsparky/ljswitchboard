var fs_facade = require('./fs_facade');

var throwOnError = function(err)
{
    throw err;
};

exports.testRenderTemplate = function(test){
    var context = {'testVal': 5};
    fs_facade.renderTemplate(
        'test_template.html',
        context,
        throwOnError,
        function(renderedHTML)
        {
            test.equal(renderedHTML, 'testVal: 5');
            test.done();
        }
    );
};