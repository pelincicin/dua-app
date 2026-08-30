import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../AdsConfig';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useZikirZinciri } from '../context/ZikirZinciriContext';
import { ZikirContext } from '../context/ZikirContext';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { zikirIlerlemesiArttir } from '../services/zikirZinciriService';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isIPad = width > 600;

const adUnitId = AD_UNIT_IDS.ZIKIRMATIK;
const responsiveBtnSize = isIPad ? height * 0.22 : (isSmallDevice ? height * 0.18 : height * 0.22);

const ZIKIR_DATA = [
    { id: 1, name: 'Sübhânallah', file: require('../../assets/sounds/subhanallah.mp3') },
    { id: 2, name: 'Elhamdülillâh', file: require('../../assets/sounds/elhamdulillah.mp3') },
    { id: 3, name: 'Allâhu Ekber', file: require('../../assets/sounds/allahuekber.mp3') },
    { id: 4, name: 'Lâ ilâhe illallah', file: require('../../assets/sounds/lailahe.mp3') },
];

// ─── Kutlama Confetti Parçacığı ──────────────────────────────────────────────
function ConfettiParticle({ delay, color }) {
    const anim = useRef(new Animated.Value(0)).current;
    const x = useRef(Math.random() * width).current;
    const rot = useRef(Math.random() * 720).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + Math.random() * 800,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [anim, delay]);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-50, height * 0.7] });
    const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rot}deg`] });

    return (
        <Animated.View style={[
            styles.confettiDot,
            { left: x, backgroundColor: color, transform: [{ translateY }, { rotate }], opacity }
        ]} />
    );
}

const CONFETTI_COLORS = ['#FFB703', '#2D6A4F', '#8E94F2', '#FB8500', '#219EBC', '#E63946'];

function KutlamaModal({ visible, istek, onKapat }) {
    const confettis = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: i * 60,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })), []);

    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [visible, scaleAnim]);

    if (!visible || !istek) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.kutlamaOverlay}>
                {confettis.map(c => <ConfettiParticle key={c.id} delay={c.delay} color={c.color} />)}
                <Animated.View style={[styles.kutlamaKart, { transform: [{ scale: scaleAnim }] }]}>
                    <Text style={styles.kutlamaEmoji}>🤲</Text>
                    <Text style={styles.kutlamaBaslik}>Allah Kabul Etsin!</Text>
                    <Text style={styles.kutlamaAlt}>
                        {istek.fromName === 'Grup'
                            ? `Grup zikrini tamamladın!`
                            : `${istek.fromName} için ${istek.miktar.toLocaleString()} zikrini tamamladın!`}
                    </Text>
                    <Text style={styles.kutlamaDua}>
                        &quot;Rabbimiz! Bizden kabul et. Şüphesiz sen işitensin, bilensin.&quot;
                    </Text>
                    <TouchableOpacity style={styles.kutlamaBtn} onPress={onKapat}>
                        <Text style={styles.kutlamaBtnText}>Amin</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function Zikirmatik() {
    const { theme, isDarkMode } = useTheme();
    const { toplamZikir, arttir, sifirla: contextSifirla } = useContext(ZikirContext);
    const { aktifIcin, setAktifIcin, aktifGruplar } = useZikirZinciri();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { showAdIfReady } = useInterstitialAd();

    const [counts, setCounts] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
    const [target, setTarget] = useState(33);
    const [isVibrate, setIsVibrate] = useState(true);
    const [isSound, setIsSound] = useState(true);
    const [selectedZikir, setSelectedZikir] = useState(ZIKIR_DATA[0]);
    const [showReports, setShowReports] = useState(false);
    const [history, setHistory] = useState([]);
    const [kutlamaGoster, setKutlamaGoster] = useState(false);
    const [kutlamaIstek, setKutlamaIstek] = useState(null);

    const icinCekModu = aktifIcin !== null;
    const icinGrupAdi = aktifIcin?.groupId
        ? (aktifGruplar.find(g => g.id === aktifIcin.groupId)?.baslik || 'Grup Zikiri')
        : null;

    const player1 = useAudioPlayer(ZIKIR_DATA[0].file);
    const player2 = useAudioPlayer(ZIKIR_DATA[1].file);
    const player3 = useAudioPlayer(ZIKIR_DATA[2].file);
    const player4 = useAudioPlayer(ZIKIR_DATA[3].file);

    const players = useMemo(() => ({
        1: player1, 2: player2, 3: player3, 4: player4
    }), [player1, player2, player3, player4]);

    const scaleValue = useRef(new Animated.Value(1)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;
    const icinScaleAnim = useRef(new Animated.Value(icinCekModu ? 1 : 0)).current;

    // İçin çek banner animasyonu
    useEffect(() => {
        Animated.spring(icinScaleAnim, {
            toValue: icinCekModu ? 1 : 0,
            friction: 6,
            useNativeDriver: true,
        }).start();
    }, [icinCekModu, icinScaleAnim]);

    const loadData = useCallback(async () => {
        try {
            const today = new Date().toLocaleDateString('tr-TR');
            const values = await AsyncStorage.multiGet(['@counts_object', '@target', '@reports', '@lastDate']);
            if (values[1][1]) setTarget(parseInt(values[1][1]));
            if (values[2][1]) setHistory(Object.entries(JSON.parse(values[2][1])).reverse());
            if (values[3][1] && values[3][1] !== today) {
                const resetData = { 1: 0, 2: 0, 3: 0, 4: 0 };
                setCounts(resetData);
                contextSifirla();
                await AsyncStorage.multiSet([['@lastDate', today], ['@counts_object', JSON.stringify(resetData)]]);
            } else {
                if (values[0][1]) setCounts(JSON.parse(values[0][1]));
                if (!values[3][1]) await AsyncStorage.setItem('@lastDate', today);
            }
        } catch (e) { console.log(e); }
    }, [contextSifirla]);

    useEffect(() => {
        if (isFocused) loadData();
    }, [isFocused, loadData]);

    useEffect(() => {
        const currentCount = counts[selectedZikir.id] || 0;
        const progress = (currentCount % target) / target;
        Animated.spring(progressWidth, {
            toValue: progress * (width - 50),
            useNativeDriver: false,
            bounciness: 4,
            speed: 12,
        }).start();
    }, [selectedZikir.id, counts, target, progressWidth]);

    const saveData = async (newCounts, currentTotal) => {
        try {
            const today = new Date().toLocaleDateString('tr-TR');
            await AsyncStorage.setItem('@counts_object', JSON.stringify(newCounts));
            let reports = await AsyncStorage.getItem('@reports');
            let reportsObj = reports ? JSON.parse(reports) : {};
            reportsObj[today] = currentTotal;
            await AsyncStorage.setItem('@reports', JSON.stringify(reportsObj));
            setHistory(Object.entries(reportsObj).reverse());
        } catch (e) { console.log(e); }
    };

    const handlePress = async () => {
        Animated.sequence([
            Animated.timing(scaleValue, { toValue: 0.88, duration: 40, useNativeDriver: true }),
            Animated.spring(scaleValue, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();

        const currentVal = counts[selectedZikir.id] || 0;
        const newCounts = { ...counts, [selectedZikir.id]: currentVal + 1 };
        const newTotal = toplamZikir + 1;
        arttir();
        setCounts(newCounts);

        if (isSound) {
            const cp = players[selectedZikir.id];
            if (cp) { cp.seekTo(0); cp.play(); }
        }
        if (isVibrate) {
            if ((currentVal + 1) % target === 0) Vibration.vibrate([0, 150, 100, 150]);
            else Vibration.vibrate(Platform.OS === 'ios' ? 10 : 40);
        }

        saveData(newCounts, newTotal);

        // Her 100 zikirde tam ekran reklam göster
        if (newTotal % 100 === 0) showAdIfReady();

        // İçin çek modu: Firestore'da ilerlemeyi artır
        if (icinCekModu && aktifIcin) {
            try {
                const sonuc = await zikirIlerlemesiArttir(aktifIcin.id);
                if (sonuc?.tamamlandi) {
                    setKutlamaIstek(aktifIcin);
                    setKutlamaGoster(true);
                    setAktifIcin(null);
                }
            } catch (e) {
                console.log('Firestore artırma hatası:', e);
            }
        }
    };

    const resetAll = () => {
        const resetData = { 1: 0, 2: 0, 3: 0, 4: 0 };
        setCounts(resetData);
        contextSifirla();
        Vibration.vibrate(100);
        saveData(resetData, 0);
    };

    const currentCount = counts[selectedZikir.id] || 0;
    const icinTamamlanan = aktifIcin ? aktifIcin.tamamlanan : 0;
    const icinHedef = aktifIcin ? aktifIcin.miktar : 0;
    const icinPct = icinHedef > 0 ? Math.min(Math.round((icinTamamlanan / icinHedef) * 100), 100) : 0;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSubtitle, { color: theme.subText }]}>GÜNLÜK TESBİHAT</Text>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Zikirmatik</Text>
                </View>
                <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: isDarkMode ? theme.card : '#E9F5EE' }]}
                    onPress={() => setShowReports(true)}
                >
                    <MaterialCommunityIcons name="history" size={22} color={theme.active} />
                    <Text style={[styles.reportBtnText, { color: theme.active }]}>Geçmiş</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>

                {/* İÇİN ÇEK BANNER */}
                <Animated.View style={[styles.icinBannerWrap, { transform: [{ scaleY: icinScaleAnim }], opacity: icinScaleAnim }]}>
                    {aktifIcin && (
                        <View style={[styles.icinBanner, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}>
                            <View style={styles.icinBannerSol}>
                                <MaterialCommunityIcons
                                    name={icinGrupAdi ? 'account-group' : 'account'}
                                    size={18} color={theme.active}
                                />
                                <View>
                                    <Text style={[styles.icinBannerBaslik, { color: theme.active }]}>
                                        {icinGrupAdi ? icinGrupAdi : `${aktifIcin.fromName} İçin`}
                                    </Text>
                                    <Text style={[styles.icinBannerAlt, { color: theme.subText }]}>
                                        {icinTamamlanan.toLocaleString()} / {icinHedef.toLocaleString()} · %{icinPct}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setAktifIcin(null)} style={styles.icinKapat}>
                                <MaterialCommunityIcons name="close-circle-outline" size={20} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>

                {/* ZIKIR SEÇİCİ */}
                <View style={styles.selectorWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                        {ZIKIR_DATA.map(z => (
                            <TouchableOpacity
                                key={z.id}
                                onPress={() => setSelectedZikir(z)}
                                style={[
                                    styles.tab,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                    selectedZikir.id === z.id && { backgroundColor: theme.active, borderColor: theme.active }
                                ]}
                            >
                                <Text style={[styles.tabText, { color: theme.subText }, selectedZikir.id === z.id && { color: '#FFF' }]}>
                                    {z.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.centerGroup}>
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{target}&apos;LÜ TUR</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>
                                {Math.floor(currentCount / target)}
                            </Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>BUGÜN TOPLAM</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{toplamZikir}</Text>
                        </View>
                        {icinCekModu && aktifIcin && (
                            <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE', borderColor: theme.active }]}>
                                <Text style={[styles.statLabel, { color: theme.active }]}>ZİNCİR</Text>
                                <Text style={[styles.statValue, { color: theme.active }]}>{icinTamamlanan}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.displayArea}>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.mainCount, { color: icinCekModu ? theme.active : theme.text }]}>
                            {currentCount}
                        </Text>
                        <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#222' : '#E9ECEF' }]}>
                            <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: theme.active }]} />
                        </View>
                    </View>

                    <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.buttonContainer}>
                        <Animated.View style={[
                            styles.mainButton,
                            {
                                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF',
                                width: responsiveBtnSize,
                                height: responsiveBtnSize,
                                borderRadius: responsiveBtnSize / 2,
                                transform: [{ scale: scaleValue }],
                                borderColor: icinCekModu ? theme.active : theme.active,
                                borderWidth: icinCekModu ? 5 : 4,
                            }
                        ]}>
                            <View style={[styles.innerButton, {
                                backgroundColor: theme.active,
                                borderRadius: (responsiveBtnSize - 20) / 2
                            }]}>
                                <MaterialCommunityIcons
                                    name={icinCekModu ? (icinGrupAdi ? 'account-group' : 'account') : 'fingerprint'}
                                    size={responsiveBtnSize * 0.3}
                                    color="white"
                                />
                                <Text numberOfLines={1} style={styles.buttonSubText}>
                                    {icinCekModu && aktifIcin
                                        ? (icinGrupAdi ? icinGrupAdi.toUpperCase() : `${aktifIcin.fromName.toUpperCase()} İÇİN`)
                                        : selectedZikir.name.toUpperCase()}
                                </Text>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.bottomGroup, { marginBottom: insets.bottom + 10 }]}>
                    <View style={styles.adWrapper}>
                        <BannerAd unitId={adUnitId} size={BannerAdSize.BANNER}
                            requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
                    </View>

                    <View style={styles.bottomControls}>
                        <TouchableOpacity
                            onPress={() => setIsVibrate(!isVibrate)}
                            style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isVibrate && styles.btnOff]}
                        >
                            <MaterialCommunityIcons name={isVibrate ? 'vibrate' : 'vibrate-off'} size={22}
                                color={isVibrate ? theme.active : theme.subText} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setTarget(target === 33 ? 99 : 33)}
                            style={[styles.targetChangeBtn, { backgroundColor: theme.active }]}
                        >
                            <Text style={styles.targetChangeText}>{target === 33 ? "99'lu Mod" : "33'lü Mod"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setIsSound(!isSound)}
                            style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isSound && styles.btnOff]}
                        >
                            <MaterialCommunityIcons name={isSound ? 'volume-high' : 'volume-off'} size={22}
                                color={isSound ? theme.active : theme.subText} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={resetAll}
                        >
                            <MaterialCommunityIcons name="refresh" size={24} color="#DC2626" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* GEÇMİŞ MODAL */}
            <Modal visible={showReports} onRequestClose={() => setShowReports(false)} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Zikir Günlüğüm</Text>
                            <TouchableOpacity onPress={() => setShowReports(false)}>
                                <MaterialCommunityIcons name="close-circle" size={32} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            {history.length > 0
                                ? history.map(([date, val]) => (
                                    <View key={date} style={[styles.reportItem, { borderBottomColor: theme.border }]}>
                                        <View>
                                            <Text style={[styles.reportDateText, { color: theme.text }]}>{date}</Text>
                                            <Text style={[styles.reportSubText, { color: theme.subText }]}>Günlük toplam zikir</Text>
                                        </View>
                                        <View style={[styles.valueBadge, { backgroundColor: isDarkMode ? '#2D6A4F33' : '#E9F5EE' }]}>
                                            <Text style={[styles.reportValueText, { color: theme.active }]}>{val}</Text>
                                        </View>
                                    </View>
                                ))
                                : (
                                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                                        <MaterialCommunityIcons name="calendar-blank" size={60} color={theme.subText} />
                                        <Text style={{ marginTop: 15, color: theme.subText }}>Henüz kayıtlı zikir yok.</Text>
                                    </View>
                                )
                            }
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* KUTLAMA MODAL */}
            <KutlamaModal
                visible={kutlamaGoster}
                istek={kutlamaIstek}
                onKapat={() => setKutlamaGoster(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 25, paddingVertical: 15
    },
    headerSubtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    headerTitle: { fontSize: 28, fontWeight: '900' },
    reportBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 15, gap: 8 },
    reportBtnText: { fontSize: 13, fontWeight: '800' },
    scrollContent: { flexGrow: 1 },

    // İçin Çek Banner
    icinBannerWrap: { marginHorizontal: 20, marginBottom: 4, overflow: 'hidden' },
    icinBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10
    },
    icinBannerSol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    icinBannerBaslik: { fontSize: 13, fontWeight: '800' },
    icinBannerAlt: { fontSize: 11, marginTop: 1 },
    icinKapat: { padding: 4 },

    selectorWrapper: { height: 50, marginBottom: 10 },
    selectorScroll: { paddingHorizontal: 20, alignItems: 'center' },
    tab: { paddingHorizontal: 18, height: 38, borderRadius: 19, marginRight: 10, borderWidth: 1, justifyContent: 'center' },
    tabText: { fontWeight: '800', fontSize: 12 },

    centerGroup: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
    statsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 25 },
    statCard: {
        flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', borderWidth: 1, elevation: 2
    },
    statLabel: { fontSize: 8, fontWeight: '900', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '900' },

    displayArea: { alignItems: 'center', width: '100%', marginBottom: 30 },
    mainCount: { fontSize: height * 0.10, fontWeight: '900', textAlign: 'center' },
    progressBg: { width: '100%', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 15 },
    progressFill: { height: '100%' },

    buttonContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    mainButton: {
        padding: 10, elevation: 15,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10,
        justifyContent: 'center', alignItems: 'center'
    },
    innerButton: {
        flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)'
    },
    buttonSubText: { color: '#FFF', fontSize: 11, fontWeight: '900', marginTop: 8, textTransform: 'uppercase' },

    bottomGroup: { paddingHorizontal: 20, width: '100%' },
    adWrapper: { width: '100%', alignItems: 'center', marginBottom: 20 },
    bottomControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    controlBtn: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    targetChangeBtn: { flex: 1, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    targetChangeText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
    btnOff: { opacity: 0.3 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { height: height * 0.75, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 24, fontWeight: '900' },
    reportItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
    reportDateText: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
    reportSubText: { fontSize: 12, fontWeight: '500' },
    valueBadge: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 },
    reportValueText: { fontSize: 18, fontWeight: '900' },

    // Kutlama
    kutlamaOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
    kutlamaKart: {
        backgroundColor: '#FFF', borderRadius: 30, padding: 32, alignItems: 'center',
        marginHorizontal: 32, elevation: 20
    },
    kutlamaEmoji: { fontSize: 56, marginBottom: 12 },
    kutlamaBaslik: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
    kutlamaAlt: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
    kutlamaDua: {
        fontSize: 13, color: '#2D6A4F', fontStyle: 'italic', textAlign: 'center',
        lineHeight: 20, marginBottom: 24, paddingHorizontal: 8
    },
    kutlamaBtn: {
        backgroundColor: '#2D6A4F', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 16
    },
    kutlamaBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
    confettiDot: { position: 'absolute', width: 10, height: 10, borderRadius: 3 },
});
