const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves from this directory, not the monorepo root
config.projectRoot = __dirname;

module.exports = config;
