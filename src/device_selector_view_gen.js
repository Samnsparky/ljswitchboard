var handlebars = require('handlebars');

var trees = [];

var aleradyOpenTree = {
	'subAttr': 'connection',
	'name': 'alreadyOpen',
	'trueVal': 'disabled',
	'falseVal': ''	
};
trees.push({'val': 'button_state', 'tree': aleradyOpenTree, 'target': 'connection'});

var isEnabledTree = {
	'name': 'isEnabled',
	'trueVal': '',
	'falseVal': 'disabled'
};
trees.push({'val': 'button_state', 'tree': isEnabledTree, 'target': 'connection'});

var imageTree = {
	'name': 'typeStr',
	'vals': {
		'T7': {
			'name': 'specialText',
			'vals': {
				' Pro': {
					'name': 'wifiStatusStr',
					'vals': {
						'Un-Powered': '<img title="WiFi Module Unpowered" class="wifiRSSIImage" src="static/img/wifiRSSI-not-active.png">',
						'Associated': '<img title="Signal Strength is {{ device.wifiRSSIStr }}" class="wifiRSSIImage" src="static/img/{{ device.wifiRSSIImgName }}.png">'
					},
					'defaultVal': '<img title="WiFi Module {{ device.wifiStatusStr }}" class="wifiRSSIImage" src="static/img/wifiRSSI-unknown.png">'
				}
			},
			'defaultVal': ''
		}
	},
	'defaultVal': ''
}
trees.push({'val': 'button_image', 'tree': imageTree, 'target': 'device'});

var classTree = {
	'name': 'isEnabled',
	'trueVal': {
		'subAttr': 'connection',
		'name': 'alreadyOpen',
		'trueVal': '',
		'falseVal': {
			'name': 'notSearchableWarning',
			'trueVal': 'btn-warning',
			'falseVal': 'btn-success'
		}
	},
	'falseVal': ''
};
trees.push({'val': 'button_class', 'tree': classTree, 'target': 'connection'});

var wifiIPTree = {
	// 'name': 'wifiStatus',
	// 'trueVal': '{{ device.wifiIPAddress }}',
	// 'falseVal': 'Not Connected'
	'name': 'wifiStatusStr',
	'vals': {
		'Un-Powered': 'Un-Powered',
		'Associated': '{{ device.wifiIPAddress }}'
	},
	'defaultVal': 'Not Connected'
};
trees.push({'val': 'displayWifiIPAddress', 'tree': wifiIPTree, 'target': 'device'});

// var titleTree = {
// 	'name': 'wifiStatus',
// 	'trueVal': {
// 		'name': 'alreadyOpen',
// 		'subAttr': 'connection',
// 		'trueVal': 'Unable to connect to {{ device.deviceType }}{{ device.specialText }} via {{ current.typeStr }}',
// 		'falseVal': {
// 			'name': 'notSearchableWarning',
// 			'trueVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }} however, scan failed',
// 			'falseVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }}'
// 		}
// 	},
// 	'falseVal': {
// 		'name': 'alreadyOpen',
// 		'subAttr': 'connection',
// 		'trueVal': 'Unable to connect to {{ device.deviceType }}{{ device.specialText }} via {{ current.typeStr }}',
// 	}
// 	//'falseVal': 'Unable to connect to {{ device.deviceType }}{{ device.specialText }} via {{ current.typeStr }} because {{ current.typeStr }} module is unpowered'
// };
var titleTree = {
	'name': 'ljmTypeStr',
	'subAttr': 'connection',
	'vals': {
		'LJM_ctUSB':'USB Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }}', 
		'LJM_ctETHERNET':{
			'name': 'alreadyOpen',
			'trueVal': 'Unable to connect to {{ device.deviceType }}{{ device.specialText }} via {{ current.typeStr }}',
			'falseVal': {
				'name': 'notSearchableWarning',
				'trueVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }} however, scan failed',
				'falseVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }}'
			}
		},
		'LJM_ctWIFI':{
			'name': 'wifiStatus',
			'falseVal': {
				'name': 'alreadyOpen',
				'trueVal': 'Unable to connect to {{ device.deviceType }}{{ device.specialText }} via {{ current.typeStr }}',
				'falseVal': {
					'name': 'notSearchableWarning',
					'trueVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }} however, scan failed',
					'falseVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }}'
				}
			},
			'trueVal': 'Unable to connect to {{ device.deviceType }}{{ device.specialText }} via {{ current.typeStr }} because {{ current.typeStr }} module is unpowered'
		}
	},
	'defaultVal': 'Unknown Connect To {{device.deviceType}}' 
};
trees.push({'val': 'button_title', 'tree': titleTree, 'target': 'connection'});

exports.addDeviceSelectorVals = function (device, connection) {
	var findTreeVal = function (treeInstruct, target) {
		// console.log(target);
		// console.log('--=-=====----');
		if (treeInstruct.subAttr) {
			target = target[treeInstruct.subAttr];
		}

		var targetAttr = target[treeInstruct.name];
		var retVal;

		if (treeInstruct.trueVal !== undefined) {
			if (targetAttr) {
				retVal = treeInstruct.trueVal;
			} else {
				retVal = treeInstruct.falseVal;
			}
		} else {
			if (treeInstruct.vals[targetAttr]) {
				retVal = treeInstruct.vals[targetAttr];
			} else {
				retVal = treeInstruct.defaultVal;
			}
		}

		if (retVal === null) {
			return null;
		} else if (retVal.name) {
			return findTreeVal(retVal, target)
		} else {
			return handlebars.compile(retVal)({
				'device': device,
				'current': target
			});
		}
	};

	device.connection = connection;
	trees.forEach(function (treeSpec) {
		// console.log('Getting treeSpec',treeSpec);
		var newVal = findTreeVal(treeSpec.tree, device);
		var strategies = {
			'device': function () { device[treeSpec.val] = newVal; },
			'connection': function () { connection[treeSpec.val] = newVal; }
		};

		if (newVal !== '') {
			strategies[treeSpec.target]();
		}
	});
	// console.log('Out of tree navigation');
}
