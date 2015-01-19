print("Log voltage to file.  Voltage measured on AIN1 every 500ms.  Store values every 5 seconds")
--Requires micro SD Card installed inside the T7 or T7-Pro.
--Requires FW 1.0146 or newer.
--This example is for logging to file while using WiFi, since WiFi needs 5s or more to initialize
--without comm. to/from the uSD card. http://labjack.com/support/datasheets/t7/sd-card
--Timestamp (real-time-clock) available on T7-Pro only
--Some helpful Lua file operations in section 5.7 http://www.lua.org/manual/5.1/manual.html#5.7
--Some file info docs in 21.2 of the Lua documentation http://www.lua.org/pil/21.2.html

Filename = "log2.csv"
voltage = 0
indexVal = 1
delimiter = ","
dateStr = ""
voltageStr = ""

DACinterval = 500     --interval in ms, 500 for 500ms, should divide evenly into SDCard interval
SDCardinterval = 5000 --inerval in ms, 5000 for 5 seconds
numDAC = math.floor(SDCardinterval/DACinterval)

DataTable = {}
stringTable = {}

for i=1, numDAC do
  DataTable[i] = 0
  stringTable[i] = "bar"
end


dateTbl = {}
dateTbl[1] = 0    --year
dateTbl[2] = 0    --month
dateTbl[3] = 0    --day
dateTbl[4] = 0    --hour
dateTbl[5] = 0    --minute
dateTbl[6] = 0    --second


MB.W(48005,0,1)                         --ensure analog is on

LJ.IntervalConfig(0, DACinterval)       
LJ.IntervalConfig(1, SDCardinterval)


while true do
  if LJ.CheckInterval(0) then           --DAC interval completed
    DataTable[indexVal] = MB.R(2, 3)    --voltage on AIN1, address is 2, type is 3
    dateTbl, error = MB.RA(61510, 0, 6) --Read the RTC timestamp, -Pro only
    print("AIN1: ", DataTable[indexVal], "V")
    dateStr = string.format("%04d/%02d/%02d %02d:%02d.%02d", dateTbl[1], dateTbl[2], dateTbl[3], dateTbl[4], dateTbl[5], dateTbl[6])
    voltageStr = string.format("%.6f", DataTable[indexVal])
    stringTable[indexVal] = dateStr..delimiter..voltageStr.."\n"
    indexVal = indexVal + 1
  end
  if LJ.CheckInterval(1) then           --SD Card interval completed, write to file
    local f = nil
    local i = 1
    f = io.open(Filename, "r")

    indexVal = 1

    if f ~= nil then            --file exists
      f:close()
      f = io.open(Filename, "a+") --'a+' append update mode, previous data is preserved, writing is only allowed at the end of file
      print ("Appending to file")
    else
      f = io.open(Filename, "w")  --'w' create or replace file.  Writes start at the beginning of the file
      print ("Creating new file")
    end

    for i=1, numDAC do  
      f:write(stringTable[i])   --write to file
    end

    f:close()

  end
end