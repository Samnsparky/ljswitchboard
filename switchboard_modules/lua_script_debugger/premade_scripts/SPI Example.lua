print ("SPI Example")

--Configure T7's SPI pin's
MB.W(5000, 0, 0)	--CS
MB.W(5001, 0, 1)	--CLK
MB.W(5002, 0, 2)	--MISO
MB.W(5003, 0, 3)	--MOSI

MB.W(5004, 0, 0)	--Mode
MB.W(5005, 0, 0)	--Speed
MB.W(5006, 0, 1)	--Options, enable CS
MB.W(5009, 0, 1)	--Num Bytes to Tx/Rx

i = 0
LJ.IntervalConfig(0, 1000)	--Configure Interval, 1sec
while true do
  if LJ.CheckInterval(0) then
  	print("SPI Rx/Tx", i)
  	MB.W(5010, 0, 43520)
  	MB.W(5007, 0, 1)
  	MB.W(5010, 0, 21760)
  	MB.W(5007, 0, 1)
  	i = i + 1
  end
end