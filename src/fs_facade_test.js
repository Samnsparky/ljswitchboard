var fs_facade = require('./fs_facade');


function throwOnError(err)
{
    throw err;
}


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


/*exports.testGetLoadedModulesInfo = function(test){
    fs_facade.getLoadedModulesInfo(throwOnError, function(info){
        var found = false;
        for(var i in info)
        {
            if(info[i].name === 'test_module')
                found = true;
        }
        test.ok(found);
        test.done();
    });
};*/
