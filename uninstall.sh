#!/bin/bash

# Uninstall dependendencies
# apt-get remove -y

echo "Uninstalling Laut.de and its dependencies..."
INSTALLING="/home/volumio/lautde.uninstalling"

if [ ! -f $INSTALLING ]; then

	touch $INSTALLING

	# Uninstall Template

	rm $INSTALLING

	#required to end the plugin uninstall
	echo "pluginuninstallend"
else
	echo "Plugin is already uninstalling! Not continuing..."
fi
