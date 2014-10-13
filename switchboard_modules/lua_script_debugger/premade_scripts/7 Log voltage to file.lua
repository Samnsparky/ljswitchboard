print("Log voltage to file.  Voltage measured on AIN1.  Store value every 1 second for 10 seconds")
Fname = "log1.csv"
voltage = 0
count = 0
timestamp_s = 0
file = assert(io.open(Fname, "w"))  --create and open file for write access

MB.W(48005,0,1)                     --ensure analog is on

LJ.IntervalConfig(0, 1000)          --set interval to 1000 for 1000ms

while true do
  if LJ.CheckInterval(0) then     	--interval completed
    voltage = MB.R(2, 3)        	--voltage on AIN1, address is 2, type is 3
    timestamp_s = MB.R(61500, 1)	--read the RTC to get a timestamp in seconds
    print("AIN1: ", voltage)
    print("Timestamp: ", timestamp_s)
    file:write(string.format("%.6f\r\n", voltage))
    count = count + 1
  end
  if count >= 10 then
    break
  end
end
file:close()
print("Done acquiring data. Now read and display file contents.")
file = assert(io.open(Fname, "r"))
local line = file:read("*all")
file:close()
print(line)