print("Communicate with an SCA3000 SPI accelerometer")

LJ.IntervalConfig(0, 1000)      --set interval to 1000 for 1000ms
while true do
  if LJ.CheckInterval(0) then   --interval completed
	--code here, no SPI example code completed yet
  end
end