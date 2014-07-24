; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "Kipling"
#define MyAppVersion "3.0.0.1"
#define MyAppPublisher "LabJack, Corp."
#define MyAppURL "http://www.labjack.com/"
#define MyAppExeName "Kipling.exe"
#define MyAppID "{571B30F3-ECF9-46b5-9572-9AD6ACA5E9C6}"
#define MyAppVersionNum "0.0.1"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{#MyAppID}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputBaseFilename=setup
Compression=lzma
SolidCompression=yes


[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "C:\Users\Rory\Desktop\rob_kipling_build\ljswitchboard\deploy\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files'

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{pf32}\{#MyAppName}\Kipling.ico"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{pf32}\{#MyAppName}\Kipling.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// NOTE: https://code.google.com/p/lextudio/source/browse/setup

// ======================================
// Testing version number string
// ======================================
function GetNumber(var temp: String): Integer;
var
  part: String;
  pos1: Integer;
begin
  if Length(temp) = 0 then
  begin
    Result := -1;
    Exit;
  end;
    pos1 := Pos('.', temp);
    if (pos1 = 0) then
    begin
      Result := StrToInt(temp);
    temp := '';
    end
    else
    begin
    part := Copy(temp, 1, pos1 - 1);
      temp := Copy(temp, pos1 + 1, Length(temp));
      Result := StrToInt(part);
    end;
end;
 
function CompareInner(var temp1, temp2: String): Integer;
var
  num1, num2: Integer;
begin
    num1 := GetNumber(temp1);
  num2 := GetNumber(temp2);
  if (num1 = -1) or (num2 = -1) then
  begin
    Result := 0;
    Exit;
  end;
      if (num1 > num2) then
      begin
        Result := 1;
      end
      else if (num1 < num2) then
      begin
        Result := -1;
      end
      else
      begin
        Result := CompareInner(temp1, temp2);
      end;
end;
 
function CompareVersion(str1, str2: String): Integer;
var
  temp1, temp2: String;
begin
    temp1 := str1;
    temp2 := str2;
    Result := CompareInner(temp1, temp2);
end;
function InitializeSetup(): Boolean;
var
  oldVersion: String;
  uninstaller: String;
  ErrorCode: Integer;
begin
  if RegKeyExists(HKEY_LOCAL_MACHINE,
    'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppID}_is1') then
  begin
    RegQueryStringValue(HKEY_LOCAL_MACHINE,
      'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppID}_is1',
      'DisplayVersion', oldVersion);
    if (CompareVersion(oldVersion, '{#MyAppVersionNum}') <> 0) then
    begin
      if MsgBox('Version ' + oldVersion + ' of {#MyAppName}V3 is already installed. Do you want to Uninstall and Re-install Kipling? Yes will re-install Kipling, No will exit the installer.',
        mbConfirmation, MB_YESNO) = IDYES then
      begin
        Result := True;
      end
      else
      begin
          RegQueryStringValue(HKEY_LOCAL_MACHINE,
            'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppID}_is1',
            'UninstallString', uninstaller);
          ShellExec('runas', uninstaller, '/SILENT', '', SW_HIDE, ewWaitUntilTerminated, ErrorCode);
          Result := True;
      end;
    end
    else
    begin
      MsgBox('Version ' + oldVersion + ' of {#MyAppName} is already installed. This installer will exit.',
        mbInformation, MB_OK);
      Result := False;
    end;
  end
  else
  begin
    Result := True;
  end;
end;

