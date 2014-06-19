var globalDeviceConstantsSwitch = {
    "T7":"t7DeviceConstants",
    "T7Pro":"t7ProDeviceConstants"
};
var globalDeviceConstants = {
    "t7DeviceConstants": {
        hasEFSystem: true,
        ainBitsPrecision: 6,
        ainChannelNames: "AIN#(0:13)",
        allConfigRegisters: [
            {"name":"Range",            "cssClass":"range",             "register":"AIN_ALL_RANGE",                 "options":"ainRangeOptions",                    "manual":false},
            {"name":"Resolution",       "cssClass":"resolution",        "register":"AIN_ALL_RESOLUTION_INDEX",      "options":"ainResolutionOptions",               "manual":false},
            {"name":"Settling (us)",    "cssClass":"settling",          "register":"AIN_ALL_SETTLING_US",           "options":"func","func":"ainSettlingOptions",   "manual":false},
            {"name":"Negative Channel", "cssClass":"negativeChannel",   "register":"AIN_ALL_NEGATIVE_CH",           "options":"func","func":"ainNegativeCHOptions", "manual":false},
            {"name":"EF System",        "cssClass":"efSystem",          "register":"{{ainChannelNames}}_EF_INDEX",  "options":"ainEFTypeOptions",                   "manual":true}
        ],
        configRegisters: [
            {"name":"Range",            "cssClass":"range",             "register":"{{ainChannelNames}}_RANGE",            "options":"ainRangeOptions"},
            {"name":"Resolution",       "cssClass":"resolution",        "register":"{{ainChannelNames}}_RESOLUTION_INDEX", "options":"ainResolutionOptions"},
            {"name":"Settling (us)",    "cssClass":"settling",          "register":"{{ainChannelNames}}_SETTLING_US",      "options":"func","func":"ainSettlingOptions"},
            {"name":"Negative Channel", "cssClass":"negativeChannel",   "register":"{{ainChannelNames}}_NEGATIVE_CH",      "options":"func","func":"ainNegativeCHOptions"},
            {"name":"EF System",        "cssClass":"efSystem",          "register":"{{ainChannelNames}}_EF_INDEX",         "options":"ainEFTypeOptions"}
        ],
        extraAllAinOptions: [
            {"name": "Select","value": -9999},
            {"name": "Select","value": 65535}
        ],
        ainNegativeCHOptions: {
            "numbers":[0,2,4,6,8,10,12,199],
            func: function(val) {
                if((val > -1)&&(val < 14)) {
                    return {value: val,name: 'AIN'+val.toString()};
                } else if (val === 199) {
                    return {value: 199,name: "GND"};
                } else {
                    return {value: 65535, name: "Select"}
                }
            },
            filter: function(val) {
                if((typeof(val)==='undefined')||(val === null)) {
                    return [{"value": 199,"name": "GND"}];
                }
                if(val%2 === 0) {
                    return [
                        {value: (val+1),name: 'AIN'+(val+1).toString()},
                        {value: 199,name: "GND"}
                    ];
                } else {
                    return [
                        {value: 199,name: "GND"}
                    ];
                }
            }
        },
        parsers: [
            "ainRangeOptions",
            "ainResolutionOptions",
            "ainSettlingOptions",
            "ainNegativeCHOptions",
            "ainEFTypeOptions"
        ],
        ainRangeOptions: [
            {"name": "-10 to 10V","value": 10,"timeMultiplier":1},
            {"name": "-1 to 1V","value": 1,"timeMultiplier":1.25},
            {"name": "-0.1 to 0.1V","value": 0.1,"timeMultiplier":1.5},
            {"name": "-0.01 to 0.01V","value": 0.01,"timeMultiplier":3}
        ],
        ainResolutionOptions: [
            {"name": "Auto","value": 0,"acquisitionTime": 50},
            {"name": "1","value": 1, "acquisitionTime": 50},
            {"name": "2","value": 2, "acquisitionTime": 50},
            {"name": "3","value": 3, "acquisitionTime": 50},
            {"name": "4","value": 4, "acquisitionTime": 50},
            {"name": "5","value": 5, "acquisitionTime": 50},
            {"name": "6","value": 6, "acquisitionTime": 50},
            {"name": "7","value": 7, "acquisitionTime": 50},
            {"name": "8","value": 8, "acquisitionTime": 50},
            {"name": "9","value": 9, "acquisitionTime": 50}
        ],
        ainSettlingOptions_RAW: [
            {"name": "Auto",    "value": 0},
            {"name": "10us",    "value": 10},
            {"name": "25us",    "value": 25},
            {"name": "50us",    "value": 50},
            {"name": "100us",   "value": 100},
            {"name": "250us",   "value": 250},
            {"name": "500us",   "value": 500},
            {"name": "1ms",     "value": 1000},
            {"name": "2.5ms",   "value": 2500},
            {"name": "5ms",     "value": 5000},
            {"name": "10ms",    "value": 10000},
            {"name": "25ms",    "value": 25000},
            {"name": "50ms",    "value": 50000}
        ],
        ainSettlingOptions: {
            "numbers": [0,10,25,50,100,250,1000,2500,5000,10000,25000,50000],
            func: function(val) {
                if(val === 0) {
                    return {value: val,name: 'Auto'};
                } else if ((val < 1000)&&(val > -1)) {
                    return {value: val,name: val.toString()+"us"};
                } else if ((val > -1)&&(val < 1000000)){
                    return {value: val,name: (val/1000).toString()+"ms"};
                } else {
                    return {value: -9999, name: "Select"};
                }
            },
            filter: function(val) {
                return globalDeviceConstants.t7DeviceConstants.ainSettlingOptions_RAW;
                // if(val === 0) {
                //     return {value: val,name: 'Auto'};
                // } else if (val < 1000) {
                //     return {value: val,name: val.toString()+"us"};
                // } else {
                //     return {value: val,name: (val/1000).toString()+"ms"};
                // } 
            }
        },
        ainEFTypeOptions:[
            {"name": "Input", "value": 0, "selected": '',"infoReg":"_EF_READ_A"},
            {"name": "TypeE Thermocouple","value": 20, "selected": '',"infoReg":"_EF_READ_A"},
            {"name": "TypeJ Thermocouple","value": 21, "selected": '',"infoReg":"_EF_READ_A"},
            {"name": "TypeK Thermocouple","value": 22, "selected": '',"infoReg":"_EF_READ_A"},
            {"name": "TypeR Thermocouple","value": 23, "selected": '',"infoReg":"_EF_READ_A"},
            {"name": "TypeT Thermocouple","value": 24, "selected": '',"infoReg":"_EF_READ_A"}
        ],
        thermocoupleTypes: [
            {"name": "TypeE","value": 20},
            {"name": "TypeJ","value": 21},
            {"name": "TypeK","value": 22},
            {"name": "TypeR","value": 23},
            {"name": "TypeT","value": 24}
        ],
        thermocoupleTemperatureMetrics: [
            {"name": "K","value": 0},
            {"name": "C","value": 1},
            {"name": "F","value": 2}
        ]
    },
    "t7ProDeviceConstants": {
        "importedInfo":[
            "hasEFSystem",
            "ainBitsPrecision",
            "ainChannelNames",
            "allConfigRegisters",
            "configRegisters",
            "extraAllAinOptions",
            "ainNegativeCHOptions",
            "parsers",
            "ainRangeOptions",
            "ainResolutionOptions",
            "ainSettlingOptions_RAW",
            "ainSettlingOptions",
            "ainEFTypeOptions",
            "thermocoupleTypes",
            "thermocoupleTemperatureMetrics"
        ],
        "extendedInfo":[
            {"key":"ainResolutionOptions","values": [
                    {"name": "10","value": 10, "acquisitionTime": 200},
                    {"name": "11","value": 11, "acquisitionTime": 200},
                    {"name": "12","value": 12, "acquisitionTime": 200}
                ]
            }
        ]
    }
};


var linkGlobalDeviceConstants = function() {
    var t7Pro = globalDeviceConstants.t7ProDeviceConstants;

    t7Pro.importedInfo.forEach(function(attr){
        var t7Info = globalDeviceConstants.t7DeviceConstants[attr];
        globalDeviceConstants.t7ProDeviceConstants[attr] = t7Info;
    });
    t7Pro.extendedInfo.forEach(function(attr){
        globalDeviceConstants.t7ProDeviceConstants[attr.key] = [];
        globalDeviceConstants.t7DeviceConstants[attr.key].forEach(function(t7Data){
            globalDeviceConstants.t7ProDeviceConstants[attr.key].push(t7Data);
        });
        var t7ProVals = attr.values;
        t7ProVals.forEach(function(t7ProData){
            globalDeviceConstants.t7ProDeviceConstants[attr.key].push(t7ProData);
        });
    });
}
linkGlobalDeviceConstants();



