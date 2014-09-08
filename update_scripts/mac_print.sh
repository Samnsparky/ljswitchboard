#!/bin/sh



WAIT_FOR_EXIT=true
FAILED_TO_EXIT=false
NUM_STALL="0"

echo "Begin Stalling..." >> $FILE_PATH_CUST_B
echo "Begin Stalling..."

while $WAIT_FOR_EXIT; do
	echo "is kipling running?" >> $FILE_PATH_CUST_B
	echo $NUM_STALL >> $FILE_PATH_CUST_B
	echo "Num Stall: $NUM_STALL"
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

echo "Finished Stalling"
