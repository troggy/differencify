const FsStorage = require('./fsStorage');

const getStorage = (testConfig, globalConfig) => new FsStorage(testConfig, globalConfig);

module.exports = getStorage;
