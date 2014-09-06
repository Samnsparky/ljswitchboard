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
var admZip = require('adm-zip');
var tarball = require('tarball-extract')

// Require nodejs internal libraries to perform get requests.
var http = require('http');
var https = require('https');

// Require remaining nodejs libraries
var path = require('path');
var fs = require('fs');

// Require ljswitchboard libs
var ljsError;
try {
    ljsError = require('./helper_scripts/error_handler');
} catch (err) {
    ljsError = require('./error_handler');
}


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

	var fileBrowserButtonText = {
		'linux': 'Show in file browser',
		'linux2': 'Show in file browser',
		'sunos': 'Show in file browser',
		'solaris': 'Show in file browser',
		'freebsd': 'Show in file browser',
		'openbsd': 'Show in file browser',
		'darwin': 'Show in file browser',
		'mac': 'Show in finder',
		'win32': 'Show in folder'
	}[process.platform];

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
		'<button id="showInFileButton" class="showInFileButton btn btn-mini btn-link">' +
			fileBrowserButtonText +
		'</button>' +
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
		var userDrive = process.env.HOMEDRIVE;
		var userDirectory = process.env.HOMEPATH;
		if (isDefined(userDrive) && isDefined(userDirectory)) {
			var downloadsDir = userDrive + userDirectory + '\\Downloads';
			if (fs.existsSync(downloadsDir)) {
				return downloadsDir;
			}
			downloadsDir = userDrive + userDirectory + '\\My Documents\\Downloads';
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
					console.log('Tried to open file in finder:',info.filePath);
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
		var stdOutWrite;
		var defineSTDOutWrite = false;
		if(self.isInitialized) {
			if(isDefined($)) {
			} else {
				defineSTDOutWrite = true;
			}
		} else {
			defineSTDOutWrite = true;
		}
		if(defineSTDOutWrite) {
			stdOutWrite = function() {
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
		} else {
			stdOutWrite = function(){};
		}
		if(self.isInitialized) {
			if(isDefined($)) {
				console.log('FD: onUpdateDefaultFunc time remaining (sec)',stats.remainingTime);
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

		// Figure out a unique file path for the new file to be named
		var num = 1;
		console.log('defaultDownloadDirectory',defaultDownloadDirectory);
		console.log('process.platform',process.platform);
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
			newFileName += '_' + num.toString() + '.';
			newFileName += subStrs[subStrs.length-1];
			// uniqueFilePath = filePath + '(' + num.toString() + ')';
			uniqueFilePath = defaultDownloadDirectory + path.sep + newFileName;
			num += 1;
		}
		console.log('uniqueFilePath',uniqueFilePath);
		var fileStream = null;
		
		var safeName = newFileName.replace(/\./g,'_');
		safeName = safeName.replace(/\s/g,'_');
		safeName = safeName.replace(/\(/g,'_');
		safeName = safeName.replace(/\)/g,'_');

		var requestAborted = false;

		/**
		 * Function that handles the file download stuff.
		 */
		var handleResponse = function(res) {
			var startFile = true;
			var bodyNum = 0;
			var bodyLength = 0;
			var pageElements = null;
			if(fileStream) {
				res.pipe(fileStream);
			} else {
				console.error('HERE!!! WTF!!');
			}
			var toMegabytes = function(numBytes) {
				return Number((bodyLength/Math.pow(2,20)).toPrecision(3));
			};
			var fileSize = res.headers["content-length"];

			try {
				bar = statusBar.create ({
					total: res.headers["content-length"]
				});

				bar.on ("render", function (stats){
					try {
						onUpdate(stats,bar,pageElements);
					} catch (err) {
						console.error('FD: Error rendering bar',err);
					}
				});
				res.pipe (bar);
			} catch (err) {
				console.log('Error Encountered',err);
			}
			res.on('data', function (chunk) {
				bodyNum += 1;
				bodyLength += chunk.length;
			});
			var fileStreamFinished = false;
			var downloadFinished = false;

			var returnToCaller = function() {
				if(fileStreamFinished && downloadFinished) {
					var megabytesDownloaded = toMegabytes(bodyLength);
					fileStream.close(function() { // close() is async
						try {
							defered.resolve(
								{
									fileName:uniqueFilePath,
									size:bodyLength,
									sizeMB:megabytesDownloaded
								}
							);
						} catch (err) {
							console.error('FD: error resolving download');
						}
					});
				}
			};
			res.on('end', function() {
				downloadFinished = true;
				try {
					returnToCaller();
				} catch (err) {
					console.error('FD: error returningToCaller-end',err);
				}
			});
			fileStream.on('finish', function() {
				fileStreamFinished = true;
				try {
					returnToCaller();
				} catch (err) {
					console.error('FD: error returningToCaller-finish',err);
				}
			});

			pageElements = onStart({
				fileName:newFileName,
				filePath:uniqueFilePath,
				fileSize:formatSize(fileSize),
				newID:safeName,
				statusCode:res.statusCode,
				headers:res.headers
			});
		};
		/*
		 * Function that handles the basic http request to determine if it was 
		 * successful/file doesn't exist.
		 */
		var getHandleRequest = function(handleResponse) {
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
			return handleRequest;
		};
		// Make sure that the download directory isn't blank.
		if(defaultDownloadDirectory !== '') {
			fileStream = fs.createWriteStream(uniqueFilePath);
			var curRequest = reqLib.get(url, getHandleRequest(handleResponse))
			.on ("error", function(error) {
				console.error('curRequest error',error);
				requestAborted = true;
				if (bar) bar.cancel ();
				curRequest.end();
				curRequest.abort();
				fs.unlink(uniqueFilePath);
				defered.reject(error);
			});
			curRequest.setTimeout( 5000, function( ) {
				console.error('file_downloader.js timeout');
				requestAborted = true;
				if (bar) bar.cancel ();
				curRequest.end();
				curRequest.abort();
				fs.unlink(uniqueFilePath);
				defered.reject('timeout-err');
			});
		} else {
			var errStr = 'defaultDownloadDirectory is blank';
			console.error(errStr);
			defered.reject(errStr);
		}
		return defered.promise;
	};

	/*
	 * downloadInfo should be the object returned by the function defined: 
	 * "this.downloadFile"
	 * More specifically, an object that has an attribute "fileName" that is a 
	 * full file path to a .zip file.
	 */
	this.extractFile = function(downloadInfo) {
		var defered = q.defer();
		var extractFile = function() {
			var innerDefered = q.defer();

			var filePath = downloadInfo.fileName;
			var baseDir = path.dirname(filePath);
			var fileName = path.basename(filePath);
			var fileExtension = path.extname(filePath);
			var destinationFolderName = fileName.slice(0, fileName.length - fileExtension.length);
			var destinationFolder = baseDir + path.sep + destinationFolderName;
			var destinationPath = destinationFolder + path.sep;

			if(fileExtension === '.zip') {
				// Setup adm-zip object
				var zip = new admZip(filePath);

				// Extract the .zip file
				zip.extractAllTo(/*target path*/destinationPath, /*overwrite*/true);
				downloadInfo.extractedFolder = destinationPath;
				innerDefered.resolve(downloadInfo);
			} else if (fileExtension === '.tgz') {
				// Setup and extract the downloaded .tgz files
				tarball.extractTarball(filePath, destinationPath, function(err){
					if(err) {
						console.log('Extraction of .tgz error',err);
					}
					console.log('Finished extracting .tgz file');
					downloadInfo.extractedFolder = destinationPath;
					innerDefered.resolve(downloadInfo);
				});
			} else {
				console.log('Other File type detected', fileExtension);
				innerDefered.resolve(downloadInfo);
			}
			return innerDefered.promise;
		};
		var startExecution = function() {
			var innerDefered = q.defer();
			innerDefered.resolve();
			return innerDefered.promise;
		};
		startExecution()
		.then(extractFile)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.downloadAndExtractFile = function(url, listeners) {
		var errFunc = function(bundle) {
			var errDefered = q.defer();
			errDefered.reject(bundle);
			return errDefered.promise;
		};
		var defered = q.defer();
		self.downloadFile(url, listeners)
		.then(self.extractFile, errFunc)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}

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
	// var url = "http://nodejs.org/dist/latest/node.exe";
	// var url = "http://labjack.com/robots.txt";
	var url = "https://s3.amazonaws.com/ljrob/mac/kipling/test/kipling_test_mac.zip";
	url = "http://labjack.com/sites/default/files/2014/07/LabJackM-1.0702-Mac.tgz";

	FILE_DOWNLOADER_UTILITY.setDebugMode(true);
	// FILE_DOWNLOADER_UTILITY.downloadFile(url)
	// .then(function(info) {
	// 	console.log('success!',info);
	// 	FILE_DOWNLOADER_UTILITY.extractFile(info)
	// 	.then(function(result) {
	// 		console.log('FD: Successfully unzipped file',result);
	// 	}, function(error) {
	// 		console.log('FD: Error unzipping file',error);
	// 	});
	// }, function(error) {
	// 	console.log('Error :(',error);
	// });
	FILE_DOWNLOADER_UTILITY.downloadAndExtractFile(url)
	.then(function(info) {
		console.log('success!', info);
	}, function(error) {
		console.log('Error :(', error);
	});
} else {
	console.log('file_downloader.js runing in html mode');
}



