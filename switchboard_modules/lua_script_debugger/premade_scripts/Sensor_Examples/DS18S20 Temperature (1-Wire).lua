print("Communicate with a 1-wire sensor")
count = 0
high = 0
LJ.IntervalConfig(0, 1000)      --set interval to 1000 for 1000ms
while true do
  if LJ.CheckInterval(0) then   --interval completed
	--code here, see the advanced example for now
  end
end