var fs_facade = require('./fs_facade');
var q = require('q');

function throwOnError(err)
{
    throw err;
}
module.exports = {
    setUp: function (callback) {
        callback();
    },

    testExternalURIFilePathShort: function (test) {
        var framework_location = 'framework/singleDevice-test.js';
        var calcPath = fs_facade.getExternalURI(framework_location);
        var splitOrigPath = framework_location.split('/');
        var splitCalcPath = calcPath.split('/');
        var i = 0;
        for (i = 0; i < splitOrigPath.length; i++) {
            var origStr = splitOrigPath[splitOrigPath.length-1-i];
            var testStr = splitCalcPath[splitCalcPath.length-1-i];
            test.deepEqual(origStr,testStr);
        }
        test.done();
    },
    testExternalURIFilePathLong: function (test) {
        var framework_location = 'framework/kipling-module-framework/singleDevice-test.js';
        var calcPath = fs_facade.getExternalURI(framework_location);
        var splitOrigPath = framework_location.split('/');
        var splitCalcPath = calcPath.split('/');
        var i = 0;
        for (i = 0; i < splitOrigPath.length; i++) {
            var origStr = splitOrigPath[splitOrigPath.length-1-i];
            var testStr = splitCalcPath[splitCalcPath.length-1-i];
            test.deepEqual(origStr,testStr);
        }
        test.done();
    }
}

/*exports.testRenderTemplate = function(test){
    var context = {'testVal': 5};
    fs_facade.renderTemplate(
        'templates/test_template.html',
        context,
        throwOnError,
        function(renderedHTML)
        {
            test.equal(renderedHTML, 'testVal: 5');
            test.done();
        }
    );
};*/


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
