var gui = require('nw.gui');
require('getmac').getMac(function(err,macAddress){
    if (err)  throw err;
    process.curMacAddr = macAddress;
    process.isInternalComputer = {
        "00:25:4b:cf:1c:38": true               // Chris Mac (wifi?)
    }[macAddress];
    process.isDevComputer = {
        "00:25:4b:cf:1c:38": true               // Chris Mac (wifi?)
    }[macAddress];
});
console.log('window',window);
console.log('gui',gui);
console.log('process',process.version,process.arch,process.platform);

function catchUncaughtExceptions(e) {
	console.error('startup.js-uncaughtException',e);
}
function catchWindowErrors(e) {
	var m;
    console && console.error(errEvent);
    m = 'startup.js-uncaughtException: '  +
        errEvent.message + '\nfilename:"' +
        (errEvent.filename ? errEvent.filename : 'app_front.js') +
        '", line:' + errEvent.lineno
    // show any errors early
    document.write('<pre><h2>' +
        m + '</h2><div style="color:white;background-color:red">' +
        errEvent.error.stack + '</div></pre>'
    )
    console.error(m, e);
}
process.on('uncaughtException', catchUncaughtExceptions);
window.addEventListener('error' ,catchWindowErrors);