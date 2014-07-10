/**
 * version_manager.js for LabJack Switchboard.  Provides Kipling with the ability
 * to query for various versions of LabJack software versions, firmeware 
 * versions, and drivers
 *
 * @author Chris Johnson (LabJack, 2014)
**/

var q = require('q');
var request = require('request');
var async = require('async');
var dict = require('dict');

function labjackVersionManager() {
	this.kiplingUpdateLinks = {
		"current_win":		"https://s3.amazonaws.com/ljrob/win32/kipling_win.exe",
		"beta_win":			"https://s3.amazonaws.com/ljrob/win32/kipling_win_beta.exe",

		"current_mac":		"https://s3.amazonaws.com/ljrob/mac/kipling_mac.zip",
		"beta_mac":			"https://s3.amazonaws.com/ljrob/mac/kipling_mac-test.zip",

		"current_linux32":	"https://s3.amazonaws.com/ljrob/lin32/kipling_lin32.zip",
		"beta_linux32":		"https://s3.amazonaws.com/ljrob/lin32/kipling_lin32_beta.zip",

		"current_linux64":	"https://s3.amazonaws.com/ljrob/lin64/kipling_lin64.zip",
		"beta_linux64":		"https://s3.amazonaws.com/ljrob/lin64/kipling_lin64_beta.zip"
	};

	// define dict object with various urls in it
	this.urlDict = {
		"kipling": {
			"type":"kipling",
			"platformDependent": true,
			"types": ['current','beta'],
			"urls":[
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_win"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_mac"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_linux32"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/kipling.txt", "type": "current_linux64"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_win"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_mac"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_linux32"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/kipling.txt", "type": "beta_linux64"}
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
			if (platform === 'win') {
				LJM_REGEX = /href=\".*LabJackMUpdate-([\d]\.[\d]+)\.exe(?=\"\stype)/g;
			} else if (platform === 'mac') {
				LJM_REGEX = /href=\".*LabJackM-([\d]\.[\d]+)\-Mac\.tgz(?=\"\stype)/g;
			} else if (platform === 'linux32') {
				LJM_REGEX = /href=\".*LabJackM-([\d]\.[\d]+)\-Ubuntu.*-i386.*.gz(?=\"\stype)/g;
			} else if (platform === 'linux64') {
				LJM_REGEX = /href=\".*LabJackM-([\d]\.[\d]+)\-Ubuntu.*-x86\_64.*.gz(?=\"\stype)/g;
			}
			var match = LJM_REGEX.exec(pageData);
			var targetURL = match[0].replace(/href\=\"/g, '');
			var version = match[1];
			listingArray.push({
					"upgradeLink":targetURL,
					"version":version,
					"type":urlInfo.type,
					"key":urlInfo.type + '-' + version
				});
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
				}
				request(
					options,
					function (error, response, body) {
						if (error) {
							// Report a TCP Level error likely means computer is not
							// connected to the internet.
							var message = '';
							if (error.code === 'ENOTFOUND') {
								message = "TCP Error, computer not connected to network: "
							} else if(error.code === 'ETIMEDOUT') {
								message = "TCP Error, no internet connection: "
							} else {
								message = "Unknown TCP Error: "
							}
							var err = {
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
							var message = "Got Code: ";
							message += response.statusCode.toString();
							message += "; loading: " + url;
							message += "; name: " + name;
							message += "; type: " + urlInfo.type;
							var err = {
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
		
		console.log('name',name);
		console.log('is dependent',platformDependent);
		console.log('systemType',systemType);
		
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
							if(typeof(err) !== 'undefined') {
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
							if(typeof(err) !== 'undefined') {
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
	}
	this.waitForData = function() {
		var defered = q.defer();
		var checkInterval = 100;
		var iteration = 0;
		var maxCheck = 100;

		// Define a function that can delays & re-calls itself until it errors
		// out or resolves to the defered q object.
		var isComplete = function() {
			return !(self.isDataComplete || self.isError);
		}
		var finishFunc = function() {
			console.log('version_manager.js - Num Iterations',iteration);
			if(self.isError) {
				defered.reject(self.errorInfo);
			} else {
				defered.resolve(self.infoCache);
			}
		}
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
		}

		// if the data isn't complete then 
		if(isComplete()) {
			setTimeout(waitFunc,checkInterval);
		} else {
			finishFunc();
		}
		return defered.promise;
	}
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
	}
	this.getInfoCache = function() {
		return self.infoCache;
	};
	var self = this;
}
var LABJACK_VERSION_MANAGER = new labjackVersionManager();

LABJACK_VERSION_MANAGER.getAllVersions()
LABJACK_VERSION_MANAGER.waitForData()
.then(function(data) {
	console.log('dataCache',LABJACK_VERSION_MANAGER.dataCache);
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
