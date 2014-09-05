-- do shell script "bash /Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/update_scripts/kipling/mac_copy_files.sh" with administrator privileges

set netSharingStatus to checkService("com.apple.InternetSharing")
set fileSharingStatus to checkService("com.apple.AppleFileServer")






tell application "Kipling"
    activate
    set application_name to "Installer"
    set application_id to "Installer"
    set process_name to "Installer"
    do shell script "ls ~root" with administrator privileges
	-- display alert "Current Settings" message "Click to change settings" buttons {"Internet " & netSharingStatus, "File Sharing " & fileSharingStatus, "Exit"} default button 3
    display dialog ("hello world" as string)
end tell

-- on GetApplicationCorrespondingToProcess(process_name)
--     tell application "System Events"
--         set process_bid to get the bundle identifier of process process_name
--         set application_name to file of (application processes where bundle identifier is process_bid)
--     end tell
--     return application_name
-- end GetApplicationCorrespondingToProcess
-- 
-- on GetProcessCorrespondingToApplication(application_name)
--     tell application "System Events"
--         set application_id to (get the id of application "Kipling" as string)
--         set process_name to name of (application processes where bundle identifier is application_id)
--     end tell
--     return process_name
-- end GetProcessCorrespondingToApplication
-- 
-- tell application "Finder"
--     display dialog (GetProcessCorrespondingToApplication("Kipling") as string)
--     display dialog (GetApplicationCorrespondingToProcess("Acrobat") as string)
-- end tell

-- choose next action based on the button clicked and the status vairable
on checkService(service)
          do shell script "launchctl list"
          if the result contains service then
                    return "On"
          else
                    return "Off"
          end if
end checkService
 
-- using handlers like the above can also streamline the rest of your script.  the following construction means you only have to write the do shell script line once, rather than the four times you currently do, and makes for much cleaner reading.
 
if the button_pressed starts with "Internet" then
          toggleService("com.apple.InternetSharing", netSharingStatus)
else if the button_pressed starts with "File Sharing" then
          toggleService("com.apple.AppleFileServer", fileSharingStatus)
else
 --exit routine
end if
 
on toggleService(service, currentState)
          if currentState in "On" then
                    set action to "unload"
          else
                    set action to "load"
          end if
          set command to "/bin/launchctl " & action & " -w /System/Library/LaunchDaemons/" & service & ".plist"
          do shell script command user name "adminusername" password "password" with administrator privileges
end toggleService
