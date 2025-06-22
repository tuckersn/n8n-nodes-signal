#!/bin/bash

echo "Signal-CLI Container Starting..."
echo "Phone Number: $PHONE_NUMBER"
echo "---------------------------"

# Check and register account if needed
python3 /opt/register_account.py "$PHONE_NUMBER"
registration_status=$?

if [ $registration_status -eq 0 ]; then
    echo "Account ready. Starting daemon..."
    echo "signal-cli -u "$PHONE_NUMBER" daemon --http 0.0.0.0:8080"
    signal-cli -u "$PHONE_NUMBER" daemon --http 0.0.0.0:8080
    daemon_status=$?

    if [ $daemon_status -ne 0 ]; then
        echo "Pausing for 120 seconds..."
        sleep 120
    fi
else
    echo "Registration failed. Exiting."
    exit 1
fi