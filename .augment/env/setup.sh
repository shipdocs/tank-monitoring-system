#!/bin/bash

# Tank Monitoring System Setup Script
echo "🚀 Setting up Tank Monitoring System..."

# Update system packages
sudo apt-get update

# Install Node.js 18 (required by the project)
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
echo "✅ Node.js installed: $node_version"
echo "✅ npm installed: $npm_version"

# Install build essentials for native modules (serialport, etc.)
echo "🔧 Installing build tools for native modules..."
sudo apt-get install -y build-essential python3 python3-pip

# Install additional dependencies for Electron
echo "🖥️ Installing Electron dependencies..."
sudo apt-get install -y libnss3-dev libatk-bridge2.0-dev libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2

# Navigate to project directory
cd /mnt/persist/workspace

# Install npm dependencies
echo "📦 Installing project dependencies..."
npm ci

# Build the React application
echo "🏗️ Building React application..."
npm run build

# Add Node.js to PATH in user profile
echo "🔧 Adding Node.js to PATH..."
echo 'export PATH="/usr/bin:$PATH"' >> $HOME/.profile

echo "✅ Setup completed successfully!"
echo "📋 Summary:"
echo "   - Node.js $node_version installed"
echo "   - npm $npm_version installed"
echo "   - Project dependencies installed"
echo "   - React application built"
echo "   - Electron dependencies installed"