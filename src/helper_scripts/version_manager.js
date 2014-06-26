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
		"current_win":		"https://s3.amazonaws.com/ljrob_fs/kipling_win.exe",
		"beta_win":			"https://s3.amazonaws.com/ljrob_fs/kipling_win_beta.exe",

		"current_mac":		"https://s3.amazonaws.com/ljrob_fs/kipling_mac.zip",
		"beta_mac":			"https://s3.amazonaws.com/ljrob_fs/kipling_mac_beta.zip",

		"current_linux32":	"https://s3.amazonaws.com/ljrob_fs/kipling_lin32.zip",
		"beta_linux32":		"https://s3.amazonaws.com/ljrob_fs/kipling_lin32_beta.zip",

		"current_linux64":	"https://s3.amazonaws.com/ljrob_fs/kipling_lin64.zip",
		"beta_linux64":		"https://s3.amazonaws.com/ljrob_fs/kipling_lin64_beta.zip"
	};

	// define dict object with various urls in it
	this.urlDict = {
		"kipling": {
			"type":"kipling",
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
			"urls":[
				{"url": "http://labjack.com/support/ljma", "type": "current_win"},
				{"url": "http://labjack.com/support/ljm", "type": "current_mac"},
				{"url": "http://labjack.com/support/ljm", "type": "current_linux32"},
				{"url": "http://labjack.com/support/ljm", "type": "current_linux64"}
			]
		},
		"ljm_wrapper": {
			"type":"ljm_wrapper",
			"urls":[
				{"url": "http://files.labjack.com/versions/ljrob/K3/stable/ljm_wrapper.txt", "type": "current"},
				{"url": "http://files.labjack.com/versions/ljrob/K3/beta/ljm_wrapper.txt", "type": "beta"}
			]
		},
		"t7": {
			"type":"t7FirmwarePage",
			"urls":[
				{"url": "http://labjack.com/support/firmware/t7", "type": "current"},
				{"url": "http://labjack.com/support/firmware/t7/beta", "type": "beta"},
				{"url": "http://labjack.com/support/firmware/t7/old", "type": "old"},
			]
		},
		"digit": {
			"type":"digitFirmwarePage",
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
	this.isDataComplete = false;

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
				request(
					url,
					function (error, response, body) {
						if (error) {
              // Report a TCP Level error likely means computer is not
              // connected to the internet.
							callback({
								"num": -1,
								"str": "TCP level error" + error.toString(),
								"quit": true
							});
						} else if (response.statusCode != 200) {
							// Report a http error, likely is 404, page not found.
							var message = "Got Code: ";
							message += response.statusCode.toString();
							message += " loading: " + url;
							callback({
								"num": response.statusCode,
								"str": message, 
								"quit": false
							});
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
		self.infoCache[name] = {};
		infos.forEach(function(info) {
			self.infoCache[name][info.type] = [];
			var data = {
				upgradeLink: info.upgradeLink,
				version: info.version,
				type: info.type,
				key: info.key
			};
			self.infoCache[name][info.type].push(data);
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
								self.infoCache.warning = true;
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
								self.infoCache.warning = true;
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
		self.infoCache.warning = false;
		self.isDataComplete = false;
		var errorFunc = function(err) {
			var errDefered = q.defer();
			if (err) {
				if(err.quit) {
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
		LVM.getLJMVersions()
		.then(LVM.getKiplingVersions, errorFunc)
		.then(LVM.getLJMWrapperVersions, errorFunc)
		.then(LVM.getT7FirmwareVersions, errorFunc)
		.then(LVM.getDigitFirmwareVersions, errorFunc)
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
	this.getInfoCache = function() {
		return self.infoCache;
	};
	var self = this;
}
var LABJACK_VERSION_MANAGER = new labjackVersionManager();

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
// .then(function() {
// 	// LVM.pBuf();
// 	console.log('Info',LVM.infoCache);
// },function(err) {
// 	console.log('Failed',err);
// });

/*
var vm = require('./helper_scripts/version_manager')

 */
