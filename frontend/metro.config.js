const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Blacklist test files and test-related modules
config.resolver.blacklistRE = exclusionList([
  /.*\/__tests__\/.*/,
  /.*\/__test__\/.*/, // handles your "app/__test__"
  /.*\.test\.js/,
  /.*\.test\.ts/,
  /.*\.test\.tsx/,
  /@testing-library\/react-native\/.*/,
]);

module.exports = config;
