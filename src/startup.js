var gui = require('nw.gui');
require('getmac').getMac(function(err,macAddress){
    if (err)  throw err;
    process.curMacAddr = macAddress;
    process.isInternalComputer = {
        "00:25:4b:cf:1c:38a": true               // Chris Mac (wifi?)
    }[macAddress];
    process.isDevComputer = {
        "00:25:4b:cf:1c:38a": true               // Chris Mac (wifi?)
    }[macAddress];
    if(typeof(process.isDevComputer) === 'undefined') {
        process.isDevComputer = false;
    }
    if(typeof(process.isInternalComputer) === 'undefined') {
        process.isInternalComputer = false;
    }
    console.log('Cur Mac:',macAddress);
    if(typeof(gui.App.manifest.buildType) !== 'undefined') {
        process.buildType = gui.App.manifest.buildType;
    } else {
        process.buildType = 'develop';
    }
});
console.log('window',window);
console.log('gui',gui);
console.log('process',process.version,process.arch,process.platform);

function catchUncaughtExceptions(e) {
	console.error('startup.js-uncaughtException',e);
}
function catchWindowErrors(e) {
	var m;
    console && console.error(e);
    m = 'startup.js-uncaughtException: '  +
        e.message + '\nfilename:"' +
        (e.filename ? e.filename : 'app_front.js') +
        '", line:' + e.lineno
    // show any errors early
    document.write('<pre><h2>' +
        m + '</h2><div style="color:white;background-color:red">' +
        e.error.stack + '</div></pre>'
    )
    console.error(m, e);
}
process.on('uncaughtException', catchUncaughtExceptions);
window.addEventListener('error' ,catchWindowErrors);