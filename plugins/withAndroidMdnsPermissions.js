const { withAndroidManifest } = require('@expo/config-plugins');

function addMdnsPermissions(androidManifest) {
  const { manifest } = androidManifest;

  // Ensure uses-permission array exists
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }

  const permissions = [
    'android.permission.ACCESS_WIFI_STATE',
    'android.permission.CHANGE_WIFI_MULTICAST_STATE',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.INTERNET',
  ];

  permissions.forEach((permission) => {
    const exists = manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === permission
    );
    if (!exists) {
      manifest['uses-permission'].push({
        $: { 'android:name': permission },
      });
    }
  });

  // Enable cleartext (HTTP) traffic for local network communication
  if (manifest.application && manifest.application[0]) {
    manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
  }

  return androidManifest;
}

module.exports = function withAndroidMdnsPermissions(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = addMdnsPermissions(config.modResults);
    return config;
  });
};
