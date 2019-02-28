import Jimp from 'jimp';

import logger from './utils/logger';
import getStorage from './utils/storage';

const compareImage = async (capturedImage, globalConfig, testConfig) => {
  const prefixedLogger = logger.prefix(testConfig.testName);
  const storage = getStorage(testConfig, globalConfig);

  const { snapshotPath, diffPath } = storage;

  storage.cleanupBefore();

  if (storage.snapshotExists() && !testConfig.isUpdate) {
    let snapshotImage;
    try {
      snapshotImage = await Jimp.read(snapshotPath);
    } catch (error) {
      prefixedLogger.error(`failed to read reference image: ${snapshotPath}`);
      prefixedLogger.trace(error);
      return { error: 'failed to read reference image', matched: false };
    }
    let testImage;
    try {
      testImage = await Jimp.read(capturedImage);
    } catch (error) {
      prefixedLogger.error('failed to read current screenshot image');
      prefixedLogger.trace(error);
      return { error: 'failed to read current screenshot image', matched: false };
    }
    prefixedLogger.log('comparing...');
    const distance = Jimp.distance(snapshotImage, testImage);
    const diff = Jimp.diff(snapshotImage, testImage, globalConfig.mismatchThreshold);
    if (distance < globalConfig.mismatchThreshold && diff.percent < globalConfig.mismatchThreshold) {
      prefixedLogger.log('no mismatch found ✅');
      return {
        snapshotPath, distance, diffPercent: diff.percent, matched: true,
      };
    }
    if (globalConfig.saveCurrentImage) {
      await storage.saveCurrentImage(capturedImage);
    }
    if (globalConfig.saveDifferencifiedImage) {
      await storage.saveDiff(diff);
    }

    prefixedLogger.error(`mismatch found❗
      Result:
        distance: ${distance}
        diff: ${diff.percent}
        misMatchThreshold: ${globalConfig.mismatchThreshold}
    `);
    return {
      snapshotPath, distance, diffPercent: diff.percent, diffPath, matched: false,
    };
  }
  await storage.saveScreenshot(capturedImage);
  return testConfig.isUpdate ? { updated: true } : { added: true };
};

export default compareImage;
