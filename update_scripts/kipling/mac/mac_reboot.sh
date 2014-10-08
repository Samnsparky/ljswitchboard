#!/bin/sh


CURRENT_EXEC_PATH=$1
DOWNLOADED_FILE_PATH=$2
DOWNLOADED_APP_NAME=$3
REBOOT_SCRIPT_PATH=$4
MAC_COPY_SCRIPT="$REBOOT_SCRIPT_PATH/kipling/mac/mac_copy_files.sh"
chmod +x $MAC_COPY_SCRIPT

# Code for creating various debugging files
BASE_PATH="/usr/local/share/LabJack/K3"
ROOT_PATH="$BASE_PATH/updater"

# Check to see if the /updater file path already exists, if so delete it
FILES_IN_DIRECTORY=$(ls $BASE_PATH)
for FILE_IN_DIRECTORY in $FILES_IN_DIRECTORY; do
	if [[ $FILE_IN_DIRECTORY == 'updater' ]]
	then
		rm -r $ROOT_PATH
	fi
done

# Make the /updater file path for debuggiong purposes
mkdir $ROOT_PATH

# Clean the directory
DIR_TO_CLEAN="$ROOT_PATH/*"
rm $DIR_TO_CLEAN

# Print out to a basic file
BASIC_FILE="$ROOT_PATH/testFile.log"
echo "Hello World!" >> $BASIC_FILE

CUR_TIME=$(date +%s)
ROOT_DIR="$ROOT_PATH/k3Dump_"
FILE_ENDING=".log"
ALT_FILE_ENDING="_2.log"
ALT_FILE_ENDINGB="_3.log"
CUSTOM_ADDITION="s_"


BASE_TIME=$(date +%s)
FILE_PATH_CUST=$ROOT_DIR$CUSTOM_ADDITION$CUR_TIME$FILE_ENDING
touch $FILE_PATH_CUST

echo "Script Arguments 1:" >> $FILE_PATH_CUST
echo $1 >> $FILE_PATH_CUST

echo "Script Arguments 2:" >> $FILE_PATH_CUST
echo $2 >> $FILE_PATH_CUST

echo "Script Arguments 3:" >> $FILE_PATH_CUST
echo $3 >> $FILE_PATH_CUST

echo "Script Arguments 4:" >> $FILE_PATH_CUST
echo $4 >> $FILE_PATH_CUST

FILE_PATH_CUST_B=$ROOT_DIR$CUSTOM_ADDITION$CUR_TIME$ALT_FILE_ENDING
FILE_PATH_CUST_C=$ROOT_DIR$CUSTOM_ADDITION$CUR_TIME$ALT_FILE_ENDINGB
#-------------- Begin Exiting Kipling ------------------------------------------
# Instruct Kipling to quit (node-webkit process)
pkill node-webkit
echo "QUIT KIPLING"

WAIT_FOR_EXIT=true
FAILED_TO_EXIT=false
NUM_STALL="0"

echo "Begin Stalling..." >> $FILE_PATH_CUST_B
while $WAIT_FOR_EXIT; do
	echo "is kipling running?" >> $FILE_PATH_CUST_B
	echo $NUM_STALL >> $FILE_PATH_CUST_B
	sleep 1
	IS_RUNNING=$(pgrep node-webkit)
	if [[ $IS_RUNNING == '' ]]
	then
		echo "K3 isn't running!" >> $FILE_PATH_CUST_B
		WAIT_FOR_EXIT=false
	else
		echo "Kipling is still running :(" >> $FILE_PATH_CUST_B
	fi
	if (("$NUM_STALL" > "10"))
	then
		echo "NUM_STALL is greater than 10, failed to exit" >> $FILE_PATH_CUST_B
		WAIT_FOR_EXIT=false
		FAILED_TO_EXIT=true
	fi
	NUM_STALL=$[$NUM_STALL + 1]
done
#-------------- Finished Exiting Kipling ---------------------------------------

# Check to see if write script has write access to the directory, try to make a folder
echo "mkdir $CURRENT_EXEC_PATH/$CUR_TIME" >> $FILE_PATH_CUST_B
mkdir $CURRENT_EXEC_PATH/$CUR_TIME
HAS_WRITE_PERMISSION=$([[ $? -ne 0 ]] && echo "NO" || echo "YES")

echo "Does Script have write permission: $HAS_WRITE_PERMISSION" >> $FILE_PATH_CUST_B
if [[ $HAS_WRITE_PERMISSION == 'YES' ]]
then
	echo "rmdir $CURRENT_EXEC_PATH/$CUR_TIME" >> $FILE_PATH_CUST_B
	rmdir $CURRENT_EXEC_PATH/$CUR_TIME
	# Execute upgrade script
	echo "bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B" >> $FILE_PATH_CUST_B

	ARG_A="$MAC_COPY_SCRIPT"
	ARG_B="$1"
	ARG_C="$2"
	ARG_D="$3"
	ARG_E="$4"
	ARG_F="$FILE_PATH_CUST_B"
	FILE_PATH_CUST_DEB="/usr/local/share/LabJack/K3/updater/mac_reboot.txt"
	echo "HERERERE-B" >> $FILE_PATH_CUST_DEB
	echo "Script Arguments A:" >> $FILE_PATH_CUST_DEB
	echo $ARG_A >> $FILE_PATH_CUST_DEB
	echo "Script Arguments B:" >> $FILE_PATH_CUST_DEB
	echo $ARG_B >> $FILE_PATH_CUST_DEB
	echo "Script Arguments C:" >> $FILE_PATH_CUST_DEB
	echo $ARG_C >> $FILE_PATH_CUST_DEB
	echo "Script Arguments D:" >> $FILE_PATH_CUST_DEB
	echo $ARG_D >> $FILE_PATH_CUST_DEB
	echo "Script Arguments E:" >> $FILE_PATH_CUST_DEB
	echo $ARG_E >> $FILE_PATH_CUST_DEB
	echo "Script Arguments F:" >> $FILE_PATH_CUST_DEB
	echo $ARG_F >> $FILE_PATH_CUST_DEB

	bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B
else
	#Execute upgrade script and ask for password.
	echo "osascript -e 'do shell script \"bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B\" with administrator privileges'" >> $FILE_PATH_CUST_B
	# echo $(osascript -e 'do shell script "bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B" with administrator privileges') >> $FILE_PATH_CUST_B
	# echo "osascript -e 'do shell script \"bash $MAC_PRINT_SCRIPT\" with administrator privileges'" >> $FILE_PATH_CUST_B
	# echo $(osascript -e 'do shell script "bash $MAC_PRINT_SCRIPT" with administrator privileges') >> $FILE_PATH_CUST_B

ARG_A="$MAC_COPY_SCRIPT"
ARG_B="$1"
ARG_C="$2"
ARG_D="$3"
ARG_E="$4"
ARG_F="$FILE_PATH_CUST_B"
FILE_PATH_CUST_DEB="/usr/local/share/LabJack/K3/updater/mac_reboot.txt"
echo "HERERERE-A" >> $FILE_PATH_CUST_DEB
echo "Script Arguments A:" >> $FILE_PATH_CUST_DEB
echo $ARG_A >> $FILE_PATH_CUST_DEB
echo "Script Arguments B:" >> $FILE_PATH_CUST_DEB
echo $ARG_B >> $FILE_PATH_CUST_DEB
echo "Script Arguments C:" >> $FILE_PATH_CUST_DEB
echo $ARG_C >> $FILE_PATH_CUST_DEB
echo "Script Arguments D:" >> $FILE_PATH_CUST_DEB
echo $ARG_D >> $FILE_PATH_CUST_DEB
echo "Script Arguments E:" >> $FILE_PATH_CUST_DEB
echo $ARG_E >> $FILE_PATH_CUST_DEB
echo "Script Arguments F:" >> $FILE_PATH_CUST_DEB
echo $ARG_F >> $FILE_PATH_CUST_DEB

osascript -- - "$ARG_A" "$ARG_B" "$ARG_C" "$ARG_D" "$ARG_E" "$ARG_F" <<'EOF'
	on run(argv)
		do shell script "bash " & item 1 of argv & " " & item 2 of argv & " " & item 3 of argv & " " & item 4 of argv & " " & item 5 of argv & " " & item 6 of argv with administrator privileges
	end
EOF
fi


# Mac update code has been moved to the /kipling/mac_copy_files.sh script
# # Change directories to the current active directory
# echo "starting directory:" >> $FILE_PATH_CUST_B
# echo $(pwd) >> $FILE_PATH_CUST_B
# echo $(cd $CURRENT_EXEC_PATH) >> $FILE_PATH_CUST_B
# echo "Files in CURRENT_EXEC_PATH directory" >> $FILE_PATH_CUST_B
# echo "2nd directory:" >> $FILE_PATH_CUST_B
# echo $(pwd) >> $FILE_PATH_CUST_B
# cd $CURRENT_EXEC_PATH
# echo "2nd(2) directory:" >> $FILE_PATH_CUST_B
# echo $(pwd) >> $FILE_PATH_CUST_B

# # FILES_IN_DIRECTORY=$(ls)
# FILES_TO_DELETE[0]="Kipling.app"
# FILES_TO_DELETE[1]="switchboard_modules"
# # for FILE_IN_DIRECTORY in $FILES_IN_DIRECTORY; do
# for FILE_IN_DIRECTORY in ${FILES_TO_DELETE[@]}; do
# 	echo "rm -r $CURRENT_EXEC_PATH/$FILE_IN_DIRECTORY" >> $FILE_PATH_CUST_B
# 	# Delete the found file
# 	rm -r $CURRENT_EXEC_PATH/$FILE_IN_DIRECTORY
# done

# # Change directories to the Downloaded files directory
# echo "3rd directory:" >> $FILE_PATH_CUST_B
# echo $(pwd) >> $FILE_PATH_CUST_B
# echo $(cd $DOWNLOADED_FILE_PATH) >> $FILE_PATH_CUST_B
# echo "Files in DOWNLOADED_FILE_PATH directory" >> $FILE_PATH_CUST_B
# echo "4th directory:" >> $FILE_PATH_CUST_B
# echo $(pwd) >> $FILE_PATH_CUST_B

# # FILES_IN_DIRECTORY=$(ls)
# FILES_TO_COPY[0]="Kipling.app"
# FILES_TO_COPY[1]="switchboard_modules"
# # for FILE_IN_DIRECTORY in $FILES_IN_DIRECTORY; do
# for FILE_IN_DIRECTORY in ${FILES_TO_COPY[@]}; do
# 	echo "cp -r $DOWNLOADED_FILE_PATH$FILE_IN_DIRECTORY $CURRENT_EXEC_PATH" >> $FILE_PATH_CUST_B
# 	# Copy the found file to the CURRENT_EXEC_PATH
# 	cp -r $DOWNLOADED_FILE_PATH$FILE_IN_DIRECTORY $CURRENT_EXEC_PATH
# done

#-------------- Begin Launching Kipling ----------------------------------------

# Change directories back to the currently executing directory
echo "5th directory:" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B
echo $(cd $CURRENT_EXEC_PATH) >> $FILE_PATH_CUST_B
echo "Files in CURRENT_EXEC_PATH directory" >> $FILE_PATH_CUST_B
echo "6th directory:" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B

# Try to re-open kipling
echo "re-opening Kipling" >> $FILE_PATH_CUST_B
echo "opening file:" >> $FILE_PATH_CUST_B
echo "$CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B

# Open the .app
echo "open $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME" >> $FILE_PATH_CUST_B
echo $(open $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME) >> $FILE_PATH_CUST_B

echo "finished Starting Kipling" >> $FILE_PATH_CUST_B


WAIT_FOR_OPEN=true
FAILED_TO_OPEN=false
NUM_STALL="0"
while $WAIT_FOR_OPEN; do
	echo "has kipling started?" >> $FILE_PATH_CUST_B
	echo $NUM_STALL >> $FILE_PATH_CUST_B
	sleep 2
	IS_RUNNING=$(pgrep node-webkit)
	if [[ $IS_RUNNING == '' ]]
	then
		echo "K3 isn't running :(" >> $FILE_PATH_CUST_B
		echo $(open $DOWNLOADED_APP_NAME) >> $FILE_PATH_CUST_B
	else
		echo "Kipling is running!! Yay!" >> $FILE_PATH_CUST_B
		WAIT_FOR_OPEN=false
	fi
	if (("$NUM_STALL" > "10"))
	then
		echo "NUM_STALL is greater than 10, failed to open" >> $FILE_PATH_CUST_B
		WAIT_FOR_OPEN=false
		FAILED_TO_OPEN=true
	fi
	NUM_STALL=$[$NUM_STALL + 1]
done

# rm -r $DOWNLOADED_FILE_PATH

