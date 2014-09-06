echo "in mac_request_permissions.sh" >> $5

CURRENT_EXEC_PATH=$1
DOWNLOADED_FILE_PATH=$2
DOWNLOADED_APP_NAME=$3
REBOOT_SCRIPT_PATH=$4
FILE_PATH_CUST_B=$5
MAC_COPY_SCRIPT=$6

osascript -e 'do shell script "bash $MAC_COPY_SCRIPT $1 $2 $3 $4 $5" with administrator privileges'
# osascript -e 'do shell script "bash /Users/chrisjohnson/git/Kiplingv3/ModuleDevelopment/ljswitchboard/update_scripts/kipling/mac_request_permissions.scpt" with administrator privileges'

# osascript ./mac_request_permissions.scpt