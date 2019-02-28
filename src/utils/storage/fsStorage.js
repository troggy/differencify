import path from 'path';
import pkgDir from 'pkg-dir';
import fs from 'fs';

import logger from '../logger';

const jimpWrite = (jimpObj, dest) => new Promise((resolve, reject) => {
  jimpObj.image.write(dest, (error, obj) => {
    if (error) return reject(error);
    return resolve(obj);
  });
});

const writeFile = (fileName, data) => new Promise((resolve, reject) => {
  fs.writeFile(fileName, data, {}, (error) => {
    if (error) return reject(error);
    return resolve();
  });
});

const removeFiles = (files) => {
  files.forEach(file => fs.unlink(file, () => {}));
};


class FsStorage {
  constructor(testConfig, globalConfig) {
    this.testConfig = testConfig;
    this.globalConfig = globalConfig;
    this.logger = logger.prefix(testConfig.testName);

    if (testConfig.isJest) {
      this.testRoot = path.dirname(testConfig.testPath);
    } else {
      this.testRoot = path.resolve(pkgDir.sync(), globalConfig.imageSnapshotPath);
    }
    if (!fs.existsSync(this.testRoot)) {
      fs.mkdirSync(this.testRoot);
    }
    this.snapshotsDir = this.getSnapshotsDir();
    this.snapshotPath = path.join(
      this.snapshotsDir,
      `${this.testConfig.testName}.snap.${this.testConfig.imageType || 'png'}`,
    );

    this.diffDir = path.join(this.snapshotsDir, '__differencified_output__');
    this.diffPath = path.join(
      this.diffDir,
      `${this.testConfig.testName}.differencified.${this.testConfig.imageType || 'png'}`,
    );

    this.currentImageDir = path.join(this.snapshotsDir, '__current_output__');
    this.currentImagePath = path.join(
      this.currentImageDir,
      `${this.testConfig.testName}.current.${this.testConfig.imageType || 'png'}`,
    );
  }

  getSnapshotsDir() {
    if (this.globalConfig.imageSnapshotPathProvided) {
      return path.resolve(this.globalConfig.imageSnapshotPath);
    }

    return path.join(this.testRoot, '__image_snapshots__');
  }

  cleanupBefore() {
    removeFiles([this.diffPath, this.currentImagePath]);
  }

  snapshotExists() {
    return fs.existsSync(this.snapshotPath);
  }

  saveDiff(diffJimp) {
    if (!fs.existsSync(this.diffDir)) {
      fs.mkdirSync(this.diffDir);
    }
    if (fs.existsSync(this.diffPath)) {
      fs.unlinkSync(this.diffPath);
    }
    return jimpWrite(diffJimp, this.diffPath)
      .then(() => this.logger.log(`saved the diff image to disk at ${this.diffPath}`))
      .catch((error) => {
        this.logger.error(`failed to save the diff image: ${this.diffPath}`);
        this.logger.trace(error);
      });
  }

  saveScreenshot(image) {
    if (fs.existsSync(this.diffPath)) {
      fs.unlinkSync(this.diffPath);
    }
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir);
    }
    return writeFile(this.snapshotPath, image)
      .then(() => {
        this.logger.log(`screenshot saved in -> ${this.snapshotPath}`);
      })
      .catch((error) => {
        this.logger.error(`failed to save screenshot : ${this.snapshotPath}`);
        this.logger.trace(error);
      });
  }

  saveCurrentImage(image) {
    if (!fs.existsSync(this.currentImageDir)) {
      fs.mkdirSync(this.currentImageDir);
    }
    if (fs.existsSync(this.currentImagePath)) {
      fs.unlinkSync(this.currentImagePath);
    }

    return writeFile(this.currentImagePath, image)
      .then(() => {
        this.logger.log(`current image saved in -> ${this.currentImagePath}`);
      })
      .catch((error) => {
        this.logger.error(`failed to save the current image: ${this.currentImagePath}`);
        this.logger.trace(error);
      });
  }
}

module.exports = FsStorage;
