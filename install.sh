#!/bin/bash

echo "Installing Laut.de Dependencies"
INSTALLING="/home/volumio/lautde.installing"

if [ ! -f $INSTALLING ]; then

	touch $INSTALLING

	echo "Downloading installation package..."
	# Perform any kind of wget/apt-get install/dpkg -i/etc.
	
	rm $INSTALLING

	#required to end the plugin install
	echo "plugininstallend"
else
	echo "Plugin is already installing! Not continuing..."
fi
