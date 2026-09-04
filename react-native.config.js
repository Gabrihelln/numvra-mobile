const path = require('path');

const reactNativeConfigAndroidDir = path.join(
  path.dirname(require.resolve('react-native-config/package.json')),
  'android',
);

module.exports = {
  dependencies: {
    'react-native-config': {
      platforms: {
        android: {
          sourceDir: reactNativeConfigAndroidDir,
          packageImportPath: 'import com.lugg.RNCConfig.RNCConfigPackage;',
          packageInstance: 'new RNCConfigPackage()',
        },
      },
    },
  },
};
