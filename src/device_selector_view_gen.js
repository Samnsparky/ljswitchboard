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
					'subAttr': 'connection',
					'name': 'typeStr',
					'vals': {
						'Wifi': '<img title="Signal Strength is {{ device.wifiRSSIStr }}" class="wifiRSSIImage" src="static/img/{{ device.wifiRSSIImgName }}.png">'
					},
					'defaultVal': ''
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

var titleTree = {
	'subAttr': 'connection',
	'name': 'alreadyOpen',
	'trueVal': 'Unable to connect to {{ device.deviceType }}{{ device.specialText }} via {{ current.typeStr }}',
	'falseVal': {
		'name': 'notSearchableWarning',
		'trueVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }} however, scan failed',
		'falseVal': 'Connect to {{ device.deviceType }}{{ device.specialText }} using {{ current.typeStr }}'
	}
};
trees.push({'val': 'button_title', 'tree': titleTree, 'target': 'connection'});

exports.addDeviceSelectorVals = function (device, connection) {
	var findTreeVal = function (treeInstruct, target) {
		console.log(treeInstruct);
		if (treeInstruct.subAttr) {
			target = target[treeInstruct.subAttr];
		}

		console.log('=-------=', target);
		var targetAttr = target[treeInstruct.name];
		var retVal;

		if (treeInstruct.trueVal !== undefined) {
			console.log('***********', treeInstruct, target);
			if (targetAttr) {
				retVal = treeInstruct.trueVal;
			} else {
				retVal = treeInstruct.falseVal;
			}
		} else {
			console.log('***********-------', treeInstruct);
			if (treeInstruct.vals[targetAttr]) {
				retVal = treeInstruct.vals[targetAttr];
			} else {
				retVal = treeInstruct.defaultVal;
			}
		}

		console.log('RET VAL RET VAL RET VAL:', retVal);
		if (retVal === null) {
			return null;
		} else if (retVal.name) {
			console.log('=- :) -- :) --=');
			return findTreeVal(retVal, target)
		} else {
			console.log('=- :-/ -- :-/ --=');
			return handlebars.compile(retVal)({
				'device': device,
				'current': target
			});
		}
	};

	console.log('WTF??????');
	device.connection = connection;
	trees.forEach(function (treeSpec) {
		var newVal = findTreeVal(treeSpec.tree, device);
		var strategies = {
			'device': function () { device[treeSpec.val] = newVal; },
			'connection': function () { connection[treeSpec.val] = newVal; }
		};

		if (newVal !== '') {
			strategies[treeSpec.target]();
		}
	});
}
