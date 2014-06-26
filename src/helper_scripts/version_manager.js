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
	this.kiplingLinks = {
		"current_win": 		"https://s3.amazonaws.com/ljrob_fs/kipling_win.exe",
		"beta_win": 		"https://s3.amazonaws.com/ljrob_fs/kipling_win_beta.exe",

		"current_mac": 		"https://s3.amazonaws.com/ljrob_fs/kipling_mac.zip",
		"beta_mac": 		"https://s3.amazonaws.com/ljrob_fs/kipling_mac_beta.zip",

		"current_linux32": 	"https://s3.amazonaws.com/ljrob_fs/kipling_lin32.zip",
		"beta_linux32": 	"https://s3.amazonaws.com/ljrob_fs/kipling_lin32_beta.zip",

		"current_linux64": 	"https://s3.amazonaws.com/ljrob_fs/kipling_lin64.zip",
		"beta_linux64": 	"https://s3.amazonaws.com/ljrob_fs/kipling_lin64_beta.zip"
	}

	// define dict object with various urls in it
	this.urlDict = {
		"kipling": {
			"type":"raw",
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
				{"url": "http://labjack.com/support/ljm", "type": "current"}
			]
		},
		"ljm_wrapper": {
			"type":"raw",
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
		raw: function(listingArray, pageData, urlInfo, type) {
			if(type === 'kipling')
			listingArray.push({"upgradeLink":"","version":pageData,"type":urlInfo.type});
			return;
		},
		ljmDownloadsPage: function(listingArray, pageData, urlInfo, type) {
			listingArray.push("ljmDownloadsPage");
			return;
		},
		t7FirmwarePage: function(listingArray, pageData, urlInfo, type) {
			listingArray.push("t7FirmwarePage");
			return;
		},
		digitFirmwarePage: function(listingArray, pageData, urlInfo, type) {
			listingArray.push("digitFirmwarePage");
			return;
		},
	};
	this.pageBuf = dict();

	/**
	 * Function that prints out all urls to console.log
	**/
	this.pBuf = function() {
		console.log('Num Pages Cached',self.pageBuf.size);
		self.pageBuf.forEach(function(val,key){
			console.log('Buffered URLs',key);
		});
	}
	this.buildQuery = function(savedData, strategy, urlInfo, type) {
		var dataQuery = function(callback) {
			var url = urlInfo.url;
			if(!self.pageBuf.has(url)) {
				request(
					url,
					function (error, response, body) {
						if (error || (response.statusCode != 200)) {
							console.log('request Error',url,error,response.statusCode);
							callback();
						} else {
							self.pageBuf.set(url,body);
							strategy(savedData, body, urlInfo, type);
							callback();
						}
					}
				);
			} else {
				console.log('Using Cached Page');
				var pageData = self.pageBuf.get(url);
				strategy(savedData, pageData, urlInfo, type);
				callback();
			}
		}
		return dataQuery;
	}
	this.queryForVersions = function(type) {
		var defered = q.defer();
		var info = self.urlDict[type];
		var queriedData = [];

		if(typeof(info) !== 'undefined') {
			// Get the stratigy function
			var strategyType = info.type;
			var strategy = self.strategies[strategyType];

			if(typeof(strategy) !== 'undefined') {
				// build an array of querys that need to be made to collect data
				var querys = info.urls.map(function(urlInfo) {
					return self.buildQuery(queriedData, strategy, urlInfo, type);
				});
				async.each(querys,
					function(query, callback) {
						query(callback);
					}, function(err) {
						console.log('Finished Processing Data');
						defered.resolve(queriedData);
					});
				console.log('Num Querys:',querys.length);
			} else {
				// if the strategies object is undefined report an error
				defered.reject('invalid strategy');
			}
		} else {
			// if the info object is undefined report an error
			defered.reject('invalid type');
		}
		return defered.promise;
	}



	this.getKiplingVersions = function() {
		var defered = q.defer();
		self.queryForVersions('kipling')
		.then(function(data) {
			console.log('kipling Data',data);
			defered.resolve(data);
		},defered.reject);
		return defered.promise;
	};
	this.getLJMVersions = function() {
		var defered = q.defer();
		self.queryForVersions('ljm')
		.then(function(data) {
			console.log('ljm Data',data);
			defered.resolve(data);
		},defered.reject);
		return defered.promise;
	};
	this.getLJMWrapperVersions = function() {
		var defered = q.defer();
		self.queryForVersions('ljm_wrapper')
		.then(function(data) {
			console.log('ljm_wrapper Data',data);
			defered.resolve(data);
		},defered.reject);
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
		.then(function(data) {
			console.log('T7 Data',data);
			defered.resolve(data);
		},defered.reject);
		return defered.promise;
	};
	this.getDigitFirmwareVersions = function() {
		var defered = q.defer();
		self.queryForVersions('digit')
		.then(function(data) {
			console.log('Digit Data',data);
			defered.resolve(data);
		},defered.reject);
		return defered.promise;
	}

	this.clearPageCache = function() {
		self.pageBuf.clear();
	}
	var self = this;
}
var LABJACK_VERSION_MANAGER = new labjackVersionManager()

if(typeof(exports) !== 'undefined') {
	exports.vm = LABJACK_VERSION_MANAGER;
}

// For Testing....
var LVM = LABJACK_VERSION_MANAGER;

LVM.getKiplingVersions()
.then(LVM.getLJMVersions)
.then(LVM.getLJMWrapperVersions)
.then(LVM.getT7FirmwareVersions)
.then(LVM.getDigitFirmwareVersions)

.then(LVM.getKiplingVersions)
.then(LVM.getLJMVersions)
.then(LVM.getLJMWrapperVersions)
.then(LVM.getT7FirmwareVersions)
.then(LVM.getDigitFirmwareVersions)
.then(function() {
	LVM.pBuf();
})

/*
var vm = require('./helper_scripts/version_manager')

 */
