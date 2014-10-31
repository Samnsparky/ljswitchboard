#!/bin/sh

FILE_PATH_CUST_A="/Users/chrisjohnson/Documents/k3Temp/k3Dump_s_print.log"

WAIT_FOR_EXIT=true
FAILED_TO_EXIT=false
NUM_STALL="0"

echo "Begin Stalling..." >> $FILE_PATH_CUST_A
echo "Begin Stalling..."
echo "Arg 1:" >> $FILE_PATH_CUST_A
echo "$1" >> $FILE_PATH_CUST_A
echo "Arg 2:" >> $FILE_PATH_CUST_A
echo "$2" >> $FILE_PATH_CUST_A
echo "Arg 3:" >> $FILE_PATH_CUST_A
echo "$3" >> $FILE_PATH_CUST_A
echo "Arg 4:" >> $FILE_PATH_CUST_A
echo "$4" >> $FILE_PATH_CUST_A
echo "Arg 5:" >> $FILE_PATH_CUST_A
echo "$5" >> $FILE_PATH_CUST_A
echo "Arg 6:" >> $FILE_PATH_CUST_A
echo "$6" >> $FILE_PATH_CUST_A

while $WAIT_FOR_EXIT; do
	echo "is kipling running?" >> $FILE_PATH_CUST_A
	echo $NUM_STALL >> $FILE_PATH_CUST_A
	echo "Num Stall: $NUM_STALL"
	sleep 1
	IS_RUNNING=$(pgrep node-webkit)
	if [[ $IS_RUNNING == '' ]]
	then
		echo "K3 isn't running!" >> $FILE_PATH_CUST_A
		WAIT_FOR_EXIT=false
	else
		echo "Kipling is still running :(" >> $FILE_PATH_CUST_A
	fi
	if (("$NUM_STALL" > "10"))
	then
		echo "NUM_STALL is greater than 10, failed to exit" >> $FILE_PATH_CUST_A
		WAIT_FOR_EXIT=false
		FAILED_TO_EXIT=true
	fi
	NUM_STALL=$[$NUM_STALL + 1]
done

echo "Finished Stalling"
