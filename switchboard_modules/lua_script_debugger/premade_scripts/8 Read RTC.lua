print("Read the real-time-clock RTC, print the timestamp. Updates every 64 sec")
--The RTC is only inluded on the -Pro variant of the T7

timestamp_s = 0

LJ.IntervalConfig(0, 1000)          --set interval to 1000 for 1000ms
while true do
  if LJ.CheckInterval(0) then     	--interval completed
    timestamp_s = MB.R(61500, 1)	--RTC system time in seconds is address 61500, type is 1
    print("RTC: ", timestamp_s)
  end
end