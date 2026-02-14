module.exports = {
  dependencies: {
    'react-native-zeroconf': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-zeroconf/android',
        },
        ios: {
          podspecPath: '../node_modules/react-native-zeroconf/react-native-zeroconf.podspec',
        },
      },
    },
  },
};
