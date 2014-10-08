
# Save script arguments
CURRENT_EXEC_PATH=$1
DOWNLOADED_FILE_PATH=$2
DOWNLOADED_APP_NAME=$3
REBOOT_SCRIPT_PATH=$4
FILE_PATH_CUST_B=$5


# Change directories to the current active directory
echo "starting directory:" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B
echo $(cd $CURRENT_EXEC_PATH) >> $FILE_PATH_CUST_B
echo "Files in CURRENT_EXEC_PATH directory" >> $FILE_PATH_CUST_B
echo "2nd directory:" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B
cd $CURRENT_EXEC_PATH
echo "2nd(2) directory:" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B

FILE_PATH_CUST_DEB="/usr/local/share/LabJack/K3/updater/mac_copy_files.txt"
echo "HERERERE" >> $FILE_PATH_CUST_DEB
echo "Script Arguments 1:" >> $FILE_PATH_CUST_DEB
echo $1 >> $FILE_PATH_CUST_DEB
echo "Script Arguments 2:" >> $FILE_PATH_CUST_DEB
echo $2 >> $FILE_PATH_CUST_DEB
echo "Script Arguments 3:" >> $FILE_PATH_CUST_DEB
echo $3 >> $FILE_PATH_CUST_DEB
echo "Script Arguments 4:" >> $FILE_PATH_CUST_DEB
echo $4 >> $FILE_PATH_CUST_DEB
echo "Script Arguments 5:" >> $FILE_PATH_CUST_DEB
echo $5 >> $FILE_PATH_CUST_DEB

# FILES_IN_DIRECTORY=$(ls)
FILES_TO_DELETE[0]="Kipling.app"
FILES_TO_DELETE[1]="switchboard_modules"
# for FILE_IN_DIRECTORY in $FILES_IN_DIRECTORY; do
for FILE_IN_DIRECTORY in ${FILES_TO_DELETE[@]}; do
	echo "rm -r $CURRENT_EXEC_PATH/$FILE_IN_DIRECTORY" >> $FILE_PATH_CUST_B
	# Delete the found file
	rm -r $CURRENT_EXEC_PATH/$FILE_IN_DIRECTORY
done

# Change directories to the Downloaded files directory
echo "3rd directory:" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B
echo $(cd $DOWNLOADED_FILE_PATH) >> $FILE_PATH_CUST_B
echo "Files in DOWNLOADED_FILE_PATH directory" >> $FILE_PATH_CUST_B
echo "4th directory:" >> $FILE_PATH_CUST_B
echo $(pwd) >> $FILE_PATH_CUST_B

# FILES_IN_DIRECTORY=$(ls)
FILES_TO_COPY[0]="Kipling.app"
FILES_TO_COPY[1]="switchboard_modules"
# for FILE_IN_DIRECTORY in $FILES_IN_DIRECTORY; do
for FILE_IN_DIRECTORY in ${FILES_TO_COPY[@]}; do
	echo "cp -r $DOWNLOADED_FILE_PATH$FILE_IN_DIRECTORY $CURRENT_EXEC_PATH" >> $FILE_PATH_CUST_B
	# Copy the found file to the CURRENT_EXEC_PATH
	cp -r $DOWNLOADED_FILE_PATH$FILE_IN_DIRECTORY $CURRENT_EXEC_PATH
done

# Change permissions on downloaded .app to allow it to be executed
echo "chmod -R +x $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME" >> $FILE_PATH_CUST_B
echo $(chmod -R +x $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME) >> $FILE_PATH_CUST_B

# Edit the file so that the warning "This file was downloaded from the internet" doesn't happen.
echo "xattr -d -r com.apple.quarantine $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME" >> $FILE_PATH_CUST_B
echo $(xattr -d -r com.apple.quarantine $CURRENT_EXEC_PATH/$DOWNLOADED_APP_NAME) >> $FILE_PATH_CUST_B