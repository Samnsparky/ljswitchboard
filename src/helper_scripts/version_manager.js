/**
 * version_manager.js for LabJack Switchboard.  Provides Kipling with the ability
 * to query for various versions of LabJack software versions, firmeware 
 * versions, and drivers
 *
 * @author Chris Johnson (LabJack, 2014)
**/

// nodejs requires:
var child_process = require('child_process');

// 3rd party npm library requires:
var q = require('q');
var request = require('request');
var async = require('async');
var dict = require('dict');
var handlebars = require('handlebars');
var fs = require('fs');

// Require ljswitchboard libs
var ljsError;
try {
    ljsError = require('./helper_scripts/error_handler');
} catch (err) {
    ljsError = require('./error_handler');
}

function labjackVersionManager() {
	this.kiplingUpdateLinks = {
		"current_win":		"https://s3.amazonaws.com/ljrob/win32/kipling/kipling_win.zip",
		"beta_win":			"https://s3.amazonaws.com/ljrob/win32/kipling/beta/kipling_beta_win.zip",
		"test_win":			"https://s3.amazonaws.com/ljrob/win32/kipling/test/kipling_test_win.zip",

		"current_mac":		"https://s3.amazonaws.com/ljrob/mac/kipling/kipling_mac.zip",
		"beta_mac":			"https://s3.amazonaws.com/ljrob/mac/kipling/beta/kipling_beta_mac.zip",
		"test_mac":			"https://s3.amazonaws.com/ljrob/mac/kipling/test/kipling_test_mac.zip",

		"current_linux32":	"https://s3.amazonaws.com/ljrob/linux32/kipling/kipling_lin32.zip",
		"beta_linux32":		"https://s3.amazonaws.com/ljrob/lin32/kipling/beta/kipling_beta_lin32.zip",
		"test_linux32":		"https://s3.amazonaws.com/ljrob/lin32/kipling/test/kipling_test_lin32.zip",

		"current_linux64":	"https://s3.amazonaws.com/ljrob/linux64/kipling/kipling_lin64.zip",
		"beta_linux64":		"https://s3.amazonaws.com/ljrob/lin64/kipling/beta/kipling_beta_lin64.zip",
		"test_linux64":		"https://s3.amazonaws.com/ljrob/lin64/kipling/test/kipling_test_lin64.zip"
	};

	// define dict object with various urls in it
	this.urlDict = {
		"kipling": {
			"type":"kipling",
			"platformDependent": true,
			"types": ['current','beta','test'],
			"urls":[
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_win"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_mac"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_linux32"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_linux64"},

				// {"url": "http://files.labjack.com/versions/ljrob/win32/kipling/current.txt", "type": "test_win"},
				// {"url": "http://files.labjack.com/versions/ljrob/mac/kipling/current.txt", "type": "test_mac"},
				// {"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/current.txt", "type": "test_linux32"},
				// {"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/current.txt", "type": "test_linux64"},

				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_win"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_mac"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_linux32"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_linux64"},

				// {"url": "http://files.labjack.com/versions/ljrob/win32/kipling/beta.txt", "type": "test_win"},
				// {"url": "http://files.labjack.com/versions/ljrob/mac/kipling/beta.txt", "type": "test_mac"},
				// {"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/beta.txt", "type": "test_linux32"},
				// {"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/beta.txt", "type": "test_linux64"},

				{"url": "http://files.labjack.com/versions/ljrob/win32/kipling/test.txt", "type": "test_win"},
				{"url": "http://files.labjack.com/versions/ljrob/mac/kipling/test.txt", "type": "test_mac"},
				{"url": "http://files.labjack.com/versions/ljrob/linux32/kipling/test.txt", "type": "test_linux32"},
				{"url": "http://files.labjack.com/versions/ljrob/linux64/kipling/test.txt", "type": "test_linux64"}
			]
		},
		"ljm": {
			"type":"ljmDownloadsPage",
			"platformDependent": true,
			"types": ['current'],
			"urls":[
				{"url": "http://labjack.com/support/ljm", "type": "current_win"},
				{"url": "http://labjack.com/support/ljm", "type": "current_mac"},
				{"url": "http://labjack.com/support/ljm", "type": "current_linux32"},
				{"url": "http://labjack.com/support/ljm", "type": "current_linux64"}
			]
		},
		"ljm_wrapper": {
			"type":"ljm_wrapper",
			"platformDependent": false,
			"urls":[
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/ljm_wrapper.txt", "type": "current"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/ljm_wrapper.txt", "type": "beta"}
			]
		},
		"t7": {
			"type":"t7FirmwarePage",
			"platformDependent": false,
			"urls":[
				{"url": "http://labjack.com/support/firmware/t7", "type": "current"},
				{"url": "http://labjack.com/support/firmware/t7/beta", "type": "beta"},
				{"url": "http://labjack.com/support/firmware/t7/old", "type": "old"},
			]
		},
		"digit": {
			"type":"digitFirmwarePage",
			"platformDependent": false,
			"urls":[
				{"url": "http://labjack.com/support/firmware/digit", "type": "current"}
			]
		}
	};

	this.strategies = {
		kipling: function(listingArray, pageData, urlInfo, name) {
			listingArray.push({
				"upgradeLink":self.kiplingUpdateLinks[urlInfo.type],
				"version":pageData,
				"type":urlInfo.type,
				"key":urlInfo.type + '-' + pageData
			});
			return;
		},
		ljm_wrapper: function(listingArray, pageData, urlInfo, name) {
			listingArray.push({
				"upgradeLink":"",
				"version":pageData,
				"type":urlInfo.type,
				"key":urlInfo.type + '-' + pageData
			});
			return;
		},
		ljmDownloadsPage: function(listingArray, pageData, urlInfo, name) {
			var LJM_REGEX;
			var platform = urlInfo.type.split('_')[1];
			var match;
			var getMatch = true;
			if (platform === 'win') {
				LJM_REGEX = /href=\".*LabJackMUpdate-([\d]\.[\d]+)\.exe(?=\"\stype)/g;
				match = LJM_REGEX.exec(pageData);
				if(!match) {
					LJM_REGEX = /href=\".*LabJackMUpgrade-([\d]\.[\d]+)\.exe(?=\"\stype)/g;
					match = LJM_REGEX.exec(pageData);
				}
				getMatch = false;
			} else if (platform === 'mac') {
				LJM_REGEX = /href=\".*LabJackM-([\d]\.[\d]+)\-Mac\.tgz(?=\"\stype)/g;
			} else if (platform === 'linux32') {
				LJM_REGEX = /href=\".*LabJackM-([\d]\.[\d]+)\-Ubuntu.*-i386.*.gz(?=\"\stype)/g;
			} else if (platform === 'linux64') {
				LJM_REGEX = /href=\".*LabJackM-([\d]\.[\d]+)\-Ubuntu.*-x86\_64.*.gz(?=\"\stype)/g;
			}
			if(getMatch) {
				match = LJM_REGEX.exec(pageData);
			}

			if(match) {
				var targetURL = match[0].replace(/href\=\"/g, '');
				var version = match[1];
				listingArray.push({
						"upgradeLink":targetURL,
						"version":version,
						"type":urlInfo.type,
						"key":urlInfo.type + '-' + version
					});
			} else {
				console.error('Bad LJM_REGEX strings');
			}
			return;
		},
		/**
		 * Example T7 fw file name: T7firmware_010100_2014-05-12.bin
		 * Example T7 fw file download link:
		 * http://labjack.com/sites/default/files/2014/05/T7firmware_010100_2014-05-12.bin
		**/
		t7FirmwarePage: function(listingArray, pageData, urlInfo, name) {
			var FIRMWARE_LINK_REGEX = /href\=\".*T7firmware\_([\d\-]+)\_([\d\-]+)\.bin"/g;
			var match = FIRMWARE_LINK_REGEX.exec(pageData);
			while (match !== null) {
				var targetURL = match[0].replace(/href\=\"/g, '');
				targetURL = targetURL.replace(/\"/g, '');
				var version = (parseFloat(match[1])/10000).toFixed(4);
				listingArray.push({
					"upgradeLink":targetURL,
					"version":version,
					"type":urlInfo.type,
					"key":urlInfo.type + '-' + version
				});
				match = FIRMWARE_LINK_REGEX.exec(pageData);
			}
			return;
		},
		/**T7firmware_010100_2014-05-12.bin
		 * Example digit fw file name: DigitFW_007416_01232013.bin
		 * Example digit fw file download link:
		 * http://labjack.com/sites/default/files/2013/01/DigitFW_007416_01232013.bin
		**/
		digitFirmwarePage: function(listingArray, pageData, urlInfo, name) {
			var FIRMWARE_LINK_REGEX = /href=\".*DigitFW\_([\d\_]+).bin\"(?=\s)/g;
			var match = FIRMWARE_LINK_REGEX.exec(pageData);
			while (match !== null) {
				var targetURL = match[0].replace(/href\=\=/g, '');
				targetURL = targetURL.replace(/\"/g, '');
				var version = parseFloat(match[1].split('_')[0]/10000).toFixed(4);
				listingArray.push({
					"upgradeLink":targetURL,
					"version":version,
					"type":urlInfo.type,
					"key":urlInfo.type + '-' + version
				});
				match = FIRMWARE_LINK_REGEX.exec(pageData);
			}
			return;
		},
	};
	this.pageCache = dict();
	this.infoCache = {};
	this.dataCache = {};
	this.isDataComplete = false;
	this.isError = false;
	this.errorInfo = null;
	

	/**
	 * Function that prints out all urls to console.log
	**/
	this.pBuf = function() {
		console.log('Num Pages Cached',self.pageCache.size);
		self.pageCache.forEach(function(val,key){
			console.log('Cached URLs',key);
		});
	};
	this.buildQuery = function(savedData, strategy, urlInfo, name) {
		var dataQuery = function(callback) {
			var url = urlInfo.url;
			// Check to see if the page has been cached, if it is don't query 
			// for it
			if(!self.pageCache.has(url)) {
				// Perform request to get pageData/body
				var options = {
					'url': url,
					'timeout': 2000,
				};
				request(
					options,
					function (error, response, body) {
						var message = '';
						var err = null;
						if (error) {
							// Report a TCP Level error likely means computer is not
							// connected to the internet.
							if (error.code === 'ENOTFOUND') {
								message = "TCP Error, computer not connected to network: ";
							} else if(error.code === 'ETIMEDOUT') {
								message = "TCP Error, no internet connection: ";
							} else {
								message = "Unknown TCP Error: ";
							}
							err = {
								"num": -1,
								"str": message + error.toString(),
								"quit": true,
								"code": error.code,
								"url": url
							};
							self.infoCache.isError = true;
							self.infoCache.errors.push(err);
							callback(err);
						} else if (response.statusCode != 200) {
							// Report a http error, likely is 404, page not found.
							message = "Got Code: ";
							message += response.statusCode.toString();
							message += "; loading: " + url;
							message += "; name: " + name;
							message += "; type: " + urlInfo.type;
							err = {
								"num": response.statusCode,
								"str": message,
								"quit": false,
								"url": url
							};
							self.infoCache.warning = true;
							self.infoCache.warnings.push(err);
							callback(err);
						} else {
							self.pageCache.set(url,body);
							strategy(savedData, body, urlInfo, name);
							callback();
						}
					}
				);
			} else {
				// get pageData/body from cache
				var pageData = self.pageCache.get(url);
				strategy(savedData, pageData, urlInfo, name);
				callback();
			}
		};
		return dataQuery;
	};
	this.saveTempData = function(name, infos) {
		var systemType = self.getLabjackSystemType();
		var platformDependent = self.urlDict[name].platformDependent;
		
		// console.log('name',name);
		// console.log('is dependent',platformDependent);
		// console.log('systemType',systemType);
		
		self.infoCache[name] = {};
		self.dataCache[name] = {};
		infos.forEach(function(info) {
			if (typeof(self.infoCache[name][info.type]) === 'undefined') {
				self.infoCache[name][info.type] = [];
			}
			var data = {
				upgradeLink: info.upgradeLink,
				version: info.version,
				type: info.type,
				key: info.key
			};
			self.infoCache[name][info.type].push(data);
			if (platformDependent) {
				var isCurSys = info.type.search(systemType) > 0;
				var curType = info.type.split('_'+systemType)[0];
				if(isCurSys) {
					// console.log('Current Type',info.type)
					if (typeof(self.dataCache[name][curType]) === 'undefined') {
						self.dataCache[name][curType] = [];
					}
					self.dataCache[name][curType].push(data);
				}

			} else {
				if (typeof(self.dataCache[name][info.type]) === 'undefined') {
					self.dataCache[name][info.type] = [];
				}
				self.dataCache[name][info.type].push(data);
			}
		});
	};
	this.queryForVersions = function(name) {
		var defered = q.defer();
		var info = self.urlDict[name];
		var queriedData = [];

		if(typeof(info) !== 'undefined') {
			// Get the stratigy function
			var strategyType = info.type;
			var strategy = self.strategies[strategyType];

			if(typeof(strategy) !== 'undefined') {
				// build an array of querys that need to be made to collect data
				var prefetchQuerys = [];
				var prefetchDict = dict();
				var querys  = [];

				// Make an effort to minimize the number of requests
				info.urls.map(function(urlInfo) {
					var url = urlInfo.url;
					var query = self.buildQuery(queriedData, strategy, urlInfo, name);
					if (!prefetchDict.has(url)) {
						prefetchDict.set(url,query);
					} else {
						querys.push(query);
					}
				});

				// Move dict querys into the array
				prefetchDict.forEach(function(query){
					prefetchQuerys.push(query);
				});

				// function to asynchronously execute the list of prefetchQuerys
				var execPrefetchQuerys = function() {
					async.each(prefetchQuerys,
						function(query, callback) {
							query(callback);
						}, function(err) {
							if(err) {
								if(err.quit) {
									defered.reject(err);
								} else {
									execRemainder();
								}
							} else {
								execRemainder();
							}
						});
				};

				// function to asynchronously execute the list of remainder
				var execRemainder = function() {
					async.each(querys,
						function(query, callback) {
							query(callback);
						}, function(err) {
							if(err) {
								if(err.quit) {
									defered.reject(err);
								} else {
									if (queriedData.length > 0) {
										defered.resolve(queriedData);
									} else {
										defered.reject(err);
									}
								}
							} else {
								self.saveTempData(name,queriedData);
								defered.resolve(queriedData);
							}
						});
				};

				// execute prefetchQuerys
				execPrefetchQuerys();
				// var numQuerys = prefetchQuerys.length + querys.length;
				// console.log('Num Querys:', numQuerys, 'Num Cached', prefetchQuerys.length);
			} else {
				// if the strategies object is undefined report an error
				defered.reject('invalid strategy');
			}
		} else {
			// if the info object is undefined report an error
			defered.reject('invalid type');
		}
		return defered.promise;
	};



	this.getKiplingVersions = function() {
		var defered = q.defer();
		self.queryForVersions('kipling')
		.then(defered.resolve,defered.reject);
		return defered.promise;
	};
	this.getLJMVersions = function() {
		var defered = q.defer();
		self.queryForVersions('ljm')
		.then(defered.resolve,defered.reject);
		return defered.promise;
	};
	this.getLJMWrapperVersions = function() {
		var defered = q.defer();
		self.queryForVersions('ljm_wrapper')
		.then(defered.resolve,defered.reject);
		return defered.promise;
	};
	/**
	 * Function that querys & parses labjack.com/support/firmware/t7, /beta, and
	 *  /old for different versions of T7 firmware & appropriate links.
	 *  
	 * @return {[type]} [description]
	**/
	this.getT7FirmwareVersions = function() {
		var defered = q.defer();
		self.queryForVersions('t7')
		.then(defered.resolve,defered.reject);
		return defered.promise;
	};
	this.getDigitFirmwareVersions = function() {
		var defered = q.defer();
		self.queryForVersions('digit')
		.then(defered.resolve,defered.reject);
		return defered.promise;
	};
	this.getAllVersions = function() {
		// Re-set constants
		self.infoCache = {};
		self.dataCache = {};
		self.infoCache.warning = false;
		self.infoCache.warnings = [];
		self.isDataComplete = false;
		self.isError = false;
		self.infoCache.isError = false;
		self.infoCache.errors = [];
		var errorFunc = function(err) {
			var errDefered = q.defer();
			if (err) {
				if(err.quit) {
					self.isError = true;
					self.errorInfo = err;
					defered.reject(err);
					errDefered.reject();
				} else {
					errDefered.resolve();
				}
				// console.error('Error Querying LabJack Versions',err);
			}
			return errDefered.promise;
		};
		var defered = q.defer();
		self.getLJMVersions()
		.then(self.getKiplingVersions, errorFunc)
		.then(self.getLJMWrapperVersions, errorFunc)
		.then(self.getT7FirmwareVersions, errorFunc)
		.then(self.getDigitFirmwareVersions, errorFunc)
		.then(function() {
			self.isDataComplete = true;
			defered.resolve(self.infoCache);
		}, errorFunc);
		return defered.promise;
	};
	this.clearPageCache = function() {
		self.pageCache.clear();
	};
	this.getStatus = function() {
		return self.isDataComplete;
	};
	this.isIssue = function() {
		if(self.isDataComplete) {
			return self.infoCache.warning || self.infoCache.isError;
		} else {
			return true;
		}
	};
	this.getIssue = function() {
		var issue;
		if(self.isIssue()) {
			if(self.infoCache.isError) {
				issue = {"type": "error","data":self.infoCache.errors};
			} else {
				issue = {"type": "warning","data":self.infoCache.warnings};
			}
		} else {
			issue = {"type": "none","data":null};
		}
		return issue;
	};
	this.waitForData = function() {
		var defered = q.defer();
		var checkInterval = 100;
		var iteration = 0;
		var maxCheck = 100;

		// Define a function that can delays & re-calls itself until it errors
		// out or resolves to the defered q object.
		var isComplete = function() {
			return !(self.isDataComplete || self.isError);
		};
		var finishFunc = function() {
			// console.log('version_manager.js - Num Iterations',iteration);
			if(self.isError) {
				defered.reject(self.errorInfo);
			} else {
				defered.resolve(self.infoCache);
			}
		};
		var waitFunc = function() {
			if(isComplete()) {
				if (iteration < maxCheck) {
					iteration += 1;
					setTimeout(waitFunc,checkInterval);
				} else {
					defered.reject('Max Retries Exceeded');
				}
			} else {
				finishFunc();
			}
		};

		// if the data isn't complete then 
		if(isComplete()) {
			setTimeout(waitFunc,checkInterval);
		} else {
			finishFunc();
		}
		return defered.promise;
	};

	this.getLabjackSystemType = function() {
		var ljSystemType = '';
		var ljPlatformClass = {
			'ia32': '32',
			'x64': '64',
			'arm': 'arm'
		}[process.arch];
		var ljPlatform = {
			'linux': 'linux',
			'linux2': 'linux',
			'sunos': 'linux',
			'solaris': 'linux',
			'freebsd': 'linux',
			'openbsd': 'linux',
			'darwin': 'mac',
			'mac': 'mac',
			'win32': 'win',
		}[process.platform];
		if(typeof(ljPlatform) !== 'undefined') {
			if(ljPlatform === 'linux') {
				ljSystemType = ljPlatform + ljPlatformClass;
			} else {
				ljSystemType = ljPlatform;
			}

		} else {
			console.error('Running Kipling on Un-supported System Platform');
		}
		return ljSystemType;
	};
	this.getInfoCache = function() {
		return self.infoCache;
	};

	var isDefined = function(ele) {
		if(typeof(ele) !== 'undefined') {
			return true;
		} else {
			return false;
		}
	};

	this.upgradeLinkTemplate = handlebars.compile(
		'<tr id="{{safe_name}}" class="lvm_upgradeLinkljVersionNumbers">' +
			'<td class="ljVersionNumbers lvm_versionName">{{name}}</td>' +
			'<td class="ljVersionNumbers lvm_versionLink">' +
				'<button ' +
					'class="upgradeButton btn btn-link" ' +
					'href="{{upgradeLink}}" ' +
					'lvmVersionName="{{name}}"' +
					'lvmVersionType="{{versionType}}"' +
					'lvmVersionInfo="{{versionInfo}}"' +
					'lvmUpgradeType="{{upgrade_type}}"' +
					'title="Click to Download and Install, ' +
						'{{name}}: {{versionType}}, {{versionInfo}}"' +
					'>Download' +
				'</button>' +
			'</td>' +
		'</tr>'
	);
	this.controls = {};
	this.initializeLVM = function(pageElements) {
		// Save the versionNumbers id and element
		var versionNumbersID = '#' + pageElements.versionNumbersID;
		self.controls.versionNumbersID = versionNumbersID;
		self.controls.versionNumbersEl = $(versionNumbersID);

		// Save the showLinksButton id and element
		var showLinksButtonID = '#' + pageElements.showLinksButtonID;
		self.controls.showLinksID = showLinksButtonID;
		self.controls.showLinksEl = $(versionNumbersID +' '+ showLinksButtonID);

		// Save the upgradeLinks id and element
		var upgradeLinksID = '#' + pageElements.upgradeLinksID;
		self.controls.upgradeLinksID = pageElements.upgradeLinksID;
		self.controls.upgradeLinksEl = $(upgradeLinksID);

		// Save the linksList id and element
		var linksListID = '#' + pageElements.linksListID;
		self.controls.linksListID = pageElements.linksListID;
		self.controls.linksListEl = $(upgradeLinksID +' '+ linksListID);

		// Save the hideLinksButton id and element
		var hideLinksButtonID = '#' + pageElements.hideLinksButtonID;
		self.controls.hideLinksID = pageElements.hideLinksButtonID;
		self.controls.hideLinksEl = $(upgradeLinksID +' '+ hideLinksButtonID);

		// Unbind button listeners
		self.controls.showLinksEl.unbind();
		self.controls.hideLinksEl.unbind();

		// Bind new listeners
		self.controls.showLinksEl.bind('click', function() {
			self.controls.versionNumbersEl.hide();
			self.controls.upgradeLinksEl.show();
		});
		self.controls.hideLinksEl.bind('click', function() {
			self.controls.upgradeLinksEl.hide();
			self.controls.versionNumbersEl.show();
		});

		//--------------- Populate list of upgrade links -----------------------
		// Clear previous elements from list
		self.controls.linksListEl.html('');

		var initializeLVMListing = function() {
			var upgradeLinks = [];
			var linksStr = '';

			// Function to help discover what isn't undefined & prevent errors.
			var isReal = function(objA, objB, objC) {
				var retVar = typeof(objA) !== 'undefined';
				retVar &= typeof(objB) !== 'undefined';
				retVar &= typeof(objC) !== 'undefined';
				return retVar;
			};
			// Function to capitalize first letter of string.
			var formatUpgradeName = function(upgradeName) {
				var retStr = upgradeName.substring(0, 1).toUpperCase();
				retStr += upgradeName.substring(1);
				return retStr;
			};
			// Function to parse & add to linkInfo object.
			var appendInfo = function(linkInfo) {
				var key = linkInfo.key;
				var splitDataA = key.split('_');
				var versionType = formatUpgradeName(splitDataA[0]);
				var splitDataB = splitDataA[1].split('-');
				var platformInfo = formatUpgradeName(splitDataB[0]);
				var versionInfo = splitDataB[1];

				// Add formatted info to the linkInfo object
				linkInfo.versionType = versionType;
				linkInfo.platformInfo = platformInfo;
				linkInfo.versionInfo = versionInfo;
				return linkInfo;
			};
			var clearHighlighting = function(ele) {
				var classNames = ['error','success','info','warning','lvm_version_error','lvm_version_warning'];
				classNames.forEach(function(className) {
					ele.removeClass(className);
				});
			};
			var showWarning = function(ele, statusEle) {
				statusEle.find('.lvm_update_icon').css({'top':'0'});
				clearHighlighting(ele);
				ele.addClass('lvm_version_warning');
				ele.attr('title', 'New beta version available');
			};
			var showError = function(ele, statusEle) {
				statusEle.find('.lvm_update_icon').css({'top':'0'});
				clearHighlighting(ele);
				ele.addClass('lvm_version_error');
				ele.attr('title', 'New version available');
			};
			// Save reference to info for shorter names
			var info = self.dataCache;

			// Check to make sure each link and data exists before adding it
			// Check and add Kipling info
			var kiplingEl;
			if (isReal(info.kipling, info.kipling.test, info.kipling.test[0])) {
				var k3Test = info.kipling.test[0];
				k3Test = appendInfo(k3Test);
				k3Test.name = "Kipling (Test)";
				k3Test.upgrade_type = "kipling";
				k3Test.safe_name = "kipling_test";

				if (k3Test.version > pageElements.kiplingVersion) {
					upgradeLinks.push(k3Test);
					kiplingEl =self.controls.versionNumbersEl.find('#kipling');
					showWarning(
						kiplingEl.find('.lvm_version'),
						kiplingEl.find('.lvm_status')
					);
				}
			}
			if (isReal(info.kipling, info.kipling.beta, info.kipling.beta[0])) {
				var k3Beta = info.kipling.beta[0];
				k3Beta = appendInfo(k3Beta);
				k3Beta.name = "Kipling (Beta)";
				k3Beta.upgrade_type = "kipling";
				k3Beta.safe_name = "kipling_beta";

				if (k3Beta.version > pageElements.kiplingVersion) {
					upgradeLinks.push(k3Beta);
					kiplingEl =self.controls.versionNumbersEl.find('#kipling');
					showWarning(
						kiplingEl.find('.lvm_version'),
						kiplingEl.find('.lvm_status')
					);
				}
			}
			if (isReal(info.kipling, info.kipling.current, info.kipling.current[0])) {
				var k3Current = info.kipling.current[0];
				k3Current = appendInfo(k3Current);
				k3Current.name = "Kipling";
				k3Current.upgrade_type = "kipling";
				k3Current.safe_name = "kipling_current";
				if (k3Current.version > pageElements.kiplingVersion) {
					upgradeLinks.push(k3Current);
					kiplingEl =self.controls.versionNumbersEl.find('#kipling');
					showError(
						kiplingEl.find('.lvm_version'),
						kiplingEl.find('.lvm_status')
					);
				}
			}

			// Check and add LJM info
			if (isReal(info.ljm, info.ljm.current, info.ljm.current[0])) {
				var ljm = info.ljm.current[0];
				ljm = appendInfo(ljm);
				ljm.name = "LJM";
				ljm.upgrade_type = "ljm";
				ljm.safe_name = "ljm";

				if (ljm.version > pageElements.ljmVersion) {
					upgradeLinks.push(ljm);

					var ljmElement = self.controls.versionNumbersEl.find('#ljm');
					showError(
						ljmElement.find('.lvm_version'),
						ljmElement.find('.lvm_status')
					);
				}
			}

			// Build linksStr which will get inserted into the linksList element
			upgradeLinks.forEach(function(linkInfo) {
				linksStr += self.upgradeLinkTemplate(linkInfo);
			});

			// Insert HTML string into the list element
			self.controls.linksListEl.html(linksStr);

			// Show button allowing user to navigate to upgrade links window
			if (upgradeLinks.length > 0) {
				self.controls.showLinksEl.fadeIn();
			}

			// Connect upgrade button listeners
			var buttons = self.controls.linksListEl.find('.upgradeButton');
			buttons.unbind();
			buttons.bind('click',function(event) {
				console.log('LVM Clicked!',event.toElement);
				var href = event.toElement.attributes.href.value;

				var fileName;
				var fileType;
				var fileInfo;
				var fileUpgradeType;
				try {
					fileName = event.toElement.attributes.lvmVersionName.value;
					fileType = event.toElement.attributes.lvmVersionType.value;
					fileInfo = event.toElement.attributes.lvmVersionInfo.value;
					fileUpgradeType = event.toElement.attributes.lvmUpgradeType.value;
				} catch (err) {
					console.log('LJM Error... getting file attributes', fileName, fileType, fileInfo);
				}
				console.log('LJM Success... file attributes:', fileName, fileType, fileInfo);
				FILE_DOWNLOADER_UTILITY.downloadAndExtractFile(href)
				.then(function(info) {
					console.log('LVM Download Success!',info);
					info.lvm = {};
					info.lvm.fileName = fileName;
					info.lvm.fileType = fileType;
					info.lvm.fileInfo = fileInfo;
					info.lvm.fileUpgradeType = fileUpgradeType;

					self.beginFileUpgrade(info)
					.then(function(info) {
						console.log('LVM Upgrade Success!',info);
					}, function(err) {
						console.log('LVM Upgrade Failure', err);
					}, function(err) {
						console.log('LVM Upgrade Syntax Error',err);
					});
				}, function(error) {
					console.log('LVM Download Error :(',error);
				});
			});
		};
		// Check to see if links were acquired appropriately
		if(!self.isIssue()) {
			initializeLVMListing();
		} else {
			// Perform fail-operations
			self.getAllVersions()
			.then(function(data) {
				initializeLVMListing();
				if(self.isIssue()) {
					var issue =self.getIssue();
					console.warn('!! - LVM Warming',issue);
				}
			}, function(err) {
				if (self.isIssue()) {
					var issue =self.getIssue();
					console.error('!! - LVM Error',issue);
				}
			});
		}
	};

	this.beginFileUpgrade = function(info) {
		var defered = q.defer();
		try {
			var systemType = self.getLabjackSystemType();
			console.log('in beginFileUpgrade', systemType);


			// Make sure gui has been required.
			if(typeof(gui) === 'undefined') {
				gui = require('nw.gui');
			}
			var executionProgram = '';
			var rebootScriptPath = '';
			var rebootScriptName = '';
			var currentExecFilePath = '';
			var currentExecPath = '';
			var scriptArgs = [];
			var execStr = '';
			var formatPath = function(newPath) {
				newPath = newPath.replace(/\(/g,'\\(');
				newPath = newPath.replace(/\)/g,'\\)');
				// newPath = '"' + newPath + '"';
				return newPath;
			};
			var downloadedFilePath = info.extractedFolder;

			var executeScript = false;
			var quitKipling = false;
			var runScript = false;
			

			if (systemType === 'mac') {
				console.log('systemType is mac, preparing args');
				executionProgram = 'bash';
				
				// Get the name of the application that was downloaded
				var downloadedAppName = 'Kipling.app';
				var downloadedFiles = fs.readdirSync(downloadedFilePath);
				downloadedFiles.forEach(function(downloadedFile) {
					if (downloadedFile.search('.app') > 0) {
						downloadedAppName = downloadedFile;
					}
				});

				// Build the path where the script can be found
				rebootScriptPath = downloadedFilePath + downloadedAppName;
				rebootScriptPath += '/Contents/Resources/update_scripts';

				// Define the name of the script to be executed
				rebootScriptName = 'mac_reboot.sh';

				// Figure out where Kipling is currently being executed
				// currentExecFilePath = process.execPath.split(' ')[0].split(/\.*\/Contents/g)[0];
				currentExecPath = path.dirname(process.execPath.split(' ')[0].split(/\.*\.app/g)[0]);
				
				// Add arguments to the script execution
				scriptArgs.push(currentExecPath);		// The current path in which kipling is executing out of
				scriptArgs.push(downloadedFilePath);	// The path where the files needed to be coppied from exist
				scriptArgs.push(downloadedAppName);		// The name of the program to "open"
				scriptArgs.push(rebootScriptPath);		// The path of the script being executed

				executeScript = true;
				quitKipling = true;
				runScript = true;
			} else {
				console.warn('systemType not supported', systemType);
				// TODO: add support for systemType 'win', 'linux32', and 'linux64'		
			}
			
			if(executeScript) {
				console.log('preparing execStr for execution');
				// Build basic execution info
				execStr += executionProgram + ' ';

				// build the full file path of the script to execute
				var scriptPath = rebootScriptPath;
				scriptPath += path.sep;
				scriptPath += rebootScriptName;
				console.log('scriptPath', scriptPath, scriptArgs);
				console.log('does script exist?', fs.existsSync(scriptPath));

				// Append the script's path to the execution string
				execStr += scriptPath;

				// Append the any arguments to the string to be executed
				scriptArgs.forEach(function(scriptArg) {
					execStr += ' ' + scriptArg;
				});

				execStr = formatPath(execStr);
				console.log('LVM execStr', execStr);
				if(runScript) {
					var bashObj = child_process.exec(execStr);
				}
				console.log('Executed Script');
				if(quitKipling) {
					gui.App.quit();
				}
			} else {
				console.warn('LVM Upgrade Strategy Not Implemented For', systemType, info);
			}
		} catch (err) {
			console.log('LVM Upgrade non-q syntax error', err);
		}
		defered.resolve(info);
		return defered.promise;
	};
	var self = this;
}
var LABJACK_VERSION_MANAGER = new labjackVersionManager();

LABJACK_VERSION_MANAGER.getAllVersions();
LABJACK_VERSION_MANAGER.waitForData()
.then(function(data) {
	console.log('LVM dataCache:',LABJACK_VERSION_MANAGER.dataCache);
	console.log('LJM current versions',LABJACK_VERSION_MANAGER.dataCache.kipling);
	if(LABJACK_VERSION_MANAGER.isIssue()) {
		var issue =LABJACK_VERSION_MANAGER.getIssue();
		console.warn('LVM Warming',issue);
	}
},function(err) {
	if(LABJACK_VERSION_MANAGER.isIssue()) {
		var issue =LABJACK_VERSION_MANAGER.getIssue();
		console.error('LVM Error',issue);
	}
});

if(typeof(exports) !== 'undefined') {
	exports.lvm = LABJACK_VERSION_MANAGER;
}

// For Testing....
// var LVM = LABJACK_VERSION_MANAGER;

// LVM.getLJMVersions()
// .then(LVM.getKiplingVersions)
// .then(LVM.getLJMWrapperVersions)
// .then(LVM.getT7FirmwareVersions)
// .then(LVM.getDigitFirmwareVersions)

// .then(LVM.getKiplingVersions)
// .then(LVM.getLJMVersions)
// .then(LVM.getLJMWrapperVersions)
// .then(LVM.getT7FirmwareVersions)
// .then(LVM.getDigitFirmwareVersions)
// LVM.getAllVersions()


/*
var vm = require('./helper_scripts/version_manager')

 */
