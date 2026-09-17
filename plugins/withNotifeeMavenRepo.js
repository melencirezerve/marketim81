const { withProjectBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NOTIFEE_REPO_LINE =
  'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }';

const STABLE_GRADLE_DISTRIBUTION_URL =
  'https\\://services.gradle.org/distributions/gradle-8.13-bin.zip';

function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(NOTIFEE_REPO_LINE)) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*{\s*repositories\s*{/,
      (match) => `${match}\n    ${NOTIFEE_REPO_LINE}`
    );
    return config;
  });
}

function withStableGradleVersion(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle/wrapper/gradle-wrapper.properties'
      );
      let contents = fs.readFileSync(wrapperPath, 'utf8');
      contents = contents.replace(
        /distributionUrl=.*/,
        `distributionUrl=${STABLE_GRADLE_DISTRIBUTION_URL}`
      );
      fs.writeFileSync(wrapperPath, contents);
      return config;
    },
  ]);
}

module.exports = function withNotifeeAndGradleFixes(config) {
  config = withNotifeeMavenRepo(config);
  config = withStableGradleVersion(config);
  return config;
};
