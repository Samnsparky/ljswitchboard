/**
 * keyboard_event_handler.js for LabJack Switchboard.  Provides Kipling 
 * and all modules with a unified & error-safe way to respond to user keyboard 
 * events.
 *
 * @author Chris Johnson (LabJack, 2014)
**/


var dict = require('dict');

function dataPrinter(registeredName, initIsEnabled) {
    this.isEnabled = initIsEnabled;

    this.log = function() {
        if(self.isEnabled) {
            var prefix = registeredName + ':';
            switch(arguments.length) {
                case 0:
                    console.log(registeredName);
                    break;
                case 1:
                    console.log(prefix,arguments[0]);
                    break;
                case 2:
                    console.log(prefix,arguments[0],arguments[1]);
                    break;
                case 3:
                    console.log(prefix,arguments[0],arguments[1],arguments[2]);
                    break;
                case 4:
                    console.log(prefix,arguments[0],arguments[1],arguments[2],arguments[3]);
                    break;
                default:
                    console.log(prefix,Array.prototype.slice.call(arguments));
            }
        }
    };
    this.pErr = function() {
        if(self.isEnabled) {
            var prefix = registeredName + ':';
            switch(arguments.length) {
                case 0:
                    console.error(registeredName);
                    break;
                case 1:
                    console.error(prefix,arguments[0]);
                    break;
                case 2:
                    console.error(prefix,arguments[0],arguments[1]);
                    break;
                case 3:
                    console.error(prefix,arguments[0],arguments[1],arguments[2]);
                    break;
                case 4:
                    console.error(prefix,arguments[0],arguments[1],arguments[2],arguments[3]);
                    break;
                default:
                    console.error(prefix,Array.prototype.slice.call(arguments));
            }
        }
    };
    this.pWarn = function() {
        if(self.isEnabled) {
            var prefix = registeredName + ':';
            switch(arguments.length) {
                case 0:
                    console.warn(registeredName);
                    break;
                case 1:
                    console.warn(prefix,arguments[0]);
                    break;
                case 2:
                    console.warn(prefix,arguments[0],arguments[1]);
                    break;
                case 3:
                    console.warn(prefix,arguments[0],arguments[1],arguments[2]);
                    break;
                case 4:
                    console.warn(prefix,arguments[0],arguments[1],arguments[2],arguments[3]);
                    break;
                default:
                    console.warn(prefix,Array.prototype.slice.call(arguments));
            }
        }
    };
    this.disable = function() {
        self.isEnabled = false;
    };
    this.enable = function() {
        self.isEnabled = true;
    };
    this.getStatus = function() {
        return self.isEnabled;
    };
    var self = this;
}

var printers = dict();
var arePrintersEnabled = true;

exports.makePrinter = function(name) {
    var newPrinter = new dataPrinter(name, arePrintersEnabled);
    printers.set(name,newPrinter);
    return printers.get(name);
};
exports.deletePrinter = function(name) {
    printers.delete(name);
};
exports.getPrinter = function(name) {
    if(printers.has(name)) {
        return printers.get(name);
    } else {
        return null;
    }
};
exports.disablePrinters = function() {
    arePrintersEnabled = false;
    printers.forEach(function(printer){
        printer.disable();
    });
};
exports.enablePrinters = function() {
    arePrintersEnabled = true;
    printers.forEach(function(printer){
        printer.enable();
    });
};
exports.getPrinters = function() {
    return printers;
};

