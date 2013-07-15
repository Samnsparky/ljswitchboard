var device_controller = require('./test_device_controller');


$('#module-chrome').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    $('#device-count-display').html(keeper.getNumDevices())
});