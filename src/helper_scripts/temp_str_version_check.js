var resStr = {true:'passed',false:'failed'};
var isVersionNewer = function(currentVersion, newVersion) {
	var isNewer = false;

	curVNums = currentVersion.split('.');
	newVNums = newVersion.split('.');
	if(curVNums.length !== newVNums.length) {
		var i = 0;
		var diff = 0;
		if(curVNums.length > newVNums.length) {
			diff = curVNums.length - newVNums.length;
			for(i = 0; i < diff; i++) {
				curVNums.push(0);
			}
		} else {
			diff = newVNums.length - curVNums.length;
			for(i = 0; i < diff; i++) {
				newVNums.push(0);
			}
		}
	}
	
	newVNums.some(function(newV,i){
		var newVersionNum = parseInt(newV, 10);
		var curVersionNum = parseInt(curVNums[i], 10);
		if(newVersionNum > curVersionNum) {
			isNewer = true;
			return true;
		}
		if(curVersionNum > newVersionNum) {
			return true;
		}
	});
	return isNewer;
};

var performTest = function(tests) {
	var testResult = true;
	tests.forEach(function(test,i) {
		var dispVal = "#version" + i.toString();
		var isNewer = isVersionNewer(test.curV, test.newV);
		var res = false;
		if(isNewer === test.res) {
			res = true;
		} else {
			testResult = false;
		}
		// $(dispVal).text(test.curV+' & '+test.newV + ' -> ' + resStr[res]);
		console.log(test.curV+' & '+test.newV + ' -> ' + resStr[res]);
	});
	return testResult;
};
var tests = [
	{'curV':'0.1.0', 'newV':'0.1.1', 'res':true},
	{'curV':'0.1.0', 'newV':'0.2.1', 'res':true},
	{'curV':'0.1.0', 'newV':'1.1.1', 'res':true},
	{'curV':'0.1.1', 'newV':'0.1.1', 'res':false},
	{'curV':'0.1.2', 'newV':'0.1.1', 'res':false},
	{'curV':'0.1.9', 'newV':'0.1.10', 'res':true},
	{'curV':'0.1.9', 'newV':'0.1.11', 'res':true},
	{'curV':'0.1.9', 'newV':'3.0.0', 'res':true},
	{'curV':'0.1.9', 'newV':'0.1.11', 'res':true},
	{'curV':'3.0.0', 'newV':'0.1.11', 'res':false}
];

var result = performTest(tests);
// $('#result').text(resStr[result]);
console.log(resStr[result])