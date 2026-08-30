import { TestIds } from 'react-native-google-mobile-ads';

export const AD_UNIT_IDS = {
  ANASAYFA:       __DEV__ ? TestIds.BANNER : 'ca-app-pub-9686111595009995/1873946024',
  DUA_DETAY:      __DEV__ ? TestIds.BANNER : 'ca-app-pub-9686111595009995/2995456007',
  ZIKIRMATIK:     __DEV__ ? TestIds.BANNER : 'ca-app-pub-9686111595009995/6719078591',
  // AdMob'da ayrı bir banner birimi oluşturulunca bu ID güncellenmeli
  NAMAZ_VAKITLERI: __DEV__ ? TestIds.BANNER : 'ca-app-pub-9686111595009995/6719078591',
};
