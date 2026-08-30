import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.78;

const MEKKE_LAT = 21.422487;
const MEKKE_LNG = 39.826206;

function hesaplaKibleAcisi(lat, lng) {
    const phi1 = lat * (Math.PI / 180);
    const phi2 = MEKKE_LAT * (Math.PI / 180);
    const deltaLng = (MEKKE_LNG - lng) * (Math.PI / 180);

    const y = Math.sin(deltaLng);
    const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLng);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    return (bearing + 360) % 360;
}

export default function Kible() {
    const { theme, isDarkMode } = useTheme();
    const [heading, setHeading] = useState(0);
    const [kibleAcisi, setKibleAcisi] = useState(null);
    const [konumBilgisi, setKonumBilgisi] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hata, setHata] = useState(null);
    const [subscription, setSubscription] = useState(null);

    const smoothHeading = useRef(0);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const prevRotation = useRef(0);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setHata('Kıbleyi hesaplamak için konum izni gerekli.\nAyarlar > Uygulama izinlerinden konum iznini açın.');
                    setLoading(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const { latitude, longitude } = location.coords;

                const aci = hesaplaKibleAcisi(latitude, longitude);
                setKibleAcisi(aci);

                // Şehir adını almayı dene
                try {
                    const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
                    if (geo.length > 0) {
                        const city = geo[0].city || geo[0].region || '';
                        const country = geo[0].country || '';
                        setKonumBilgisi(city ? `${city}, ${country}` : country);
                    }
                } catch (_) { /* konum adı opsiyonel */ }

                setLoading(false);
            } catch (error) {
                setHata('Konum alınamadı. Lütfen GPS\'inizi açın ve tekrar deneyin.');
                setLoading(false);
            }
        })();

        startMagnetometer();
        return () => stopMagnetometer();
    }, []);

    const startMagnetometer = () => {
        Magnetometer.setUpdateInterval(60);
        const sub = Magnetometer.addListener(data => {
            let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
            if (angle < 0) angle += 360;

            // Smooth geçiş
            let diff = angle - smoothHeading.current;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            smoothHeading.current = smoothHeading.current + diff * 0.15;
            const newHeading = ((smoothHeading.current % 360) + 360) % 360;
            setHeading(Math.round(newHeading));
        });
        setSubscription(sub);
    };

    const stopMagnetometer = () => {
        subscription && subscription.remove();
        setSubscription(null);
    };

    // Pusula rotasyonunu animasyon ile güncelle
    useEffect(() => {
        const compassRotation = 360 - heading;
        let diff = compassRotation - prevRotation.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const targetRotation = prevRotation.current + diff;
        prevRotation.current = targetRotation;

        Animated.timing(rotateAnim, {
            toValue: targetRotation,
            duration: 80,
            useNativeDriver: true,
        }).start();
    }, [heading]);

    const rotate = rotateAnim.interpolate({
        inputRange: [-360, 0, 360, 720],
        outputRange: ['-360deg', '0deg', '360deg', '720deg'],
    });

    // Kıble yönüne ne kadar yakınız?
    const kibleFarki = kibleAcisi !== null
        ? (() => {
            let diff = ((heading - kibleAcisi) + 360) % 360;
            if (diff > 180) diff = 360 - diff;
            return diff;
        })()
        : null;

    const hedefteMi = kibleFarki !== null && kibleFarki < 15;

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#0D1F17' : '#F0F7F3' }]}>
                <ActivityIndicator size="large" color="#2D6A4F" />
                <Text style={[styles.loadingText, { color: isDarkMode ? '#A8D5BE' : '#2D6A4F' }]}>
                    Konum hesaplanıyor...
                </Text>
            </View>
        );
    }

    if (hata) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#0D1F17' : '#F0F7F3' }]}>
                <MaterialCommunityIcons name="map-marker-off" size={56} color="#DC2626" />
                <Text style={[styles.hataText, { color: isDarkMode ? '#F8F9FA' : '#1A1A1A' }]}>{hata}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0D1F17' : '#F0F7F3' }]} edges={['bottom']}>

            {/* DURUM BADGE */}
            <View style={styles.statusArea}>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: hedefteMi ? '#2D6A4F' : (isDarkMode ? '#1E1E1E' : '#E0EDE7') }
                ]}>
                    <MaterialCommunityIcons
                        name={hedefteMi ? 'check-circle' : 'rotate-3d-variant'}
                        size={18}
                        color={hedefteMi ? '#FFF' : (isDarkMode ? '#A8D5BE' : '#2D6A4F')}
                    />
                    <Text style={[
                        styles.statusText,
                        { color: hedefteMi ? '#FFF' : (isDarkMode ? '#A8D5BE' : '#2D6A4F') }
                    ]}>
                        {hedefteMi ? 'Kıble Yönündesiniz' : 'Telefonu Döndürün'}
                    </Text>
                </View>

                {kibleFarki !== null && !hedefteMi && (
                    <Text style={[styles.farkText, { color: isDarkMode ? '#6B8F7E' : '#5A8A6F' }]}>
                        {Math.round(kibleFarki)}° fark var
                    </Text>
                )}
            </View>

            {/* PUSULA */}
            <View style={styles.compassWrapper}>
                {/* Sabit hedef çizgisi (yukarı) */}
                <View style={styles.targetIndicator}>
                    <View style={[styles.targetArrow, { backgroundColor: hedefteMi ? '#2D6A4F' : '#DC2626' }]} />
                </View>

                <Animated.View style={[styles.compassOuter, {
                    borderColor: hedefteMi ? '#2D6A4F' : (isDarkMode ? '#2A3A2E' : '#C8DDD2'),
                    transform: [{ rotate }]
                }]}>
                    {/* Tick işaretleri — tam boyutlu container rotation */}
                    {Array.from({ length: 36 }).map((_, i) => {
                        const isMajor = i % 9 === 0;
                        const isMid = i % 3 === 0;
                        return (
                            <View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: COMPASS_SIZE,
                                    height: COMPASS_SIZE,
                                    alignItems: 'center',
                                    transform: [{ rotate: `${i * 10}deg` }],
                                }}
                            >
                                <View
                                    style={{
                                        width: isMajor ? 3 : 1.5,
                                        height: isMajor ? 18 : (isMid ? 10 : 6),
                                        borderRadius: 1,
                                        backgroundColor: isMajor
                                            ? (isDarkMode ? '#FFF' : '#1A1A1A')
                                            : (isDarkMode ? '#4A6A58' : '#AABFB4'),
                                        marginTop: 6,
                                    }}
                                />
                            </View>
                        );
                    })}

                    {/* Yön Harfleri */}
                    <Text style={[styles.dirN, { color: '#DC2626' }]}>K</Text>
                    <Text style={[styles.dirS, { color: isDarkMode ? '#8AB89A' : '#2D6A4F' }]}>G</Text>
                    <Text style={[styles.dirW, { color: isDarkMode ? '#CCC' : '#444' }]}>B</Text>
                    <Text style={[styles.dirE, { color: isDarkMode ? '#CCC' : '#444' }]}>D</Text>

                    {/* Kabe İkonu - Kıble yönünde döner */}
                    {kibleAcisi !== null && (
                        <View style={{
                            position: 'absolute',
                            width: COMPASS_SIZE,
                            height: COMPASS_SIZE,
                            alignItems: 'center',
                            transform: [{ rotate: `${kibleAcisi}deg` }],
                        }}>
                            <View style={[
                                styles.kabePill,
                                { backgroundColor: hedefteMi ? '#2D6A4F' : '#C8A44A', marginTop: 12 }
                            ]}>
                                <MaterialCommunityIcons name="kaaba" size={22} color="#FFF" />
                            </View>
                        </View>
                    )}

                    {/* Merkez daire */}
                    <View style={[styles.compassCenter, { backgroundColor: isDarkMode ? '#1B3A2D' : '#2D6A4F' }]}>
                        <MaterialCommunityIcons name="compass-rose" size={28} color="rgba(255,255,255,0.9)" />
                    </View>
                </Animated.View>
            </View>

            {/* ALT BİLGİ PANELİ */}
            <View style={[styles.infoPanel, { backgroundColor: isDarkMode ? '#142419' : '#FFF', borderColor: isDarkMode ? '#1E3A2A' : '#D8EDE1' }]}>
                <View style={styles.infoPanelRow}>
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDarkMode ? '#6B8F7E' : '#5A8A6F' }]}>PUSULA</Text>
                        <Text style={[styles.infoValue, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
                            {heading}°
                        </Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: isDarkMode ? '#1E3A2A' : '#D8EDE1' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDarkMode ? '#6B8F7E' : '#5A8A6F' }]}>KIBLE YÖNÜ</Text>
                        <Text style={[styles.infoValue, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
                            {kibleAcisi !== null ? `${Math.round(kibleAcisi)}°` : '—'}
                        </Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: isDarkMode ? '#1E3A2A' : '#D8EDE1' }]} />
                    <View style={styles.infoItem}>
                        <Text style={[styles.infoLabel, { color: isDarkMode ? '#6B8F7E' : '#5A8A6F' }]}>FARK</Text>
                        <Text style={[
                            styles.infoValue,
                            { color: hedefteMi ? '#2D6A4F' : (isDarkMode ? '#FFF' : '#1A1A1A') }
                        ]}>
                            {kibleFarki !== null ? `${Math.round(kibleFarki)}°` : '—'}
                        </Text>
                    </View>
                </View>

                {konumBilgisi && (
                    <View style={styles.konumRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={13} color={isDarkMode ? '#6B8F7E' : '#5A8A6F'} />
                        <Text style={[styles.konumText, { color: isDarkMode ? '#6B8F7E' : '#5A8A6F' }]}>
                            {konumBilgisi}
                        </Text>
                    </View>
                )}

                <Text style={[styles.kalibrasyon, { color: isDarkMode ? '#3A5A48' : '#A8C4B4' }]}>
                    Pusulanın doğruluğu için cihazı 8 şeklinde hareket ettirin
                </Text>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 30 },
    loadingText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
    hataText: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 24, marginTop: 16 },

    statusArea: { alignItems: 'center', gap: 6 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25,
    },
    statusText: { fontSize: 15, fontWeight: '800' },
    farkText: { fontSize: 12, fontWeight: '600' },

    compassWrapper: {
        width: COMPASS_SIZE + 40,
        height: COMPASS_SIZE + 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetIndicator: {
        position: 'absolute',
        top: 0,
        zIndex: 20,
        alignItems: 'center',
    },
    targetArrow: {
        width: 4,
        height: 28,
        borderRadius: 2,
    },

    compassOuter: {
        width: COMPASS_SIZE,
        height: COMPASS_SIZE,
        borderRadius: COMPASS_SIZE / 2,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tick: {
        position: 'absolute',
        borderRadius: 2,
        left: '50%',
        top: 0,
    },
    dirN: { position: 'absolute', top: 30, fontSize: 18, fontWeight: '900' },
    dirS: { position: 'absolute', bottom: 30, fontSize: 18, fontWeight: '900' },
    dirW: { position: 'absolute', left: 28, fontSize: 18, fontWeight: '900' },
    dirE: { position: 'absolute', right: 28, fontSize: 18, fontWeight: '900' },

    kabePill: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },

    compassCenter: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },

    infoPanel: {
        width: width - 36,
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 16,
        elevation: 4,
    },
    infoPanelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 },
    infoItem: { flex: 1, alignItems: 'center' },
    infoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
    infoValue: { fontSize: 22, fontWeight: '900' },
    infoDivider: { width: 1, height: 36 },
    konumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 8 },
    konumText: { fontSize: 12, fontWeight: '600' },
    kalibrasyon: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});
