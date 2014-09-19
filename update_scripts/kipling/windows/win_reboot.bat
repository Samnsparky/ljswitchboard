@echo off
setlocal ENABLEDELAYEDEXPANSION ENABLEEXTENSIONS
title Kipling Updater

:: Save arguments as variables
set arg1=%1
CALL :unquote arg1 %arg1%
set arg2=%2
CALL :unquote arg2 %arg2%
set arg3=%3
CALL :unquote arg3 %arg3%
set arg4=%4
CALL :unquote arg4 %arg4%
set arg5=%5
CALL :unquote arg5 %arg5%


set CURRENT_EXEC_PATH=%arg1%
set DOWNLOADED_FILE_PATH=%arg2%
set DOWNLOADED_APP_NAME=%arg3%
set REBOOT_SCRIPT_PATH=%arg4%
set DEBUG_FILE_DIRECTORY=%arg5%
echo "HERE"
if "%CURRENT_EXEC_PATH%" == "" (
	echo "Overwriting CURRENT_EXEC_PATH"
	set CURRENT_EXEC_PATH="C:\Program Files (x86)\Kipling"
	:: set CURRENT_EXEC_PATH=J:\Users\Chris_2\temp Kipling Upgrading\current exe
	:: set CURRENT_EXEC_PATH="C:\Users\chris\temp Kipling Upgrading\current exe"
	echo "HEREB %CURRENT_EXEC_PATH%"
)
if "%DOWNLOADED_FILE_PATH%" == "" (
	echo "Overwriting DOWNLOADED_FILE_PATH"
	set DOWNLOADED_FILE_PATH=J:\Users\Chris_2\temp Kipling Upgrading\downloaded files
	set DOWNLOADED_FILE_PATH=C:\Users\chris\temp Kipling Upgrading\downloaded files
	echo "After Overwrite"
)
if "%DOWNLOADED_APP_NAME%" == "" (
	echo "Overwriting DOWNLOADED_APP_NAME"
	set DOWNLOADED_APP_NAME=Kipling.exe
)
if "%REBOOT_SCRIPT_PATH%" == "" (
	echo "Overwriting REBOOT_SCRIPT_PATH"
	set REBOOT_SCRIPT_PATH=J:\Users\Chris_2\Dropbox\Labjack\Kipling 3\Updater\Kipling Updater\Kipling Updater\bin\Release
	set REBOOT_SCRIPT_PATH=C:\Users\chris\Dropbox\Labjack\Kipling 3\Updater\Kipling Updater\Kipling Updater\bin\Release
	echo "After Overwrite"
)
if "%DEBUG_FILE_DIRECTORY%" == "" (
	echo "Overwriting DEBUG_FILE_DIRECTORY"
	set DEBUG_FILE_DIRECTORY=J:\Users\Chris_2\Dropbox\LabJack-Shared\Kipling Updater
	set DEBUG_FILE_DIRECTORY=C:\Users\chris\Dropbox\LabJack-Shared\Kipling Updater
	echo "After Overwrite"
)
echo "HEREC"
CALL :unquote CURRENT_EXEC_PATH %CURRENT_EXEC_PATH%
:: set DEBUG_FILE_DIRECTORY=J:\Users\Chris_2\temp Kipling Upgrading\downloaded files

:: Setup some required file paths
set WIN_UPDATE_SCRIPT=%REBOOT_SCRIPT_PATH%\win_update.bat
set WIN_UPDATE_EXE=%REBOOT_SCRIPT_PATH%\Kipling Updater.exe
set FILE_TO_CREATE=%DEBUG_FILE_DIRECTORY%\kiplingUpdate.tst
set FILE_TO_CONTINUE_UPGRADE=%DEBUG_FILE_DIRECTORY%\launchUpdate.tst
set DEBUG_FILE=%DEBUG_FILE_DIRECTORY%\Debug_win_reboot_bat.txt
set UPGRADER_DEBUG_FILE=%DEBUG_FILE_DIRECTORY%\Debug_Kipling_Upgrader_exe.txt

echo "Checking to Delete %FILE_TO_CREATE%"
if exist "%FILE_TO_CREATE%" (
	del "%FILE_TO_CREATE%"
)
echo "Checking to Delete %FILE_TO_CONTINUE_UPGRADE%"
if exist "%FILE_TO_CONTINUE_UPGRADE%" (
	del "%FILE_TO_CONTINUE_UPGRADE%"
)
echo "Checking to Delete %DEBUG_FILE%"
if exist "%DEBUG_FILE%" (
	del "%DEBUG_FILE%"
)
echo "Checking to Delete %UPGRADER_DEBUG_FILE%"
if exist "%UPGRADER_DEBUG_FILE%" (
	del "%UPGRADER_DEBUG_FILE%"
)


echo "CURRENT_EXEC_PATH: %CURRENT_EXEC_PATH%" >> "%DEBUG_FILE%"
echo "DOWNLOADED_FILE_PATH: %DOWNLOADED_FILE_PATH%" >> "%DEBUG_FILE%"
echo "DOWNLOADED_APP_NAME: %DOWNLOADED_APP_NAME%" >> "%DEBUG_FILE%"
echo "REBOOT_SCRIPT_PATH: %REBOOT_SCRIPT_PATH%" >> "%DEBUG_FILE%"
echo "DEBUG_FILE_DIRECTORY: %DEBUG_FILE_DIRECTORY%" >> "%DEBUG_FILE%"
echo "WIN_UPDATE_SCRIPT: %WIN_UPDATE_SCRIPT%" >> "%DEBUG_FILE%"
echo "WIN_UPDATE_EXE: %WIN_UPDATE_EXE%" >> "%DEBUG_FILE%"
echo "FILE_TO_CREATE: %FILE_TO_CREATE%" >> "%DEBUG_FILE%"
echo "DEBUG_FILE: %DEBUG_FILE%" >> "%DEBUG_FILE%"
echo "**" >> "%DEBUG_FILE%"
echo "**" >> "%DEBUG_FILE%"

:: Define other variables
set PROGRAM_STATE=INIT
set HAS_ACCESS_TO_DIRECTORY=NO
set CHECK_FILE_ACCESS=YES
set /a "numTimeout = 0"
set /a "timeoutLength = 5"
set WAIT_FILE_NAME="%FILE_TO_CREATE%"
set WAIT_LOOP_NEXT=""
set WAIT_LOOP_FAIL=""
set WFKTQ_WAIT_LOOP_NEXT=""
set WFKTQ_WAIT_LOOP_FAIL=""


:: Make sure that the update script/exe exists.
echo "Checking for .bat" >> "%DEBUG_FILE%"
if exist "%WIN_UPDATE_SCRIPT%" (
	echo "Update Script exists" >> "%DEBUG_FILE%"
) else (
	echo "Update Script doesn't exist" >> "%DEBUG_FILE%"
)
echo "Checking for exe" >> "%DEBUG_FILE%"
if exist "%WIN_UPDATE_EXE%" (
	echo "Update Exe exists" >> "%DEBUG_FILE%"
) else (
	set PROGRAM_STATE=MISSING_UPGRADE_SCRIPT
	echo "Update Exe doesn't exist, halting upgrade: %WIN_UPDATE_EXE%" >> "%DEBUG_FILE%"
	timeout /t 1 /nobreak > NUL
	echo ABORT UPGRADE >> "%DEBUG_FILE%"
	timeout /t 1 /nobreak > NUL
)


echo "Finished Initialization Procedures" >> "%DEBUG_FILE%"
timeout /t 1 /nobreak > NUL

goto changeStateAndJump
echo "BAD BAD BAD" >> "%DEBUG_FILE%"

:: ------------- Define random subroutines
:unquote
	set %1=%~2
	goto :eof



:: ------------- Begin terminate program code ----------------------------------
echo "Defining terminateProgram" >> "%DEBUG_FILE%"
:terminateProgram
	if exist "%DOWNLOADED_FILE_PATH%\getadmin.vbs" (
		del "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	)
	if exist "%DOWNLOADED_FILE_PATH%\runUser.vbs" (
		del "%DOWNLOADED_FILE_PATH%\runUser.vbs"
	)
	if exist "%FILE_TO_CONTINUE_UPGRADE%" (
		del "%FILE_TO_CONTINUE_UPGRADE%"
	)
	if exist "%FILE_TO_CREATE%" (
		del "%FILE_TO_CREATE%"
	)
	echo "Terminating Program"
	echo "Terminating Program" >> "%DEBUG_FILE%"
	set PROGRAM_STATE=TERMINATE_PROGRAM
	exit /B
:: ------------- End terminate program code ------------------------------------


:: ------------- Begin main state machine --------------------------------------
:changeStateAndJump
	if "%CHECK_FILE_ACCESS%" == "YES" (
		goto checkForPermissions
	)
	echo "Current Program State: %PROGRAM_STATE%"
	echo "Current Program State: %PROGRAM_STATE%" >> "%DEBUG_FILE%"
	if "%PROGRAM_STATE%" == "INIT" (
		:: "INIT" is basically just a dead state that starts the state machine
		:: After "INIT" we go to "SWITCH_ON_ACCESS"
		echo "Program State: INIT" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=SWITCH_ON_ACCESS
		goto changeStateAndJump

	) else if "%PROGRAM_STATE%" == "SWITCH_ON_ACCESS" (
		:: "SWITCH_ON_ACCESS" determines how to start the Kipling_Upgrader.exe
		:: After "SWITCH_ON_ACCESS" we go to "STARTED_UPDATE_SCRIPT"
		echo "Program State: SoA - Has Access? %HAS_ACCESS_TO_DIRECTORY%" >> "%DEBUG_FILE%"
		if "%HAS_ACCESS_TO_DIRECTORY%" == "YES" (
			goto updateWithCurrentPermissions
		) else (
			goto updateWithAdminPermissions
		)

	) else if "%PROGRAM_STATE%" == "STARTED_UPDATE_SCRIPT" (
		:: "STARTED_UPDATE_SCRIPT" enters a wait loop to wait for the script to start.  
		:: It waits for a file to get created.
		:: If the file gets created, we go to "QUIT_KIPLING"
		:: If the file doesn't get created, we go to "ABORT_UPGRADE"
		echo "Program State: SUS" >> "%DEBUG_FILE%"
		set /a "numTimeout = 0"
		set /a "timeoutLength = 5"
		set WAIT_LOOP_NEXT=QUIT_KIPLING
		set WAIT_LOOP_FAIL=ABORT_UPGRADE
		set PROGRAM_STATE=WAIT_FOR_UPDATE_SCRIPT
		goto changeStateAndJump

	) else if "%PROGRAM_STATE%" == "QUIT_KIPLING" (
		:: "QUIT_KIPLING" enters a wait loop to wait for kipling to quit.
		:: It checks for nw.exe being executed in the tasklist, this isn't the best way to do this...
		:: If Kipling quits, we go to "WAIT_FOR_UPGRADE"
		:: If Kipling doesn't quit, we go to "ABORT_UPGRADE"
		echo "Program State: QK" >> "%DEBUG_FILE%"
		echo "QUIT KIPLING" >> "%DEBUG_FILE%"
		echo QUIT KIPLING
		set /a "numTimeout = 0"
		set /a "timeoutLength = 40"
		set WFKTQ_WAIT_LOOP_NEXT=START_UPGRADE
		set WFKTQ_WAIT_LOOP_FAIL=ABORT_UPGRADE
		set PROGRAM_STATE=WAIT_FOR_KIPLING_TO_QUIT
		goto changeStateAndJump

	) else if "%PROGRAM_STATE%" == "START_UPGRADE" (
		:: "START_UPGRADE" creates the "lock" file that indicates that K3 can be upgraded.
		:: The next state is "WAIT_FOR_UPGRADE"
		echo "Program State: SU" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=WAIT_FOR_UPGRADE
		echo "Creating file: %FILE_TO_CONTINUE_UPGRADE%" >> "%DEBUG_FILE%"
		echo "Continue Upgrade" >> "%FILE_TO_CONTINUE_UPGRADE%"
		goto changeStateAndJump

	) else if "%PROGRAM_STATE%" == "WAIT_FOR_UPGRADE" (
		:: "WAIT_FOR_UPGRADE" enters a wait loop to wait for the upgrade process to happen.
		:: It checks for the file saved in the "FILE_TO_CREATE" variable to get created.
		:: If the file gets created, we go to "CHECK_UPGRADE"
		:: If the file doesn't get created, we go to "ABORT_UPGRADE"
		echo "Program State: WFU" >> "%DEBUG_FILE%"
		set /a "numTimeout = 0"
		set /a "timeoutLength = 20"
		set WAIT_LOOP_NEXT=CHECK_UPGRADE
		set WAIT_LOOP_FAIL=ABORT_UPGRADE
		set PROGRAM_STATE=WAIT_FOR_UPDATE_SCRIPT
		goto changeStateAndJump

	) else if "%PROGRAM_STATE%" == "CHECK_UPGRADE" (
		:: "CHECK_UPGRADE" enters a wait loop to make sure that Kipling.exe has been created.
		:: It checks to see if the file "Kipling.exe" exists in the proper directory.
		:: If the file gets created, we go to "LAUNCH_KIPLING"
		:: If the file doesn't get created, we go to "ABORT_UPGRADE"
		echo "Program State: WFU" >> "%DEBUG_FILE%"
		set /a "numTimeout = 0"
		set /a "timeoutLength = 20"
		set WAIT_LOOP_NEXT=LAUNCH_KIPLING
		set WAIT_LOOP_FAIL=ABORT_UPGRADE
		set PROGRAM_STATE=WAIT_FOR_KIPLING_UPGRADE
		goto changeStateAndJump

	) else if "%PROGRAM_STATE%" == "LAUNCH_KIPLING" (
		:: "LAUNCH_KIPLING" launches Kipling, hopefully by this point it has been upgraded.
		:: We set the state to "FINISHED" and start Kipling.
		echo "Program State: LK" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=FINISHED
		if exist "%CURRENT_EXEC_PATH%\%DOWNLOADED_APP_NAME%" (
			echo "K3 exe exists" >> "%DEBUG_FILE%"
			echo "Starting Kipling: %CURRENT_EXEC_PATH%\%DOWNLOADED_APP_NAME%" >> "%DEBUG_FILE%"
			echo "start ""%CURRENT_EXEC_PATH%"" ""%CURRENT_EXEC_PATH%\%DOWNLOADED_APP_NAME%""" >> "%DEBUG_FILE%"
			cd /D "%CURRENT_EXEC_PATH%"
			start "%CURRENT_EXEC_PATH%" "%CURRENT_EXEC_PATH%\%DOWNLOADED_APP_NAME%"
		) else (
			echo "K3 exe doesn't exist" >> "%DEBUG_FILE%"
		)
		goto changeStateAndJump
	) else if "%PROGRAM_STATE%" == "WAIT_FOR_UPDATE_SCRIPT" (
		echo "Program State: WFUS: %numTimeout%" >> "%DEBUG_FILE%"
		goto waitForStartProgram
	) else if "%PROGRAM_STATE%" == "WAIT_FOR_KIPLING_TO_QUIT" (
		echo "Program State: WFKTQ: %numTimeout%" >> "%DEBUG_FILE%"
		goto waitForKiplingToQuit
	) else if "%PROGRAM_STATE%" == "WAIT_FOR_KIPLING_UPGRADE" (
		echo "Program State: WFSK: %numTimeout%" >> "%DEBUG_FILE%"
		goto waitForKiplingExe
	) else if "%PROGRAM_STATE%" == "ABORT_UPGRADE" (
		echo "Program State: AU" >> "%DEBUG_FILE%"
		echo "ABORT UPGRADE" >> "%DEBUG_FILE%"
		echo ABORT UPGRADE
		set PROGRAM_STATE=FINISHED
		goto changeStateAndJump
	) else if "%PROGRAM_STATE%" == "FINISHED" (
		echo "Program State: F" >> "%DEBUG_FILE%"
		goto terminateProgram
	) else if "%PROGRAM_STATE%" == "MISSING_UPGRADE_SCRIPT" (
		echo "Program State: MUS" >> "%DEBUG_FILE%"
		goto terminateProgram
	) else if "%PROGRAM_STATE%" == "TERMINATE_PROGRAM" (
		echo "Program State: TP" >> "%DEBUG_FILE%"
		goto terminateProgram
	) else (
		echo "Potentially bad state" >> "%DEBUG_FILE%"
		echo "Program State is: %PROGRAM_STATE%"
		goto terminateProgram
	)
	echo "End of changeStateAndJump BAD"
:: ------------- End main state machine ----------------------------------------

:: ------------- Begin checking for write access -------------------------------
:checkForPermissions
	set CHECK_FILE_ACCESS=NO
	echo "Checking to see if admin is required" >> "%DEBUG_FILE%"
	echo "DIR: %CURRENT_EXEC_PATH%\.writable" >> "%DEBUG_FILE%"
	set HAS_ACCESS_TO_DIRECTORY=NO
	copy /Y NUL "%CURRENT_EXEC_PATH%\.writable" > NUL 2>&1 && set WRITEOK=1
	IF DEFINED WRITEOK (
		if exist "%CURRENT_EXEC_PATH%\.writable" (
		   set HAS_ACCESS_TO_DIRECTORY=YES
		   del "%CURRENT_EXEC_PATH%\.writable"
		   echo "File exists and copy worked" >> "%DEBUG_FILE%"
		   goto changeStateAndJump
		) else (
			echo "File Does Not Exist..." >> "%DEBUG_FILE%"
			goto changeStateAndJump
		)
	) else (
		echo "File Copy Reported Fail" >> "%DEBUG_FILE%"
		goto changeStateAndJump
	)
:: ------------- End checking for write access ---------------------------------

:: ------------- Begin Launch win_update.bat with admin permissions ------------
:updateWithAdminPermissions
	echo "in updateWithAdminPermissions" >> "%DEBUG_FILE%"

:getAdminPermissions
	echo "in getAdminPermissions" >> "%DEBUG_FILE%"
	REM  --> Check for permissions
	>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

	REM --> If error flag set, we do not have admin.
	if '%errorlevel%' NEQ '0' (
	echo "Requesting administrative privileges..." >> "%DEBUG_FILE%"
	goto UACPrompt
	) else ( goto gotAdmin )

:UACPrompt
	echo "in UACPrompt" >> "%DEBUG_FILE%"
	echo Set UAC = CreateObject^("Shell.Application"^) > "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	set ADMIN_SCRIPT_CMD= """%CURRENT_EXEC_PATH%"" ""%DOWNLOADED_FILE_PATH%"" ""%DOWNLOADED_APP_NAME%"" ""%REBOOT_SCRIPT_PATH%"" ""%FILE_TO_CREATE%"" ""%FILE_TO_CONTINUE_UPGRADE%"" ""%UPGRADER_DEBUG_FILE%"""
	:: ""%arg1%"" ""%arg2%"" ""%arg3%"" ""%arg4%"" ""%FILE_TO_CREATE%""
	echo "ADMIN SCRIPT: %ADMIN_SCRIPT_CMD%" >> "%DEBUG_FILE%"
	:: Commands to update the Kipling Updater .exe
	echo UAC.ShellExecute "%WIN_UPDATE_EXE%", %ADMIN_SCRIPT_CMD%, "", "runas", 0 >> "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	
	:: Commands to execute the update script
	:: echo UAC.ShellExecute "cmd.exe", "/c start /min \"%REBOOT_SCRIPT_PATH%\" \"%WIN_UPDATE_SCRIPT%\" def \"%DOWNLOADED_APP_NAME%\" klm opq", "", "runas", 0 >> "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	:: echo UAC.ShellExecute "cmd.exe", "/c start /min %~s0 %params%", "", "runas", 1 >> "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	:: echo UAC.ShellExecute "C:\Users\Rory\Desktop\kipling\update.exe","%params%", "", "runas", 1 >> "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	CSCRIPT "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	del "%DOWNLOADED_FILE_PATH%\getadmin.vbs"
	set PROGRAM_STATE=STARTED_UPDATE_SCRIPT
	goto changeStateAndJump

:gotAdmin
	echo "in gotAdmin" >> "%DEBUG_FILE%"
	goto updateWithCurrentPermissions
:: ------------- End Launch win_update.bat with admin permissions --------------



:: ------------- Begin Launch win_update.bat with current permissions ----------
:updateWithCurrentPermissionsA
	goto updateWithCurrentPermissions
:updateWithCurrentPermissions
	echo "in updateWithCurrentPermissions" >> "%DEBUG_FILE%"
	:: start /min %WIN_UPDATE_SCRIPT% %arg1% %arg2% %arg3% %arg4%

	:: Dim WinScriptHost
	echo set WIN_SCRIPT_HOST=CreateObject^("WScript.Shell"^) > "%DOWNLOADED_FILE_PATH%\runUser.vbs"
	:: echo WIN_SCRIPT_HOST.ShellExecute "cmd.exe", "/c start /min %WIN_UPDATE_SCRIPT% %arg1% %arg2% %arg3% %arg4%", 0  >> "%DOWNLOADED_FILE_PATH%\runUser.vbs"
	
	:: Commands to update the Kipling Updater .exe
	echo WIN_SCRIPT_HOST.Run """%WIN_UPDATE_EXE%"" ""%CURRENT_EXEC_PATH%"" ""%DOWNLOADED_FILE_PATH%"" ""%DOWNLOADED_APP_NAME%"" ""%REBOOT_SCRIPT_PATH%"" ""%FILE_TO_CREATE%"" ""%FILE_TO_CONTINUE_UPGRADE%"" ""%UPGRADER_DEBUG_FILE%""", 0 >> "%DOWNLOADED_FILE_PATH%\runUser.vbs"
	echo "Starting Program" >> "%DEBUG_FILE%"
	:: WORKING: start "%DOWNLOADED_FILE_PATH%" "%WIN_UPDATE_EXE%" "%CURRENT_EXEC_PATH%" "%DOWNLOADED_FILE_PATH%" "%DOWNLOADED_APP_NAME%" "%REBOOT_SCRIPT_PATH%" "%FILE_TO_CREATE%" "%UPGRADER_DEBUG_FILE%"
	:: NOT WORKING: start /B "%DOWNLOADED_FILE_PATH%" "%arg1%" "%arg2%" "%arg3%" "%arg4%" "%FILE_TO_CREATE%" "%UPGRADER_DEBUG_FILE%"
	
	:: Commands to execute the update script
	:: echo WIN_SCRIPT_HOST.Run """%WIN_UPDATE_SCRIPT%"" ""%arg1%"" ""%arg2%"" ""%arg3%"" ""%arg4%"" ""%FILE_TO_CREATE%""", 1  >> "%DOWNLOADED_FILE_PATH%\runUser.vbs"
	:: set WinScriptHost = Nothing
	CSCRIPT "%DOWNLOADED_FILE_PATH%\runUser.vbs"
	del "%DOWNLOADED_FILE_PATH%\runUser.vbs"
	set PROGRAM_STATE=STARTED_UPDATE_SCRIPT
	echo "Finished Executing Program" >> "%DEBUG_FILE%"
	goto changeStateAndJump

:: ------------- End Launch win_update.bat with current permissions ------------



:: ------------- Begin wait loop -----------------------------------------------
:waitForStartProgram
	echo "in waitForStartProgram" >> "%DEBUG_FILE%"
	if exist %WAIT_FILE_NAME% (
		del %WAIT_FILE_NAME%
		echo "Removing temp file: %WAIT_FILE_NAME%" >> "%DEBUG_FILE%"
		timeout /t 1 /nobreak > NUL
		set PROGRAM_STATE=%WAIT_LOOP_NEXT%
		goto changeStateAndJump
	) else if %numTimeout% leq %timeoutLength% (
		:: echo "Wait for updater timer: %numTimeout%"
		set /a "numTimeout = numTimeout + 1"
		timeout /t 1 /nobreak > NUL
		goto changeStateAndJump
	) else (
		echo "Aborting Program, didn't hear response from win_update.bat" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=%WAIT_LOOP_FAIL%
		goto changeStateAndJump
	)
:: ------------- End wait loop -------------------------------------------------

:: ------------- Begin start wait loop -----------------------------------------------
:waitForKiplingExe
	echo "in waitForKiplingExe" >> "%DEBUG_FILE%"
	if exist "%CURRENT_EXEC_PATH%\%DOWNLOADED_APP_NAME%" (
		echo "Kipling Exe has been found: %numTimeout%" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=%WAIT_LOOP_NEXT%
		goto changeStateAndJump
	) else if %numTimeout% leq %timeoutLength% (
		:: echo "Wait for updater timer: %numTimeout%"
		set /a "numTimeout = numTimeout + 1"
		timeout /t 1 /nobreak > NUL
		goto changeStateAndJump
	) else (
		echo "Aborting Program, ""%CURRENT_EXEC_PATH%\%DOWNLOADED_APP_NAME%"" wasn't ever created" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=%WAIT_LOOP_FAIL%
		goto changeStateAndJump
	)
:: ------------- End start wait loop -------------------------------------------------


:: ------------- Begin wait-for-kipling-exit wait loop -----------------------------------------------

:waitForKiplingToQuit
	echo "in waitForKiplingToQuit" >> "%DEBUG_FILE%"
	set IS_KIPLING_RUNNING="YES"
	tasklist /nh /fi "imagename eq nw.exe" | find /i "nw.exe" >nul && (
		echo "Kipling is running" >> "%DEBUG_FILE%"
	) || (
		echo "Kipling is not running" >> "%DEBUG_FILE%"
		set IS_KIPLING_RUNNING="NO"
	)
	if %IS_KIPLING_RUNNING% == "NO" (
		echo "Kipling is not running: %numTimeout%" >> "%DEBUG_FILE%"
		echo "New Program State: %WFKTQ_WAIT_LOOP_NEXT%" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=%WFKTQ_WAIT_LOOP_NEXT%
		goto changeStateAndJump
	) else if %numTimeout% leq %timeoutLength% (
		:: echo "Wait for updater timer: %numTimeout%"
		set /a "numTimeout = numTimeout + 1"
		timeout /t 1 /nobreak > NUL
		goto changeStateAndJump
	) else (
		echo "Aborting Program, Kipling is still running" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=%WFKTQ_WAIT_LOOP_FAIL%
		goto changeStateAndJump
	)
:: ------------- End wait-for-kipling-exit wait loop -------------------------------------------------

:: ------------- Begin Re-Open Kipling with current permissions ----------

:: start "%CURRENT_EXEC_PATH%" "%CURRENT_EXEC_PATH%\%DOWNLOADED_APP_NAME%"
::
:: "start "J:\Users\Chris_2\temp Kipling Upgrading\current exe" "J:\Users\Chris_2\temp Kipling Upgrading\current exe\Kipling.exe""

:: ------------- Begin Re-Open Kipling with current permissions ----------