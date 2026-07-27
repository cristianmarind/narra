const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable polling for file watching inside Docker containers on Windows
// (inotify doesn't work across Docker volume mounts from Windows)
config.watcher = {
  ...config.watcher,
  watchman: false,
  additionalExts: [],
};

config.watchFolders = [__dirname];

module.exports = config;
