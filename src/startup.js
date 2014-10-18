var gui = require('nw.gui');
var q = require('q');
require('getmac').getMac(function(err,macAddress){
    if (err)  throw err;
    process.curMacAddr = macAddress;
    process.isInternalComputer = {
        "00:25:4b:cf:1c:38": true,                  // Chris: Mac (wifi?)
        "50-1A-C5-E8-DE-9B": true,                  // Chris: Surface (wifi?)
        "68-94-23-06-5D-8F": true,                  // Chris: LJ-Win8
        "C8-60-00-30-7D-40": true,                  // Chris: Home-Win7
        "00-26-2D-28-C2-2A": true,                  // Caleb: LJ-Win7
        "E0-69-95-C1-45-12": true,                  // Dave: LJ-Win7
        "14:10:9f:d4:67:51": true,                  // Rory: New mac
        "00-1A-A0-90-C3-C1": true,                  // LJRob (spongebob): LJ-Win7
    }[macAddress];
    process.isDevComputer = {
        "00:25:4b:cf:1c:38": true,                  // Chris Mac (wifi?)
        "50-1A-C5-E8-DE-9B": true,                  // Chris: Surface (wifi?)
        "68-94-23-06-5D-8F": true,                  // Chris: LJ-Win8
        "C8-60-00-30-7D-40": true,                  // Chris: Home-Win7
        "14:10:9f:d4:67:51": true,                  // Rory: New mac
        "00-26-2D-28-C2-2A": true,                  // Caleb: LJ-Win7
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
function showAlert(errorMessage)
{
    var message = OPEN_FAIL_MESSAGE(errorMessage);
    $('#error-display').html(message);
    $('.device-selector-holder').css('margin-top', '0px');
    $('#alert-message').fadeIn();
}
function catchUncaughtExceptions(e) {
	console.error('startup.js-uncaughtException',e);
}
function catchWindowErrors(e) {
	var m;
    console && console.error(e);
    m = 'startup.js-uncaughtException: '  +
        e.message + '\nfilename:"' +
        (e.filename ? e.filename : 'app_front.js') +
        '", line:' + e.lineno;
    // show any errors early
    showAlert(m + ': ' + e.error.stack);
    console.error(m, e,e.error.stack);
}
process.on('uncaughtException', catchUncaughtExceptions);
window.addEventListener('error' ,catchWindowErrors);

