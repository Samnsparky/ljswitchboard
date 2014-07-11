/**
 * file_downloader.js for LabJack Switchboard.  Provides Kipling with the ability
 * to download files to a computer's downloads directory and provide the user
 * with feedback as to when that file is completed, as well as the downloads 
 * intermediate progress (with speed, time remaining, progress etc.).
 *
 * This library is meant to be included on startup of k3 and is name-space safe.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

// Require external npm libraries
var q = require('q');
var request = require('request');
var async = require('async');
var dict = require('dict');
var statusBar = require ('status-bar');
var handlebars = require('handlebars');

// Require nodejs internal libraries to perform get requests.
var http = require('http');
var https = require('https');

// Require remaining nodejs libraries
var path = require('path');
var fs = require('fs');


/**
 * define an object in which all variables will be defined in to help reduce
 * name space clutter.
 * @return {[type]} [description]
 */
function fileDownloaderUtility() {
	this.isInitialized = false;
	this.isDebugMode = (typeof($) === 'undefined');

	this.htmlID = '';
	this.htmlEl = null;
	this.downloadID = '';
	this.downloadEl = null;
	this.closeID = '';
	this.closeEl = null;

	var dlTemplate = '' +
	'<div id="{{newID}}">' +
	'<div id="lvmProgressBar" class="curProgressBar progress">' +
	'<div class="bar" style="width: 0%;"></div>' +
	'</div>' +
	'<table>' +
	'<tr>' +
	'<td>File Name:</td>' +
	'<td id="fileName" class="curFileName">{{fileName}}</td>' +
	'</tr>' +
	'<tr>' +
	'<td>Size:</td>' +
	'<td id="fileSize" class="curFileSize">{{fileSize}}</td>' +
	'</tr>' +
	'<tr>' +
	'<td>Speed:</td>' +
	'<td id="downloadSpeed" class="curDownloadSpeed"></td>' +
	'</tr>' +
	'<tr>' +
	'<td>Time Remaining:</td>' +
	'<td id="timeRemaining" class="curTimeRemaining"></td>' +
	'</tr>' +
	'</table>' +
	'<button id="showInFileButton" class="showInFileButton btn btn-mini btn-link">Show In Finder</button>' +
	'</div>';
	this.downloadTemplate = handlebars.compile(dlTemplate);

	this.setDebugMode = function(val) {
		if(val)
			self.isDebugMode = true;
		else
			self.isDebugMode = false;
	};
	var isDefined = function(obj) {
		if (typeof(obj) !== 'undefined') {
			return true;
		} else {
			return false;
		}
	};

	var getWindowsDownloadsPath = function() {
		var userDirectory = process.env.HOMEPATH;
		if (isDefined(userDirectory)) {
			var downloadsDir = userDirectory + '\\Downloads';
			if (fs.existsSync(downloadsDir)) {
				return downloadsDir;
			}
			downloadsDir = userDirectory + '\\My Documents\\Downloads';
			if (fs.existsSync(downloadsDir)) {
				return downloadsDir;
			}
		}
		return '';
	};
	var getNixDownloadsPath = function() {
		var userDirectory = process.env.HOME;
		if (isDefined(userDirectory)) {
			var downloadsDir = userDirectory + '/Downloads';
			if (fs.existsSync(downloadsDir)) {
				return downloadsDir;
			}
		}
		return '';
	};
	var windowsPath = getWindowsDownloadsPath();
	var nixPath = getNixDownloadsPath();
	var defaultDownloadDirectory = {
		'linux': nixPath,
		'linux2': nixPath,
		'sunos': nixPath,
		'solaris': nixPath,
		'freebsd': nixPath,
		'openbsd': nixPath,
		'darwin': nixPath,
		'mac': nixPath,
		'win32': windowsPath,
	}[process.platform];
	var formatSize = function(numBytes) {
		var kb = Math.pow(2,10);
		var mb = Math.pow(2,20);
		var gb = Math.pow(2,30);
		if (numBytes < kb) {
			return numBytes.toString() + 'Bytes';
		} else if (numBytes < mb) {
			return (numBytes/kb).toPrecision(2) + 'KB';
		} else if (numBytes < gb) {
			return (numBytes/mb).toPrecision(2) + 'MB';
		} else {
			return (numBytes/gb).toPrecision(2) + 'GB';
		}
	};
	var onStartDefaultFunc = function(info) {
		var pageElements = null;
		if(self.isInitialized) {
			if(isDefined($)) {
				console.log('Started Download',info);
				if(self.htmlEl.css('display') === 'none') {
					self.htmlEl.slideDown();
				}
				var oldText = self.downloadEl.html();
				var newText = self.downloadTemplate(info);
				
				// Add new download to download list
				self.downloadEl.html(oldText + newText);

				// Get new download element reference
				var newEl = self.htmlEl.find('#'+info.newID);

				// Attach "show in finder" listener
				var showInFileButton = newEl.find('.'+'showInFileButton');
				showInFileButton.unbind();
				showInFileButton.bind('click',function(event) {
					if(!isDefined(gui)) {
						gui = require('gui');
					}
					gui.Shell.showItemInFolder(info.filePath);
				});

				pageElements = {};
				pageElements.activeDownload = newEl;
				pageElements.progressBar = newEl.find('.'+'curProgressBar .bar');
				pageElements.fileSize = newEl.find('.'+'curFileSize');
				pageElements.downloadSpeed = newEl.find('.'+'curDownloadSpeed');
				pageElements.timeRemaining = newEl.find('.'+'curTimeRemaining');
				pageElements.showInFileButton = showInFileButton;
				self.pageElements = pageElements;
			}
		} else {
			console.log('Download Started',info);
		}
		return pageElements;
	};
	var onUpdateDefaultFunc = function(stats, statusBar, pageElements) {
		var stdOutWrite = function() {
			process.stdout.write (
				path.basename (url) + " " +
				statusBar.format.storage (stats.currentSize) + " " +
				statusBar.format.speed (stats.speed) + " " +
				statusBar.format.time (stats.elapsedTime) + " " +
				statusBar.format.time (stats.remainingTime) + " [" +
				statusBar.format.progressBar (stats.percentage) + "] " +
				statusBar.format.percentage (stats.percentage)
			);
			process.stdout.cursorTo (0);
		};
		if(self.isInitialized) {
			if(isDefined($)) {
				console.log('Update Func...',stats.currentSize,stats.remainingTime);
				pageElements.downloadSpeed.text(
					statusBar.format.speed(stats.speed)
				);
				pageElements.progressBar.width(
					(stats.percentage*100).toString()+'%'
				);
				pageElements.timeRemaining.text(
					statusBar.format.time(stats.remainingTime)
				);
			} else {
				stdOutWrite();
			}
		} else {
			if(self.isDebugMode) {
				stdOutWrite();
			}
		}
	};
	

	this.downloadFile = function(url, listeners) {
		var downloadFileName = url.split('/')[url.split('/').length-1];
		var defered = q.defer();
		var onStart = onStartDefaultFunc;
		var onUpdate = onUpdateDefaultFunc;
		if(isDefined(listeners)) {
			if(isDefined(listeners.onStart)) {
				onStart = listeners.onStart;
			}
			if(isDefined(listeners.onUpdate)) {
				onUpdate = listeners.onUpdate;
			}
		}
		var bar;

		var reqLib;
		if (url.search('http://') !== -1) {
			reqLib = http;
		} else if (url.search('https://') !== -1) {
			reqLib = https;
		} else {
			console.error('Bad Url, http/https not found');
			defered.reject();
		}

		
		var handleResponse = function(res) {
			var startFile = true;
			var bodyNum = 0;
			var body = '';
			var pageElements = null;

			var toMegabytes = function(numBytes) {
				return Number((body.length/Math.pow(2,20)).toPrecision(3));
			};
			var fileSize = res.headers["content-length"];

			try {
				bar = statusBar.create ({
					total: res.headers["content-length"]
				});

				bar.on ("render", function (stats){
					onUpdate(stats,bar,pageElements);
				});
				res.pipe (bar);
			} catch (err) {
				console.log('Error Encountered',err);
			}
			res.on('data', function (chunk) {
				bodyNum += 1;
				body += chunk;
			});
			res.on('end', function() {
				var megabytesDownloaded = toMegabytes(body.length);
				console.log('');
				console.log('Finished:',megabytesDownloaded,'MB',bodyNum);
				defered.resolve({fileName:uniqueFilePath,size:body.length,sizeMB:megabytesDownloaded});
			});


			var num = 1;
			var filePath = defaultDownloadDirectory + path.sep + downloadFileName;
			var uniqueFilePath = filePath;
			var newFileName = downloadFileName;
			while(fs.existsSync(uniqueFilePath)) {
				newFileName = '';
				var subStrs = downloadFileName.split('.');
				var i = 0;
				for(i = 0; i < (subStrs.length - 1); i++) {
					newFileName += subStrs[i];
				}
				newFileName += '(' + num.toString() + ').';
				newFileName += subStrs[subStrs.length-1];
				// uniqueFilePath = filePath + '(' + num.toString() + ')';
				uniqueFilePath = defaultDownloadDirectory + path.sep + newFileName;
				num += 1;
			}
			res.pipe(fs.createWriteStream(uniqueFilePath));
			var safeName = newFileName.replace(/\./g,'_');
			safeName = safeName.replace(/\s/g,'_');
			safeName = safeName.replace(/\(/g,'_');
			safeName = safeName.replace(/\)/g,'_');

			pageElements = onStart({
				fileName:newFileName,
				filePath:uniqueFilePath,
				fileSize:formatSize(fileSize),
				newID:safeName,
				statusCode:res.statusCode,
				headers:res.headers
			});
		};
		var handleRequest = function(res) {
			if (res.statusCode === 200) {
				handleResponse(res);
			} else {
				curRequest.end();
				curRequest.abort();
				defered.reject({
					// result:res,
					statusCode:res.statusCode
				});
			}
		};
		if(defaultDownloadDirectory !== '') {
			var curRequest = reqLib.get(url, handleRequest)
			.on ("error", function(error) {
				if (bar) bar.cancel ();
				defered.reject(error);
			});
			curRequest.setTimeout( 5000, function( ) {
				if (bar) bar.cancel ();
				console.error('file_downloader.js timeout');
				curRequest.end();
				curRequest.abort();
				defered.reject('timeout-err');
			});
		} else {
			var errStr = 'defaultDownloadDirectory is blank';
			console.error(errStr);
			defered.reject(errStr);
		}
		return defered.promise;
	};

	// Define functions so utility can automaticaly configure/control the 
	// downloads bar of K3.
	this.initializeFileDownloader = function(id, locationID, closeID) {
		self.htmlID = id;
		self.downloadID = locationID;
		self.closeID = closeID;
		if(isDefined($)) {
			self.htmlEl = $('#' + id);
			self.downloadEl = $('#' + id + ' #' + locationID);
			self.closeEl = $('#' + id + ' #' + closeID);
			self.closeEl.unbind();
			self.closeEl.bind('click',closeListener);
		}
		self.isInitialized = true;
	};
	var closeListener = function(event) {
		console.log('file_downloader.js closeButton');
		self.htmlEl.slideUp(function() {
			self.downloadEl.html('');
		});
	};
	
	// Define self object as 'this' to mimic python
	var self = this;
}

// Initialize object and make object available in k3's namespace.
var FILE_DOWNLOADER_UTILITY = new fileDownloaderUtility();

if(FILE_DOWNLOADER_UTILITY.isDebugMode) {
	// var url = "https://s3.amazonaws.com/ljrob/mac/kipling_mac-test.zip";
	var url = "http://nodejs.org/dist/latest/node.exe";
	// var url = "http://labjack.com/robots.txt";

	FILE_DOWNLOADER_UTILITY.setDebugMode(true);
	FILE_DOWNLOADER_UTILITY.downloadFile(url)
	.then(function(info) {
		console.log('success!',info);
	}, function(error) {
		console.log('Error :(',error);
	});
} else {
	console.log('file_downloader.js runing in html mode');
}



