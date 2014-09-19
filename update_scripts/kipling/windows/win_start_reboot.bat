@echo off
setlocal ENABLEDELAYEDEXPANSION ENABLEEXTENSIONS
title Kipling Rebooter

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

:: Setup some required file paths
set WIN_REBOOT_BAT=%REBOOT_SCRIPT_PATH%\win_reboot.bat
set WIN_UPDATE_SCRIPT=%REBOOT_SCRIPT_PATH%\win_update.bat
set WIN_UPDATE_EXE=%REBOOT_SCRIPT_PATH%\Kipling Updater.exe
set FILE_TO_CREATE=%DEBUG_FILE_DIRECTORY%\kiplingUpdate.tst
set FILE_TO_CONTINUE_UPGRADE=%DEBUG_FILE_DIRECTORY%\launchUpdate.tst
set DEBUG_FILE=%DEBUG_FILE_DIRECTORY%\Debug_win_reboot_bat.txt
set DEBUG_FILE=%DEBUG_FILE_DIRECTORY%\Debug_win_start_reboot_bat.txt
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
ec

echo "CURRENT_EXEC_PATH: %CURRENT_EXEC_PATH%"
echo "DOWNLOADED_FILE_PATH: %DOWNLOADED_FILE_PATH%"
echo "DOWNLOADED_APP_NAME: %DOWNLOADED_APP_NAME%"
echo "REBOOT_SCRIPT_PATH: %REBOOT_SCRIPT_PATH%"
echo "DEBUG_FILE_DIRECTORY: %DEBUG_FILE_DIRECTORY%"
echo "WIN_UPDATE_SCRIPT: %WIN_UPDATE_SCRIPT%"
echo "WIN_UPDATE_EXE: %WIN_UPDATE_EXE%"
echo "FILE_TO_CREATE: %FILE_TO_CREATE%"
echo "DEBUG_FILE: %DEBUG_FILE%"
echo "**"
echo "**"

echo "Configuring vbs file" >> "%DEBUG_FILE%"
echo set WIN_SCRIPT_HOST=CreateObject^("WScript.Shell"^) > "%DOWNLOADED_FILE_PATH%\startUpgrade.vbs"
echo WIN_SCRIPT_HOST.Run """%WIN_REBOOT_BAT%"" ""%CURRENT_EXEC_PATH%"" ""%DOWNLOADED_FILE_PATH%"" ""%DOWNLOADED_APP_NAME%"" ""%REBOOT_SCRIPT_PATH%"" ""%DEBUG_FILE_DIRECTORY%""", 0 >> "%DOWNLOADED_FILE_PATH%\startUpgrade.vbs"
echo "Starting vbs file" >> "%DEBUG_FILE%"
CSCRIPT "%DOWNLOADED_FILE_PATH%\startUpgrade.vbs"
del "%DOWNLOADED_FILE_PATH%\startUpgrade.vbs"
echo "Deleted vbs file" >> "%DEBUG_FILE%"

:: start "" "win_reboot.bat" "%arg1%" "%arg2%" "%arg3%" "%arg4%" "%arg5%"
echo "HERERE????" >> "%DEBUG_FILE%"

set /a "numTimeout = 0"
set /a "timeoutLength = 400"
set WAIT_FILE_NAME="%FILE_TO_CREATE%"
set PROGRAM_STATE=WAITING
set WAIT_LOOP_NEXT=CONTINUE_UPGRADE
set WAIT_LOOP_FAIL=ABORT_UPGRADE

:changeStateAndJump
	if "%PROGRAM_STATE%" == "WAITING" (
		goto waitingForUpgrade
	) else if "%PROGRAM_STATE%" == "ABORT_UPGRADE" (
		echo "abort upgrade case 0" >> "%DEBUG_FILE%"
		echo ABORT UPGRADE
		timeout /t 1 /nobreak > NUL
		echo "abort upgrade case 1" >> "%DEBUG_FILE%"
		echo ABORT UPGRADE
		timeout /t 1 /nobreak > NUL
		echo "abort upgrade case 2" >> "%DEBUG_FILE%"
		echo ABORT UPGRADE
		timeout /t 1 /nobreak > NUL
		echo "abort upgrade case 3" >> "%DEBUG_FILE%"
		echo ABORT UPGRADE
		set PROGRAM_STATE=TERMINATE
		goto changeStateAndJump
	) else if "%PROGRAM_STATE%" == "CONTINUE_UPGRADE" (
		echo "continue upgrade case 0" >> "%DEBUG_FILE%"
		echo QUIT KIPLING
		timeout /t 1 /nobreak > NUL
		echo "continue upgrade case 1" >> "%DEBUG_FILE%"
		echo QUIT KIPLING
		timeout /t 1 /nobreak > NUL
		echo "continue upgrade case 2" >> "%DEBUG_FILE%"
		echo QUIT KIPLING
		timeout /t 1 /nobreak > NUL
		echo "continue upgrade case 3" >> "%DEBUG_FILE%"
		echo QUIT KIPLING
		set PROGRAM_STATE=TERMINATE
		goto changeStateAndJump
	) else (
		echo "in terminate case" >> "%DEBUG_FILE%"
		goto terminateProgram
	)

:waitingForUpgrade
	echo "in waitForContinueUpgrade" >> "%DEBUG_FILE%"
	if exist %WAIT_FILE_NAME% (
		echo "Removing temp file: %WAIT_FILE_NAME%" >> "%DEBUG_FILE%"
		timeout /t 1 /nobreak > NUL
		set PROGRAM_STATE=%WAIT_LOOP_NEXT%
		goto changeStateAndJump
	) else if %numTimeout% leq %timeoutLength% (
		echo "Waiting to continue: %numTimeout%"
		echo "Wait for updater timer: %numTimeout%" >> "%DEBUG_FILE%"
		set /a "numTimeout = numTimeout + 1"
		timeout /t 1 /nobreak > NUL
		goto changeStateAndJump
	) else (
		echo "Aborting Program, didn't hear response from win_reboot.bat" >> "%DEBUG_FILE%"
		set PROGRAM_STATE=%WAIT_LOOP_FAIL%
		goto changeStateAndJump
	)

:terminateProgram
	echo "terminating win_start_reboot" >> "%DEBUG_FILE%"
	exit 0

:: ------------- Define random subroutines
:unquote
	set %1=%~2
	goto :eof