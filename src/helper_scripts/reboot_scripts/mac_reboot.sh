#!/bin/sh
ROOT_PATH="/Users/chrisjohnson/Documents/k3Temp/*"
rm $ROOT_PATH

touch /Users/chrisjohnson/Documents/k3Temp/k3Dump.log

CUR_TIME=$(date +%s)
ROOT_DIR="/Users/chrisjohnson/Documents/k3Temp/k3Dump_"
FILE_NAME=$1
FILE_ENDING=".log"
ALT_FILE_ENDING="(2).log"
CUSTOM_ADDITION="s_"
FILE_PATH=$ROOT_DIR$FILE_NAME$FILE_ENDING
touch $FILE_PATH

BASE_TIME=$(date +%s)
FILE_PATH_CUST=$ROOT_DIR$CUSTOM_ADDITION$CUR_TIME$FILE_ENDING
FILE_PATH_CUST_B=$ROOT_DIR$CUSTOM_ADDITION$CUR_TIME$ALT_FILE_ENDING
touch $FILE_PATH_CUST

echo $2 >> $FILE_PATH
echo $2 >> $FILE_PATH_CUST

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

# Re-build Kipling
echo "re-building Kipling" >> $FILE_PATH_CUST_B
TEMP_CURRENT_DIRECTORY=$(pwd)
cd /Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment
if [[ $2 == '' ]]
then
	echo "cmd: ./run.sh buildAndRun" >> $FILE_PATH_CUST_B
	echo "Starting to build K3"
	echo $(./run.sh buildAndRun) >> $FILE_PATH_CUST_B
	echo "finished building K3"
else
	echo "cmd: ./run.sh build" >> $FILE_PATH_CUST_B
	echo $(./run.sh build) >> $FILE_PATH_CUST_B
fi
echo "HERE?" >> $FILE_PATH_CUST_B
echo $(cd $TEMP_CURRENT_DIRECTORY) >> $FILE_PATH_CUST_B
echo "finished building Kipling" >> $FILE_PATH_CUST_B

if [[ $2 == '' ]]
then
	echo "started Kipling via run.sh buildAndRun" >> $FILE_PATH_CUST_B
else
	# Try to re-open kipling
	echo "re-opening Kipling" >> $FILE_PATH_CUST_B
	echo "opening file:" >> $FILE_PATH_CUST_B
	echo $2 >> $FILE_PATH_CUST_B
	echo $(open $2) >> $FILE_PATH_CUST_B
fi
echo "finished Starting Kipling" >> $FILE_PATH_CUST_B


WAIT_FOR_OPEN=true
FAILED_TO_OPEN=false
NUM_STALL="0"
while $WAIT_FOR_OPEN; do
	echo "has kipling started?" >> $FILE_PATH_CUST_B
	echo $NUM_STALL >> $FILE_PATH_CUST_B
	sleep 1
	IS_RUNNING=$(pgrep node-webkit)
	if [[ $IS_RUNNING == '' ]]
	then
		echo "K3 isn't running :(" >> $FILE_PATH_CUST_B
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

