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
      
      if (!fs.existsSync(mainApplicationPath)) {
        console.warn('[withZeroconfAndroid] MainApplication.kt not found at:', mainApplicationPath);
        return config;
      }
      
      let contents = fs.readFileSync(mainApplicationPath, 'utf-8');
      
      // Check if already added
      if (contents.includes('ZeroconfReactPackage')) {
        console.log('[withZeroconfAndroid] ZeroconfReactPackage already present');
        return config;
      }
      
      console.log('[withZeroconfAndroid] Adding ZeroconfReactPackage to MainApplication.kt');
      
      // Add import statement - find the last import line and add after it
      const importStatement = 'import com.balthazargronon.RCTZeroconf.ZeroconfReactPackage';
      
      // Find the line before "class MainApplication" and insert import there
      const classRegex = /(\n)(class MainApplication)/;
      if (classRegex.test(contents)) {
        contents = contents.replace(
          classRegex,
          `\n${importStatement}\n\n$2`
        );
      } else {
        // Fallback: add after the last import statement
        const lines = contents.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        if (lastImportIndex >= 0) {
          lines.splice(lastImportIndex + 1, 0, importStatement);
          contents = lines.join('\n');
        }
      }
      
      // Add package to getPackages() - look for PackageList(...).packages.apply {
      // or PackageList(...).packages pattern and add ZeroconfReactPackage
      
      // Pattern 1: packages.apply { ... } block - add inside the block
      const applyBlockRegex = /(PackageList\([^)]*\)\.packages\.apply\s*\{[\s\S]*?)(\/\/[^\n]*\n\s*\/\/[^\n]*\n)(\s*\})/;
      if (applyBlockRegex.test(contents)) {
        contents = contents.replace(
          applyBlockRegex,
          '$1$2              add(ZeroconfReactPackage())\n$3'
        );
      } else {
        // Pattern 2: Look for the comment about manual packages
        const commentRegex = /(\/\/ Packages that cannot be autolinked[^\n]*\n[^\n]*\/\/ add\(MyReactNativePackage\(\)\))/;
        if (commentRegex.test(contents)) {
          contents = contents.replace(
            commentRegex,
            '$1\n              add(ZeroconfReactPackage())'
          );
        } else {
          // Pattern 3: Find packages.apply { and add right after opening brace
          const simpleApplyRegex = /(PackageList\([^)]*\)\.packages\.apply\s*\{)/;
          if (simpleApplyRegex.test(contents)) {
            contents = contents.replace(
              simpleApplyRegex,
              '$1\n              add(ZeroconfReactPackage())'
            );
          } else {
            console.warn('[withZeroconfAndroid] Could not find packages block to modify');
          }
        }
      }
      
      fs.writeFileSync(mainApplicationPath, contents);
      console.log('[withZeroconfAndroid] Successfully modified MainApplication.kt');
      
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
