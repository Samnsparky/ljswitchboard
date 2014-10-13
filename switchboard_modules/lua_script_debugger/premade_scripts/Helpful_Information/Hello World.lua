-- hello world.lua
-- the first program in every language

LJ.IntervalConfig(0, 1000)

while true do

  if LJ.CheckInterval(0) then

    --Code to run once per second here.
    print("Hello world, from ",_VERSION,"!\n")

  end

end