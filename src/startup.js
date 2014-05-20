var gui = require('nw.gui');
console.log('Hello World! -startup.js');
console.log('window',window);
console.log('gui',gui);
console.log('process',process);

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
    console.error(m);
}
process.on('uncaughtException', catchUncaughtExceptions);
window.addEventListener('error' ,catchWindowErrors);