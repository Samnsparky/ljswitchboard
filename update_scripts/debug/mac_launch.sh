#!/bin/sh

FILE_PATH_CUST_B="/Users/chrisjohnson/Documents/k3Temp/k3Dump_s_launch.log"
BASE_DIR="/Users/chrisjohnson/Documents/k3Temp/*"
rm $BASE_DIR

MAC_PRINT_SCRIPT="/Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/update_scripts/mac_print.sh"

#"./Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/update_scripts/mac_launch.sh"
#Execute upgrade script and ask for password.
echo "HERE-A" >> $FILE_PATH_CUST_B
echo "HERE-A"
# echo "osascript -e 'do shell script \"bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B\" with administrator privileges'" >> $FILE_PATH_CUST_B
# echo $(osascript -e 'do shell script "bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B" with administrator privileges') >> $FILE_PATH_CUST_B
echo "osascript -e 'do shell script \"bash $MAC_PRINT_SCRIPT\" with administrator privileges'" >> $FILE_PATH_CUST_B
OSA_SCRIPT_START="'do shell script "
OSA_SCRIPT_MID='"bash /Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/update_scripts/mac_print.sh"'
OSA_SCRIPT_END=" with administrator privileges'"
OSA_SCRIPT="osascript -e $OSA_SCRIPT_START$OSA_SCRIPT_MID$OSA_SCRIPT_END"
echo $OSA_SCRIPT
# echo $($OSA_SCRIPT) >> $FILE_PATH_CUST_B
echo "HERE-B"
FULL_SCRIPT="osascript -e 'do shell script bash /Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/update_scripts/mac_print.sh with administrator privileges'"
echo "HERE-C"
echo $FULL_SCRIPT
# echo $($FULL_SCRIPT) >> $FILE_PATH_CUST_B
# osascript \
# 	-e "do shell script" \
# 	-e "bash $MAC_PRINT_SCRIPT" \
# 	-e "with administrator privileges"
# osascript -e 'do shell script "bash item 1 of argv" with administrator privileges' -- ls

# WORKS!!:
# osascript -- - "$MAC_PRINT_SCRIPT" <<'EOF'
# 	on run(argv)
# 		do shell script "bash " & item 1 of argv with administrator privileges
# 	end
# EOF

# Something working with multiple arguments:
# ARG_A="$MAC_PRINT_SCRIPT"
# T_ARG_B=""
# ARG_B="BB"
# ARG_C="CC"
# osascript -- - "$ARG_A" "$ARG_B" "$ARG_C" <<'EOF'
# 	on run(argv)
# 		tell application "Finder" to display dialog "" & item 1 of argv & " " & item 2 of argv & " " & item 3 of argv
# 	end
# EOF
# 

ARG_A="$MAC_PRINT_SCRIPT"
ARG_B="BB"
ARG_C="CC"
osascript -- - "$ARG_A" "$ARG_B" "$ARG_C" <<'EOF'
	on run(argv)
		do shell script "bash " & item 1 of argv & " " & item 2 of argv & " " & item 3 of argv with administrator privileges
	end
EOF

# echo $(osascript -e 'do shell script "bash /Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/update_scripts/mac_print.sh" with administrator privileges') >> $FILE_PATH_CUST_B
echo "HERE-B" >> $FILE_PATH_CUST_B
