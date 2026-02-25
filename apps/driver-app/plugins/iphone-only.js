const { withXcodeProject } = require("expo/config-plugins");

/**
 * Expo config plugin that forces TARGETED_DEVICE_FAMILY = "1" (iPhone only).
 * This ensures EAS cloud builds produce an iPhone-only binary,
 * so App Store Connect won't require iPad screenshots.
 */
const withIphoneOnly = (config) => {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const buildConfigurations = project.pbxXCBuildConfigurationSection();

    for (const key in buildConfigurations) {
      const buildConfig = buildConfigurations[key];
      if (
        typeof buildConfig === "object" &&
        buildConfig.buildSettings &&
        buildConfig.buildSettings.TARGETED_DEVICE_FAMILY
      ) {
        buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
      }
    }

    return config;
  });
};

module.exports = withIphoneOnly;
