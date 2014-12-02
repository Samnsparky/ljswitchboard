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
// var admZip = require('adm-zip');
var unzip = require('unzip');
var tarball = require('tarball-extract');

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

	var genericDownloadTemplate = '' +
	'<h3>Downloading</h3>' +
	'<div id="{{newID}}" downloadType="{{downloadType}}">' +
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
	var kiplingUpgradeDownloadTemplate = '' +
	'<ol id="{{newID}}_process">' +
		'<li id="{{newID}}_process_download" class="download">' +
			'<h3>Downloading Files</h3>' +
			'<div class="active">' +
				'<div id="{{newID}}" downloadType="{{downloadType}}">' +
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
				'</div>' +
			'</div>' +
			'<div class="finished" style="display:none">' +
				'<div class="win-command green win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring  icon-checkmark"></span>' +
				'</div>' +
				'<p>Status: Finished Downloading Files</p>' +
			'</div>' +
			'<div class="error" style="display:none">' +
				'<div class="win-command red win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring icon-cross"></span>' +
				'</div>' +
				'<p>Error Downloading Files, <span class="errorMessage"></span></p>' +
			'</div>' +
		'</li>' +
		'<li id="{{newID}}_process_extract" class="extract">' +
			'<h3>File Extraction</h3>' +
			'<div class="waiting">' +
				'<p>Status: Waiting to Extract Files</p>' +
			'</div>' +
			'<div class="active" style="display:none">' +
				'<p>Status: Extracting Files</p>' +
				'<img src="static/img/progress-indeterminate.gif"></img>' +
			'</div>' +
			'<div class="finished" style="display:none">' +
				'<div class="win-command green win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring  icon-checkmark"></span>' +
				'</div>' +
				'<span>Status: Finished Extracting Files</span><br>' +
				'<button id="showExtractedFilesButton" class="showExtractedFilesButton btn btn-mini btn-link">' +
					fileBrowserButtonText +
				'</button>' +
			'</div>' +
			'<div class="error" style="display:none">' +
				'<div class="win-command red win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring icon-cross"></span>' +
				'</div>' +
				'<span>Error Extracting Files, <span class="errorMessage"></span></span><br>' +
				'<button id="showInFileButton" class="showInFileButton btn btn-mini btn-link">' +
					fileBrowserButtonText +
				'</button>' +
			'</div>' +
		'</li>' +
		'<li id="{{newID}}_process_install" class="install">' +
			'<h3>Installation</h3>' +
			'<div class="waiting">' +
				'<p>Status: Waiting to Install</p>' +
			'</div>' +
			'<div class="active" style="display:none">' +
				'<p>Status: Installing</p>' +
				'<img src="static/img/progress-indeterminate.gif"></img>' +
			'</div>' +
			'<div class="finished" style="display:none">' +
				'<div class="win-command green win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring  icon-checkmark"></span>' +
				'</div>' +
				'<p>Status: Restarting Kipling</p>' +
			'</div>' +
			'<div class="error" style="display:none">' +
				'<div class="win-command red win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring icon-cross"></span>' +
				'</div>' +
				'<p>Error installing files, please manually install them. <span class="errorMessage"></span></p>' +
			'</div>' +
		'</li>' +
	'</ol>';
	var ljmUpgradeDownloadTemplate = '' +
	'<ol id="{{newID}}_process">' +
		'<li id="{{newID}}_process_download" class="download">' +
			'<h3>Downloading Files</h3>' +
			'<div class="active">' +
				'<div id="{{newID}}" downloadType="{{downloadType}}">' +
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
				'</div>' +
			'</div>' +
			'<div class="finished" style="display:none">' +
				'<div class="win-command green win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring  icon-checkmark"></span>' +
				'</div>' +
				'<p>Status: Finished Downloading Files</p>' +
			'</div>' +
			'<div class="error" style="display:none">' +
				'<div class="win-command red win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring icon-cross"></span>' +
				'</div>' +
				'<p>Error Downloading Files, <span class="errorMessage"></span></p>' +
			'</div>' +
		'</li>' +
		'<li id="{{newID}}_process_extract" class="extract">' +
			'<h3>File Extraction</h3>' +
			'<div class="waiting">' +
				'<p>Status: Waiting to Extract Files</p>' +
			'</div>' +
			'<div class="active" style="display:none">' +
				'<p>Status: Extracting Files</p>' +
				'<img src="static/img/progress-indeterminate.gif"></img>' +
			'</div>' +
			'<div class="finished" style="display:none">' +
				'<div class="win-command green win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring  icon-checkmark"></span>' +
				'</div>' +
				'<span>Status: Finished Extracting Files</span><br>' +
				'<button id="showExtractedFilesButton" class="showExtractedFilesButton btn btn-mini btn-link">' +
					fileBrowserButtonText +
				'</button>' +
			'</div>' +
			'<div class="error" style="display:none">' +
				'<div class="win-command red win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring icon-cross"></span>' +
				'</div>' +
				'<span>Error Extracting Files, <span class="errorMessage"></span></span><br>' +
				'<button id="showInFileButton" class="showInFileButton btn btn-mini btn-link">' +
					fileBrowserButtonText +
				'</button>' +
			'</div>' +
		'</li>' +
		'<li id="{{newID}}_process_install" class="install">' +
			'<h3>Installation</h3>' +
			'<div class="waiting">' +
				'<p>Status: Waiting to Install</p>' +
			'</div>' +
			'<div class="active" style="display:none">' +
				'<p>Status: Installing</p>' +
				'<img src="static/img/progress-indeterminate.gif"></img>' +
			'</div>' +
			'<div class="finished" style="display:none">' +
				'<div class="win-command green win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring  icon-checkmark"></span>' +
				'</div>' +
				'<p>Status: Restarting Kipling</p>' +
			'</div>' +
			'<div class="error" style="display:none">' +
				'<div class="win-command red win-command-small" rel="tootlip" title="Command with icon and label with border ring, with a custom color">' +
					'<span class="win-commandicon win-commandring icon-cross"></span>' +
				'</div>' +
				'<p>Please quit Kipling along with any other process using LJM and manually upgrade LJM. <span class="errorMessage"></span></p>' +
			'</div>' +
		'</li>' +
	'</ol>';

	this.downloadTemplate = handlebars.compile(genericDownloadTemplate);

	this.downloadTemplates = {
		'generic': handlebars.compile(genericDownloadTemplate),
		'kipling': handlebars.compile(kiplingUpgradeDownloadTemplate),
		'ljm': handlebars.compile(ljmUpgradeDownloadTemplate)
	};

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
	this.manDownloadControls = {};
	this.getPageControls = function(pageElements, info) {
		var controls = {};
		var steps = [];

		pageElements.downloadProcess.children().each(function(index,child) {
			steps.push(child.className);
		});

		function downloadControls(pageElements, info, steps) {
			this.currentIndex = 0;
			this.currentStep = steps[0];
			this.numSteps = steps.length;
			this.steps = steps;
			this.pageElements = pageElements;
			this.info = info;

			var downloadEl = pageElements.downloadProcess;

			this.nextStep = function(err, message) {
				console.log('FD: in nextStep', self.currentStep, self.currentIndex);
				if(self.currentStep === 'processCompleted') {
					return;
				}
				var isError = false;
				if(err) {
					isError = true;
				}
				var errorMessage = '';
				if(message) {
					errorMessage = message;
				}
				var currentEl = downloadEl.find('.' + self.currentStep);
				var nextEl;
				var isNextStep = false;
				if(self.numSteps > (self.currentIndex + 1)) {
					nextEl = downloadEl.find('.' + self.steps[self.currentIndex + 1]);
					isNextStep = true;
				}
				if(currentEl.find('.waiting').length > 0) {
					currentEl.find('.waiting').slideUp();
				}
				if(currentEl.find('.active').length > 0) {
					currentEl.find('.active').slideUp();
				}
				if(!isError) {
					if(currentEl.find('.finished').length > 0) {
						currentEl.find('.finished').slideDown();
					}
				} else {
					if(currentEl.find('.error').length > 0) {
						currentEl.find('.error').slideDown();
					}
					if(currentEl.find('.error .errorMessage').length > 0) {
						currentEl.find('.error .errorMessage').text(errorMessage);
					}
					// self.currentIndex = self.steps.length;
					// self.currentStep = 'processCompleted';
					// self.currentIndex += 1;
					// self.currentStep = self.steps[self.currentIndex];
				}
				if(isNextStep) {
					if(nextEl.find('.waiting').length > 0) {
						nextEl.find('.waiting').slideUp();
					}
					if(nextEl.find('.active').length > 0) {
						nextEl.find('.active').slideDown();
					}
					if(nextEl.find('.finished').length > 0) {
						nextEl.find('.finished').slideUp();
					}
					self.currentIndex += 1;
					self.currentStep = self.steps[self.currentIndex];
				} else {
					self.currentIndex = self.steps.length;
					self.currentStep = 'processCompleted';
				}
				console.log('FD: in nextStep (2)', self.currentStep, self.currentIndex);
			};

			this.getCurrentStep = function() {
				return self.currentStep;
			};
			var self = this;
		}
		var newDownloadControls = new downloadControls(pageElements, info, steps);
		self.manDownloadControls = newDownloadControls;

		// Add the controls to the pageElements object and return
		pageElements.controls = newDownloadControls;
		return pageElements;
	};

	var onStartDefaultFunc = function(info) {
		var pageElements = null;
		if(self.isInitialized) {
			if(isDefined($)) {
				console.log('FD: Started Download',info);
				if(self.htmlEl.css('display') === 'none') {
					self.htmlEl.slideDown();
				} else {
					console.log('file_downloader.js wacky self.htmlEl state', self.htmlEl.css('display'));
				}
				// Get the previous information in the downloads list
				var oldText = self.downloadEl.html();

				// Get the download template
				var fileDownloadTemplate = self.downloadTemplates[info.downloadType];
				if(typeof(fileDownloadTemplate) !== 'function') {
					console.error('error in onStartDefaultFunc, bad downloadType', info.downloadType);
					fileDownloadTemplate = self.downloadTemplates['generic'];
				}
				// Render the fileDownloadTemplate
				var newText = fileDownloadTemplate(info);
				
				// Add new download to download list
				self.downloadEl.html(oldText + newText);

				// Get new download element reference
				var newEl = self.htmlEl.find('#'+info.newID);
				var downloadProcess = self.htmlEl.find('#'+info.newID+'_process');

				// Attach "show in finder" listener
				var showInFileButton = newEl.find('.'+'showInFileButton');
				showInFileButton.unbind();
				showInFileButton.bind('click',function(event) {
					console.log('FD: in onClick');
					if(!isDefined(gui)) {
						gui = require('gui');
					}
					gui.Shell.showItemInFolder(info.filePath);
					console.log('Tried to open file in finder:',info.filePath);
				});

				pageElements = {};
				pageElements.downloadProcess = downloadProcess;
				pageElements.activeDownload = newEl;
				pageElements.progressBar = newEl.find('.'+'curProgressBar .bar');
				pageElements.fileSize = newEl.find('.'+'curFileSize');
				pageElements.downloadSpeed = newEl.find('.'+'curDownloadSpeed');
				pageElements.timeRemaining = newEl.find('.'+'curTimeRemaining');
				pageElements.showInFileButton = showInFileButton;

				self.pageElements = self.getPageControls(pageElements, info);
			} else {
				console.log('$ not defined');
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
				// console.log('FD: onUpdateDefaultFunc time remaining (sec)',stats.remainingTime);
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
	

	this.downloadFile = function(url, downloadType, listeners) {
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
		if(!isDefined(downloadType)) {
			downloadType = 'generic';
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

		console.log('Created safeName', safeName);
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
									sizeMB:megabytesDownloaded,
									downloadType:downloadType,
									pageElements:pageElements
								}
							);
						} catch (err) {
							console.error('FD: error resolving download');
							defered.reject({
								fileName:uniqueFilePath,
								size:bodyLength,
								sizeMB:megabytesDownloaded,
								downloadType:downloadType,
								pageElements:pageElements
							});
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
				headers:res.headers,
				downloadType:downloadType
			});
		};
		/*
		 * Function that handles the basic http request to determine if it was 
		 * successful/file doesn't exist.
		 */
		var getHandleRequest = function(handleResponse) {
			var handleRequest = function(res) {
				console.log('in handleRequest', res.statusCode, res);
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
			console.log('Created fileStream, making .get request', url);
			var curRequest = reqLib.get(url, getHandleRequest(handleResponse))
			.on("error", function(error) {
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
		var extractFile = function(downloadInfo) {
			var innerDefered = q.defer();

			var filePath = downloadInfo.fileName;
			var baseDir = path.dirname(filePath);
			var fileName = path.basename(filePath);
			var fileExtension = path.extname(filePath);
			var destinationFolderName = fileName.slice(0, fileName.length - fileExtension.length);
			var destinationFolder = baseDir + path.sep + destinationFolderName;
			var destinationPath = destinationFolder + path.sep;
			downloadInfo.isExtracted = false;
			downloadInfo.downloadedFileExtension = fileExtension;

			var getDeleteFile = function(filePath) {
				var deleteFile = function(bundle) {
					var delDefered = q.defer();
					fs.open(filePath, 'r', function(err, fd) {
						fs.close(fd, function() {
							fs.unlink(filePath, function(err) {
								delDefered.resolve(bundle);
							});
						});
					});
					return delDefered.promise;
				};
				return deleteFile;
			};

			if(fs.existsSync(destinationFolder)) {
				var MakeNewDirectoryStr = function(filePath, index) {
					return filePath + '_' + index.toString();
				};
				var i = 0;
				while(fs.existsSync(MakeNewDirectoryStr(destinationFolder,i))) {
					i += 1;
				}
				destinationFolder = MakeNewDirectoryStr(destinationFolder,i);
				destinationPath = destinationFolder + path.sep;
			}

			downloadInfo.extractedFolder = destinationFolder;
			downloadInfo.extractedPath = destinationPath;
			if(fileExtension === '.zip') {
				// var initExtraction = function(downloadInfo) {
				// 	var deferedExtraction = q.defer();
				// 	deferedExtraction.resolve(downloadInfo);
				// 	return deferedExtraction.promise;
				// };
				// var extractFiles = function(downloadInfo) {
				// 	var deferedExtraction = q.defer();
				// 	// Setup adm-zip object
				// 	var zip = new admZip(filePath);

				// 	// Extract the .zip file
				// 	zip.extractAllTo(/*target path*/destinationPath, /*overwrite*/true);
				// 	downloadInfo.extractedFolder = destinationPath;
				// 	downloadInfo.isExtracted = true;

				// 	getDeleteFile(filePath)(downloadInfo)
				// 	.then(deferedExtraction.resolve);
				// 	return deferedExtraction.promise;
				// };
				// initExtraction(downloadInfo)
				// .then(extractFiles)
				// .then(innerDefered.resolve);
				console.log('FD: Extracting .zip file', downloadInfo);

				var archiveStream = fs.createReadStream(filePath);
				var unzipExtractor = unzip.Extract({ path: destinationFolder });

				unzipExtractor.on('error', function(err) {
					console.error('FD: .zip extraction error', err);
					downloadInfo.extractionError = err;
					innerDefered.resolve(downloadInfo);
					return;
				});

				unzipExtractor.on('close', function() {
					console.log('FD: .zip extraction finished', downloadInfo);
					downloadInfo.extractedFolder = destinationPath;
					downloadInfo.isExtracted = true;

					getDeleteFile(filePath)(downloadInfo)
					.then(innerDefered.resolve);
				});
				archiveStream.pipe(unzipExtractor);

			} else if (fileExtension === '.tgz') {
				// Setup and extract the downloaded .tgz files
				tarball.extractTarball(filePath, destinationPath, function(err){
					if(err) {
						console.log('Extraction of .tgz error',err);
						downloadInfo.extractionError = err;
						innerDefered.resolve(downloadInfo);
						return;
					}
					console.log('Finished extracting .tgz file');
					downloadInfo.extractedFolder = destinationPath;

					downloadInfo.isExtracted = true;
					getDeleteFile(filePath)(downloadInfo)
					.then(innerDefered.resolve);
				});
			} else {
				console.log('Other File type detected', fileExtension);
				innerDefered.resolve(downloadInfo);
			}
			return innerDefered.promise;
		};
		var startExecution = function(downloadInfo) {
			var innerDefered = q.defer();
			innerDefered.resolve(downloadInfo);
			return innerDefered.promise;
		};
		startExecution(downloadInfo)
		.then(extractFile)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.downloadAndExtractFile = function(url, downloadType, listeners) {
		var errFunc = function(bundle) {
			var errDefered = q.defer();
			errDefered.reject(bundle);
			return errDefered.promise;
		};
		var defered = q.defer();
		self.downloadFile(url, downloadType, listeners)
		.then(function(downloadInfo) {
			downloadInfo.pageElements.controls.nextStep();
			return self.extractFile(downloadInfo);
		}, errFunc)
		.then(function(downloadInfo) {
			if(downloadInfo.isExtracted) {
				// Attach "show in finder" listener
				var showInFileButton = downloadInfo.pageElements.downloadProcess.find('.'+'showExtractedFilesButton');
				showInFileButton.unbind();
				showInFileButton.bind('click',function(event) {
					console.log('FD: in onClick');
					if(!isDefined(gui)) {
						gui = require('gui');
					}
					gui.Shell.showItemInFolder(downloadInfo.extractedFolder);
					console.log('Tried to open file in finder:',downloadInfo.extractedFolder);
				});

				downloadInfo.pageElements.controls.nextStep();
			} else {
				downloadInfo.pageElements.controls.nextStep(
					true,
					'File not extracted because ' + downloadInfo.downloadedFileExtension + " isn't extractable"
				);
			}
			defered.resolve(downloadInfo);
		}, function(downloadInfo) {
			downloadInfo.pageElements.controls.nextStep(
				true,
				'File not extracted, error encountered: ' + downloadInfo.extractionError.toString()
			);
			defered.reject(downloadInfo);
		});
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

			console.log('in file_downloader elements', self.htmlEl, self.downloadEl, self.closeEl);
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



