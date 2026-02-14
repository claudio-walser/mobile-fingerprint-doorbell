const { withSettingsGradle, withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withZeroconfSettingsGradle(config) {
  return withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;
    
    // Check if already added
    if (contents.includes('react-native-zeroconf')) {
      return config;
    }
    
    // Add the include and project statements
    const zeroconfSettings = `
include ':react-native-zeroconf'
project(':react-native-zeroconf').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-zeroconf/android')
`;
    
    config.modResults.contents = contents + zeroconfSettings;
    return config;
  });
}

function withZeroconfAppBuildGradle(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    
    // Check if already added
    if (contents.includes('react-native-zeroconf')) {
      return config;
    }
    
    // Add to dependencies block
    const dependencyLine = "    implementation project(':react-native-zeroconf')";
    
    // Find the dependencies block and add our dependency
    const dependenciesRegex = /dependencies\s*\{/;
    if (dependenciesRegex.test(contents)) {
      config.modResults.contents = contents.replace(
        dependenciesRegex,
        `dependencies {\n${dependencyLine}`
      );
    }
    
    return config;
  });
}

function withZeroconfMainApplication(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const mainApplicationPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/fingerprintdoorbell/app/MainApplication.kt'
      );
      
      let contents = fs.readFileSync(mainApplicationPath, 'utf-8');
      
      // Check if already added
      if (contents.includes('ZeroconfReactPackage')) {
        return config;
      }
      
      // Add import statement after other imports
      const importStatement = 'import com.balthazargronon.RCTZeroconf.ZeroconfReactPackage';
      const lastImportRegex = /(import expo\.modules\.ReactNativeHostWrapper)/;
      contents = contents.replace(
        lastImportRegex,
        `${importStatement}\n$1`
      );
      
      // Add package to getPackages() - Kotlin syntax
      // Find the comment about manual packages and add after it
      const packagesRegex = /(\/\/ Packages that cannot be autolinked yet can be added manually here.*\n.*\/\/ add\(MyReactNativePackage\(\)\))/;
      contents = contents.replace(
        packagesRegex,
        `$1\n              add(ZeroconfReactPackage())`
      );
      
      fs.writeFileSync(mainApplicationPath, contents);
      
      return config;
    },
  ]);
}

module.exports = function withZeroconfAndroid(config) {
  config = withZeroconfSettingsGradle(config);
  config = withZeroconfAppBuildGradle(config);
  config = withZeroconfMainApplication(config);
  return config;
};
