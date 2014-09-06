#!/bin/sh

CURRENT_EXEC_PATH=$1
DOWNLOADED_FILE_PATH=$2
DOWNLOADED_APP_NAME=$3
REBOOT_SCRIPT_PATH=$4
MAC_COPY_SCRIPT="$REBOOT_SCRIPT_PATH/kipling/mac_copy_files.sh"

# Code for creating various debugging files
ROOT_PATH="/Users/chrisjohnson/Documents/k3Temp/*"
rm $ROOT_PATH

BASIC_FILE="/Users/chrisjohnson/Documents/k3Temp/testFile.log"
echo "Hello World!" >> $BASIC_FILE

CUR_TIME=$(date +%s)
ROOT_DIR="/Users/chrisjohnson/Documents/k3Temp/k3Dump_"
FILE_ENDING=".log"
ALT_FILE_ENDING="(2).log"
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

#-------------- Begin Exiting Kipling ------------------------------------------
# Instruct Kipling to quit (node-webkit process)
pkill node-webkit

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
	rmdir $CURRENT_EXEC_PATH//$CUR_TIME
	# Execute upgrade script
	echo "bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B" >> $FILE_PATH_CUST_B
	bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $FILE_PATH_CUST_B
else
	#Execute upgrade script and ask for password.
	echo "bash $REBOOT_SCRIPT_PATH/kipling/mac_request_permissions.sh $1 $2 $3 $4 $FILE_PATH_CUST_B $MAC_COPY_SCRIPT" >> $FILE_PATH_CUST_B
	bash $REBOOT_SCRIPT_PATH/kipling/mac_request_permissions.sh $1 $2 $3 $4 $FILE_PATH_CUST_B $MAC_COPY_SCRIPT
fi

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

# Change permissions on downloaded .app to allow it to be executed
echo "chmod -R +x $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME" >> $FILE_PATH_CUST_B
echo $(chmod -R +x $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME) >> $FILE_PATH_CUST_B

# Edit the file so that the warning "This file was downloaded from the internet" doesn't happen.
echo "xattr -d -r com.apple.quarantine $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME" >> $FILE_PATH_CUST_B
echo $(xattr -d -r com.apple.quarantine $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME) >> $FILE_PATH_CUST_B

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


# sleep 5
# touch $FILE_PATH_CUST_B
# echo $2 >> $FILE_PATH_CUST_B
# echo "Opening Program" >> $FILE_PATH_CUST_B
# echo $(open $2) >> $FILE_PATH_CUST_B
# echo "Opened Program" >> $FILE_PATH_CUST_B

