import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef } from 'react';
import { useInterstitialAd as useGoogleAd, TestIds } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-9686111595009995/1095331107';

const MIN_INTERVAL_MS = 90 * 1000;

export function useInterstitialAd() {
    const { isLoaded, load, show, isClosed, error } = useGoogleAd(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
    });
    const lastShownRef = useRef(null);
    const isLoadedRef = useRef(false);

    useEffect(() => {
        isLoadedRef.current = isLoaded;
        if (isLoaded) console.log('[Interstitial] Reklam yüklendi ✓');
    }, [isLoaded]);

    useEffect(() => {
        if (error) console.log('[Interstitial] Yükleme hatası:', error?.code, error?.message);
    }, [error]);

    // İlk yükleme
    useEffect(() => {
        load();
    }, [load]);

    // Kapandıktan sonra yeni reklam yükle
    useEffect(() => {
        if (isClosed) load();
    }, [isClosed, load]);

    const showAdIfReady = useCallback(async () => {
        const now = Date.now();

        if (lastShownRef.current === null) {
            try {
                const stored = await AsyncStorage.getItem('@lastInterstitialShown');
                lastShownRef.current = stored ? parseInt(stored, 10) : 0;
            } catch {
                lastShownRef.current = 0;
            }
        }

        const elapsed = now - lastShownRef.current;

        if (isLoadedRef.current && elapsed >= MIN_INTERVAL_MS) {
            lastShownRef.current = now;
            try {
                show();
                await AsyncStorage.setItem('@lastInterstitialShown', now.toString());
            } catch (e) {
                console.log('[Interstitial] Gösterme hatası:', e);
                lastShownRef.current = now - MIN_INTERVAL_MS;
            }
        }
    }, [show]);

    return { showAdIfReady };
}
