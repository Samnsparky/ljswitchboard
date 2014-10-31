--Welcome to LabJack Lua Scripting!
--See any of the examples to get started!

--Overview----------------------------------------------------------------

--The T7 has an internal Lua v5.1 interpreter and compiler which are
--used to build and execute small Lua scripts.  This section
--of Kipling is dedicated to transferring the script files to the
--T7, and then reading the interpreted output in the console.  Because 
--scripts are sent as plain text to the T7, compiler errors are NOT CAUGHT
--by this code environment, so if the T7 resets, it's because there
--are errors in the script.  We understand that this can be frustrating,
--so we hope to catch and report compiler errors in Kipling in the future.


--Helpful tips-------------------------------------------------------------

--Do not mix Tab and Space characters (examples use 2 spaces)
--Make sure that all variables are defined
--'if' statements should be followed by 'then'
--'while' and 'if' statements require an 'end' after the code block
--We recommend limiting script length to ~300 lines or less
--Some functions of Lua are not available, and will reset the T7 if used
--See 'LabJack Lua functions' code example for a list of integrated functions
--Functions are limited to those in eLua core (embedded Lua)
--Useful demo tool            http://www.lua.org/demo.html
--Register Matrix(Modbus Map) http://labjack.com/support/modbus/map
--Scripting information       http://labjack.com/support/datasheets/t7/scripting


--Other Comments-----------------------------------------------------------

--We ask that if you are having problems please contact us, but understand
--that we are resource constrained on this project.
--Send questions and feedback to support@labjack.com

print("Welcome, please Load an example to get started!")