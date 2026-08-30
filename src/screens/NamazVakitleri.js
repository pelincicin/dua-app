import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../AdsConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import {
    formatSaat,
    hesaplaNamazVakitleri,
    kalanSureStr,
    mevcutNamaz,
    NAMAZLAR,
    namazBildirimleriniAyarla,
    siradakiNamazi,
    VARSAYILAN_TERCIHLER,
} from '../utils/namazHelper';

const adUnitId = AD_UNIT_IDS.NAMAZ_VAKITLERI;

export default function NamazVakitleri() {
    const { theme, isDarkMode } = useTheme();
    const isFocused = useIsFocused();

    const [yukluyor, setYukluyor] = useState(true);
    const [hata, setHata] = useState(null);
    const [konum, setKonum] = useState(null);
    const [vakitler, setVakitler] = useState(null);
    const [siradaki, setSiradaki] = useState(null);
    const [mevcutP, setMevcutP] = useState(null);
    const [kalanSure, setKalanSure] = useState('--:--:--');
    const [tercihler, setTercihler] = useState(VARSAYILAN_TERCIHLER);

    const intervalRef = useRef(null);
    const bildirimAyarlandimi = useRef(false);

    // Tercihleri AsyncStorage'dan yükle
    useEffect(() => {
        AsyncStorage.getItem('@namazTercihler').then(t => {
            if (t) setTercihler(JSON.parse(t));
        });
    }, []);

    const vakitleriGuncelle = useCallback((v) => {
        const s = siradakiNamazi(v);
        const m = mevcutNamaz(v);
        setSiradaki(s);
        setMevcutP(m);
        if (s) setKalanSure(kalanSureStr(s.zaman - new Date()));
        else setKalanSure('');
    }, []);

    const konumuAl = useCallback(async () => {
        setHata(null);

        try {
            // Cache'den önceki konumu hemen göster
            const cachedStr = await AsyncStorage.getItem('@namazKonum');
            if (cachedStr) {
                const k = JSON.parse(cachedStr);
                setKonum(k);
                const v = hesaplaNamazVakitleri(k.lat, k.lng);
                setVakitler(v);
                vakitleriGuncelle(v);
                setYukluyor(false);
            }

            // Konum izni iste
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (!cachedStr) {
                    setHata('Konum izni gerekli. Lütfen ayarlardan konum iznini açın.');
                    setYukluyor(false);
                }
                return;
            }

            // Güncel konumu al
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude: lat, longitude: lng } = pos.coords;

            // Şehir adını al
            let sehir = 'Konumunuz';
            try {
                const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                if (geo.length > 0) {
                    sehir = geo[0].city || geo[0].district || geo[0].region || 'Konumunuz';
                }
            } catch { /* devam et */ }

            const yeniKonum = { lat, lng, sehir };
            setKonum(yeniKonum);
            await AsyncStorage.setItem('@namazKonum', JSON.stringify(yeniKonum));

            const v = hesaplaNamazVakitleri(lat, lng);
            setVakitler(v);
            vakitleriGuncelle(v);
        } catch (e) {
            console.log('Konum hatası:', e);
            if (!konum) setHata('Konum alınamadı. Lütfen tekrar deneyin.');
        } finally {
            setYukluyor(false);
        }
    }, [vakitleriGuncelle, konum]);

    useEffect(() => {
        if (isFocused) konumuAl();
    }, [isFocused, konumuAl]);

    // Her saniye sayaç güncelle
    useEffect(() => {
        if (!vakitler) return;
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => vakitleriGuncelle(vakitler), 1000);
        return () => clearInterval(intervalRef.current);
    }, [vakitler, vakitleriGuncelle]);

    // Bildirim planla (konum ve tercihler hazır olunca, günde bir kez)
    useEffect(() => {
        if (!konum || bildirimAyarlandimi.current) return;
        bildirimAyarlandimi.current = true;
        namazBildirimleriniAyarla(konum.lat, konum.lng, tercihler);
    }, [konum, tercihler]);

    const tercihDegistir = useCallback(async (key, deger) => {
        const yeni = { ...tercihler, [key]: deger };
        setTercihler(yeni);
        await AsyncStorage.setItem('@namazTercihler', JSON.stringify(yeni));
        if (konum) {
            bildirimAyarlandimi.current = false;
            await namazBildirimleriniAyarla(konum.lat, konum.lng, yeni);
            bildirimAyarlandimi.current = true;
        }
    }, [tercihler, konum]);

    // ─── YÜKLENİYOR ──────────────────────────────────────────────────────────
    if (yukluyor && !vakitler) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
                <View style={styles.merkez}>
                    <View style={[styles.yuklemeIkon, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}>
                        <MaterialCommunityIcons name="mosque" size={32} color={theme.active} />
                    </View>
                    <ActivityIndicator size="large" color={theme.active} style={{ marginTop: 20 }} />
                    <Text style={[styles.yuklemeText, { color: theme.subText }]}>
                        Konum alınıyor...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // ─── HATA ────────────────────────────────────────────────────────────────
    if (hata && !vakitler) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
                <View style={styles.merkez}>
                    <MaterialCommunityIcons name="map-marker-off-outline" size={64} color={theme.border} />
                    <Text style={[styles.hataText, { color: theme.subText }]}>{hata}</Text>
                    <TouchableOpacity
                        style={[styles.tekrarBtn, { backgroundColor: theme.active }]}
                        onPress={konumuAl}
                    >
                        <Text style={styles.tekrarBtnText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const simdi = new Date();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>

            {/* HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSub, { color: theme.subText }]}>NAMAZ</Text>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Vakitleri</Text>
                </View>
                <View style={styles.konumSatir}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.subText} />
                    <Text style={[styles.sehirText, { color: theme.subText }]} numberOfLines={1}>
                        {konum?.sehir || '...'}
                    </Text>
                    {yukluyor && (
                        <ActivityIndicator size="small" color={theme.active} style={{ marginLeft: 4 }} />
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

                {/* SIRADAKI / AKTİF NAMAZ KARTI */}
                {siradaki ? (
                    <View style={[styles.siradakiKart, { backgroundColor: siradaki.renk }]}>
                        <View style={styles.siradakiUst}>
                            <View>
                                <Text style={styles.siradakiEtiket}>
                                    {mevcutP ? `${mevcutP.isim} Vakti` : 'Sıradaki Namaz'}
                                </Text>
                                <Text style={styles.siradakiIsim}>{siradaki.isim}</Text>
                                <Text style={styles.siradakiSaatText}>{formatSaat(siradaki.zaman)}</Text>
                            </View>
                            <View style={styles.siradakiSagBlok}>
                                <MaterialCommunityIcons
                                    name={siradaki.ikon}
                                    size={44}
                                    color="rgba(255,255,255,0.25)"
                                />
                            </View>
                        </View>

                        <View style={styles.sayacKutu}>
                            <MaterialCommunityIcons name="timer-sand" size={18} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.sayacText}>{kalanSure}</Text>
                            <Text style={styles.sayacEtiket}>kaldı</Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.siradakiKart, { backgroundColor: isDarkMode ? '#1B4332' : '#2D6A4F' }]}>
                        <Text style={styles.siradakiIsim}>Hayırlı Geceler</Text>
                        <Text style={[styles.siradakiEtiket, { marginTop: 4 }]}>
                            Tüm namaz vakitleri tamamlandı
                        </Text>
                    </View>
                )}

                {/* VAKİT LİSTESİ */}
                <View style={[styles.listeKart, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.listeBas, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.listeBasText, { color: theme.subText }]}>VAKİT</Text>
                        <Text style={[styles.listeBasText, { color: theme.subText }]}>SAAT</Text>
                        <Text style={[styles.listeBasText, { color: theme.subText }]}>BİLDİRİM</Text>
                    </View>

                    {NAMAZLAR.map((namaz, index) => {
                        const vakit = vakitler?.[namaz.key];
                        const gecti = vakit && vakit.getTime() <= simdi.getTime();
                        const siradakiMi = siradaki?.key === namaz.key;
                        const mevcutMu = mevcutP?.key === namaz.key;

                        const satirBg = siradakiMi
                            ? (isDarkMode ? namaz.darkBg : namaz.acik)
                            : mevcutMu
                                ? (isDarkMode ? '#0D1F17' : '#F0F9F4')
                                : 'transparent';

                        return (
                            <View key={namaz.key}>
                                {index > 0 && (
                                    <View style={[styles.ayrac, { backgroundColor: theme.border }]} />
                                )}
                                <View style={[styles.vakitSatir, { backgroundColor: satirBg }]}>

                                    {/* İkon + İsim */}
                                    <View style={styles.vakitSol}>
                                        <View style={[
                                            styles.ikonWrap,
                                            { backgroundColor: (isDarkMode ? namaz.renk + '30' : namaz.renk + '18') }
                                        ]}>
                                            <MaterialCommunityIcons
                                                name={namaz.ikon}
                                                size={17}
                                                color={namaz.renk}
                                            />
                                        </View>
                                        <View>
                                            <Text style={[
                                                styles.vakitIsim,
                                                { color: gecti && !mevcutMu ? theme.subText : theme.text },
                                                (siradakiMi || mevcutMu) && { color: namaz.renk },
                                            ]}>
                                                {namaz.isim}
                                            </Text>
                                            {mevcutMu && (
                                                <Text style={[styles.aktifPill, { color: namaz.renk }]}>
                                                    Şu an bu vakitteyiz
                                                </Text>
                                            )}
                                            {siradakiMi && !mevcutMu && (
                                                <Text style={[styles.aktifPill, { color: namaz.renk }]}>
                                                    Sıradaki
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Saat */}
                                    <Text style={[
                                        styles.vakitSaat,
                                        { color: gecti && !mevcutMu ? theme.subText : theme.text },
                                        (siradakiMi || mevcutMu) && { color: namaz.renk },
                                    ]}>
                                        {formatSaat(vakit)}
                                    </Text>

                                    {/* Toggle */}
                                    {namaz.key !== 'sunrise' ? (
                                        <Switch
                                            value={!!tercihler[namaz.key]}
                                            onValueChange={v => tercihDegistir(namaz.key, v)}
                                            trackColor={{
                                                false: isDarkMode ? '#333' : '#DDD',
                                                true: namaz.renk + '99',
                                            }}
                                            thumbColor={tercihler[namaz.key]
                                                ? namaz.renk
                                                : (isDarkMode ? '#888' : '#FFF')}
                                            ios_backgroundColor={isDarkMode ? '#333' : '#DDD'}
                                        />
                                    ) : (
                                        <Text style={[styles.gunesNot, { color: theme.subText }]}>—</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* DİYANET NOTU */}
                <View style={[styles.not, {
                    backgroundColor: isDarkMode ? '#1A2E20' : '#F0F9F4',
                    borderColor: isDarkMode ? '#2D4A35' : '#C8E6D4',
                }]}>
                    <MaterialCommunityIcons name="information-outline" size={15} color={theme.active} />
                    <Text style={[styles.notText, { color: theme.subText }]}>
                        Vakitler Diyanet İşleri Başkanlığı metoduyla hesaplanır. İnternet bağlantısı gerekmez.
                    </Text>
                </View>

                {/* REKLAM */}
                <View style={styles.adWrapper}>
                    <BannerAd
                        unitId={adUnitId}
                        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },

    merkez: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
    yuklemeIkon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    yuklemeText: { fontSize: 14, fontWeight: '600', marginTop: 4 },
    hataText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    tekrarBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16, marginTop: 8 },
    tekrarBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8,
    },
    headerSub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    headerTitle: { fontSize: 30, fontWeight: '900' },
    konumSatir: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 160 },
    sehirText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },

    siradakiKart: {
        marginHorizontal: 16, borderRadius: 24, padding: 22, marginBottom: 14,
        elevation: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14,
    },
    siradakiUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    siradakiEtiket: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    siradakiIsim: { color: '#FFF', fontSize: 34, fontWeight: '900', marginTop: 2 },
    siradakiSaatText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '700', marginTop: 2 },
    siradakiSagBlok: { alignItems: 'flex-end' },
    sayacKutu: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 10, marginTop: 16, alignSelf: 'flex-start',
    },
    sayacText: {
        color: '#FFF', fontSize: 24, fontWeight: '900',
        fontVariant: ['tabular-nums'],
        ...Platform.select({ android: { fontFamily: 'monospace' } }),
    },
    sayacEtiket: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },

    listeKart: {
        marginHorizontal: 16, borderRadius: 24, borderWidth: 1,
        overflow: 'hidden', marginBottom: 12,
    },
    listeBas: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
    },
    listeBasText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    ayrac: { height: 1, marginHorizontal: 16, opacity: 0.4 },
    vakitSatir: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
    },
    vakitSol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    ikonWrap: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    vakitIsim: { fontSize: 15, fontWeight: '700' },
    aktifPill: { fontSize: 10, fontWeight: '800', marginTop: 1 },
    vakitSaat: { fontSize: 16, fontWeight: '900', marginRight: 10, minWidth: 52, textAlign: 'right' },
    gunesNot: { fontSize: 20, width: 51, textAlign: 'center' },

    not: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        marginHorizontal: 16, borderRadius: 14, padding: 12,
        borderWidth: 1, marginBottom: 10,
    },
    notText: { fontSize: 11, flex: 1, lineHeight: 17 },

    adWrapper: { alignItems: 'center', marginHorizontal: 16, marginTop: 4 },
});
