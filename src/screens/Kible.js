import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function Kible() {
    const { theme, isDarkMode } = useTheme();
    const [subscription, setSubscription] = useState(null);
    const [magnetometer, setMagnetometer] = useState(0);
    const [kibleAcisi, setKibleAcisi] = useState(null); // Dinamik hesaplanacak
    const [loading, setLoading] = useState(true);
    const lastAngle = useRef(0);

    // Mekke'nin koordinatları
    const MEKKE_LAT = 21.422487;
    const MEKKE_LNG = 39.826206;

    useEffect(() => {
        (async () => {
            try {
                // 1. Konum izni al
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    alert('Kıbleyi hesaplamak için konum izni gerekli.');
                    return;
                }

                // 2. Mevcut konumu al
                let location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;

                // 3. Kıble açısını hesapla (Trigonometrik)
                const aci = hesaplaKibleAcisi(latitude, longitude);
                setKibleAcisi(aci);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        })();

        _subscribe();
        return () => _unsubscribe();
    }, []);

    // Küresel Trigonometri Formülü
    const hesaplaKibleAcisi = (lat, lng) => {
        const phi1 = lat * (Math.PI / 180);
        const phi2 = MEKKE_LAT * (Math.PI / 180);
        const lam1 = lng * (Math.PI / 180);
        const lam2 = MEKKE_LNG * (Math.PI / 180);

        const y = Math.sin(lam2 - lam1);
        const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(lam2 - lam1);

        let bearing = Math.atan2(y, x) * (180 / Math.PI);
        return (bearing + 360) % 360;
    };

    const smoothAngle = (newValue) => {
        let diff = newValue - lastAngle.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const smooth = lastAngle.current + diff * 0.2;
        lastAngle.current = smooth;
        return Math.round(smooth);
    };

    const _subscribe = () => {
        Magnetometer.setUpdateInterval(50);
        setSubscription(
            Magnetometer.addListener(data => {
                let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
                if (angle < 0) angle += 360;
                setMagnetometer(smoothAngle(angle));
            })
        );
    };

    const _unsubscribe = () => {
        subscription && subscription.remove();
        setSubscription(null);
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.active} />
                <Text style={{ color: theme.text, marginTop: 10 }}>Konum hesaplanıyor...</Text>
            </View>
        );
    }

    const pusulaDonusu = 360 - magnetometer;
    // Kıbleye ne kadar yakın? (Hesaplanan dinamik açıya göre)
    const fark = Math.abs((pusulaDonusu + kibleAcisi) % 360 - 360);
    const hedefteMi = fark < 3 || fark > 357;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Dinamik Kıble</Text>
                <View style={[styles.statusBadge, { backgroundColor: hedefteMi ? '#2D6A4F' : theme.card }]}>
                    <Text style={{ color: hedefteMi ? '#FFF' : theme.subText, fontWeight: '700' }}>
                        {hedefteMi ? 'Kıble Yönündesiniz' : 'Telefonu Döndürün'}
                    </Text>
                </View>
            </View>

            <View style={styles.compassContainer}>
                {/* Sabit Kılavuz Çizgi */}
                <View style={[styles.pointer, { backgroundColor: hedefteMi ? '#2D6A4F' : theme.active }]} />

                <Animated.View style={[styles.compassCircle, { transform: [{ rotate: `${pusulaDonusu}deg` }], borderColor: theme.border }]}>
                    {/* Yön Harfleri */}
                    <Text style={[styles.directionText, { top: 15, color: 'red' }]}>N</Text>
                    <Text style={[styles.directionText, { bottom: 15, color: theme.text }]}>S</Text>
                    <Text style={[styles.directionText, { left: 15, color: theme.text }]}>W</Text>
                    <Text style={[styles.directionText, { right: 15, color: theme.text }]}>E</Text>

                    {/* Dinamik Kabe İkonu */}
                    <View style={{
                        position: 'absolute',
                        transform: [{ rotate: `${kibleAcisi}deg` }],
                        height: '100%',
                        alignItems: 'center',
                        paddingTop: 25
                    }}>
                        <MaterialCommunityIcons
                            name="kaaba"
                            size={50}
                            color={hedefteMi ? "#2D6A4F" : "#DAA520"}
                        />
                        <MaterialCommunityIcons
                            name="triangle"
                            size={20}
                            color={hedefteMi ? "#2D6A4F" : "#DAA520"}
                            style={{ marginTop: -5 }}
                        />
                    </View>
                </Animated.View>
            </View>

            <View style={[styles.footer, { backgroundColor: theme.card }]}>
                <Text style={[styles.degreeText, { color: theme.text }]}>{magnetometer}°</Text>
                <Text style={[styles.locationInfo, { color: theme.subText }]}>
                    Konumunuza göre Kıble: <Text style={{ fontWeight: 'bold' }}>{Math.round(kibleAcisi)}°</Text>
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'space-around' },
    header: { alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '900', marginBottom: 15 },
    statusBadge: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
    compassContainer: { width: width * 0.85, height: width * 0.85, justifyContent: 'center', alignItems: 'center' },
    pointer: { position: 'absolute', top: -10, width: 4, height: 40, zIndex: 10, borderRadius: 2 },
    compassCircle: {
        width: '100%',
        height: '100%',
        borderRadius: width,
        borderWidth: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.01)'
    },
    directionText: { position: 'absolute', fontWeight: '900', fontSize: 18 },
    footer: { width: '85%', padding: 20, borderRadius: 25, alignItems: 'center', elevation: 2 },
    degreeText: { fontSize: 36, fontWeight: '900' },
    locationInfo: { fontSize: 13, marginTop: 5 }
});