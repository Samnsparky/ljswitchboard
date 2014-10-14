print("Read the real-time-clock RTC, print the timestamp.")
--The RTC is only inluded on the -Pro variant of the T7
--Address 61510 has the timestamp in a format that can be read by Lua scripts
--Address 61500 should not be used due to truncation during conversion from u32 to float

--store the time in a table, so that saving inside a file is easy
table = {}
table[1] = 0    --year
table[2] = 0    --month
table[3] = 0    --day
table[4] = 0    --hour
table[5] = 0    --minute
table[6] = 0    --second


LJ.IntervalConfig(0, 4000)
while true do
  if LJ.CheckInterval(0) then
    table, error = MB.RA(61510, 0, 6) 
    print("Year: ", table[1])
    print("Month: ", table[2])
    print("Day: ", table[3])
    print("Hour: ", table[4])
    print("Minute:", table[5])
    print("Second:", table[6])
    print("\n")
  end
end