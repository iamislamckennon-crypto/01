#!/bin/bash

# Simple build script for the client

echo "Building client..."

# Create build directory
mkdir -p client/build

# Copy HTML file
cp client/public/index.html client/build/index.html

# Copy JavaScript file
cp client/src/app.js client/build/app.js

# Update the script path in HTML for production
sed -i 's|../src/app.js|app.js|g' client/build/index.html

echo "Build complete! Files are in client/build/"
