import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { useContext, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ZikirContext } from '../context/ZikirContext';

const { width, height } = Dimensions.get('window');

const ZIKIR_DATA = [
    { id: 1, name: "Sübhânallah", file: require('../../assets/sounds/subhanallah.mp3') },
    { id: 2, name: "Elhamdülillâh", file: require('../../assets/sounds/elhamdulillah.mp3') },
    { id: 3, name: "Allâhu Ekber", file: require('../../assets/sounds/allahuekber.mp3') },
    { id: 4, name: "Lâ ilâhe illallah", file: require('../../assets/sounds/lailahe.mp3') }
];

export default function Zikirmatik() {
    const { theme, isDarkMode } = useTheme();
    const { toplamZikir, arttir, sifirla: contextSifirla } = useContext(ZikirContext);

    const [count, setCount] = useState(0);
    const [target, setTarget] = useState(33);
    const [isVibrate, setIsVibrate] = useState(true);
    const [isSound, setIsSound] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [selectedZikir, setSelectedZikir] = useState(ZIKIR_DATA[0]);
    const [showReports, setShowReports] = useState(false);
    const [history, setHistory] = useState([]);

    const player1 = useAudioPlayer(ZIKIR_DATA[0].file);
    const player2 = useAudioPlayer(ZIKIR_DATA[1].file);
    const player3 = useAudioPlayer(ZIKIR_DATA[2].file);
    const player4 = useAudioPlayer(ZIKIR_DATA[3].file);

    const players = { 1: player1, 2: player2, 3: player3, 4: player4 };

    const scaleValue = useRef(new Animated.Value(1)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Object.values(players).forEach(p => {
            if (p) p.playbackSpeed = playbackSpeed;
        });
    }, [playbackSpeed, selectedZikir]);

    useEffect(() => { loadData(); }, []);

    // Sadece Progress Bar Animasyonu İçin
    useEffect(() => {
        const progress = (count % target) / target;
        Animated.timing(progressWidth, {
            toValue: progress * (width - 60),
            duration: 200,
            useNativeDriver: false
        }).start();
    }, [count, target]);

    const saveData = async (currentCount, currentTotal) => {
        try {
            const today = new Date().toLocaleDateString('tr-TR');

            // Eğer parametre yoksa hata almamak için state'e düş (yedek plan)
            const finalCount = currentCount !== undefined ? currentCount : count;
            const finalTotal = currentTotal !== undefined ? currentTotal : toplamZikir;

            // AsyncStorage işlemleri
            await AsyncStorage.multiSet([
                ['@count', finalCount.toString()],
                ['@target', target.toString()]
            ]);

            let reports = await AsyncStorage.getItem('@reports');
            let reportsObj = reports ? JSON.parse(reports) : {};

            // Burası kritik: Context state'i beklemeden hesapladığımız değeri yazıyoruz
            reportsObj[today] = finalTotal;

            await AsyncStorage.setItem('@reports', JSON.stringify(reportsObj));
            setHistory(Object.entries(reportsObj).reverse());
        } catch (e) { console.log("Hata:", e); }
    };

    const loadData = async () => {
        try {
            const values = await AsyncStorage.multiGet(['@count', '@target', '@reports']);
            if (values[0][1]) setCount(parseInt(values[0][1]));
            if (values[1][1]) setTarget(parseInt(values[1][1]));
            if (values[2][1] && JSON.parse(values[2][1])) {
                setHistory(Object.entries(JSON.parse(values[2][1])).reverse());
            }
        } catch (e) { console.log("Hata:", e); }
    };

    const playZikirSound = () => {
        if (!isSound) return;
        const currentPlayer = players[selectedZikir.id];
        if (currentPlayer) {
            currentPlayer.playbackSpeed = playbackSpeed;
            currentPlayer.seekTo(0);
            currentPlayer.play();
        }
    };

    const toggleSpeed = () => {
        if (playbackSpeed === 1.0) setPlaybackSpeed(1.5);
        else if (playbackSpeed === 1.5) setPlaybackSpeed(2.0);
        else setPlaybackSpeed(1.0);
    };

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleValue, { toValue: 0.92, duration: 40, useNativeDriver: true }),
            Animated.timing(scaleValue, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();

        // 1. Adım: Mevcut değerleri al ve 1 ekle
        const newCount = count + 1;
        const newTotal = toplamZikir + 1;

        // 2. Adım: State'leri güncelle
        arttir(); // Context arttırımı
        setCount(newCount);

        // 3. Adım: Sesi oynat ve titreşim
        playZikirSound();
        if (newCount % target === 0) {
            if (isVibrate) Vibration.vibrate([0, 150, 100, 150]);
        } else {
            if (isVibrate) Vibration.vibrate(40);
        }

        // 4. Adım: Kaydetme fonksiyonuna KESİN rakamları gönder
        saveData(newCount, newTotal);
    };

    const resetAll = () => {
        setCount(0);
        contextSifirla(); // Bu toplamZikir'i 0 yapar
        Vibration.vibrate(100);
        saveData(0, 0); // Veritabanına hem count hem total olarak 0 gönderir
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSubtitle, { color: theme.subText }]}>GÜNLÜK TESBİHAT</Text>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Zikirmatik</Text>
                </View>
                <TouchableOpacity style={[styles.reportBtn, { backgroundColor: isDarkMode ? theme.card : '#E9F5EE' }]} onPress={() => setShowReports(true)}>
                    <MaterialCommunityIcons name="book-open-variant" size={26} color={theme.active} />
                    <Text style={[styles.reportBtnText, { color: theme.active }]}>Günlüğüm</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.selectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 25, alignItems: 'center' }}>
                    {ZIKIR_DATA.map((z) => (
                        <TouchableOpacity key={z.id} onPress={() => { setSelectedZikir(z); setCount(0); }} style={[styles.tab, { backgroundColor: theme.card, borderColor: theme.border }, selectedZikir.id === z.id && { backgroundColor: theme.active, borderColor: theme.active }]}>
                            <Text style={[styles.tabText, { color: theme.subText }, selectedZikir.id === z.id && { color: '#FFF' }]}>{z.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.content}>
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={[styles.statLabel, { color: theme.subText }]}>{target}'LÜ TAM TUR</Text><Text style={[styles.statValue, { color: theme.text }]}>{Math.floor(count / target)}</Text></View>
                    <View style={[styles.statCard, { backgroundColor: theme.card }]}><Text style={[styles.statLabel, { color: theme.subText }]}>GÜNLÜK TOPLAM</Text><Text style={[styles.statValue, { color: theme.text }]}>{toplamZikir}</Text></View>
                </View>

                <View style={styles.displayArea}>
                    <Text style={[styles.mainCount, { color: isDarkMode ? '#FFF' : '#1B4332' }]}>{count}</Text>
                    <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#333' : '#E9ECEF' }]}><Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: theme.active }]} /></View>
                </View>

                <TouchableOpacity activeOpacity={1} onPress={handlePress}>
                    <Animated.View style={[styles.mainButton, { backgroundColor: isDarkMode ? theme.card : '#1B4332', transform: [{ scale: scaleValue }] }]}><View style={[styles.innerButton, { backgroundColor: theme.active }]}><Text style={styles.buttonText}>ZİKİR</Text><Text style={styles.buttonSubText}>{selectedZikir.name}</Text></View></Animated.View>
                </TouchableOpacity>

                <View style={[styles.adContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.adBadge}><Text style={styles.adBadgeText}>SPONSOR</Text></View>
                    <MaterialCommunityIcons name="advertisements" size={20} color={theme.subText} style={{ marginBottom: 4 }} />
                    <Text style={{ color: theme.subText, fontSize: 12, fontWeight: '600' }}>Reklam Alanı</Text>
                </View>

                <View style={styles.bottomControls}>
                    <TouchableOpacity onPress={() => setIsVibrate(!isVibrate)} style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isVibrate && styles.btnOff]}><MaterialCommunityIcons name={isVibrate ? "vibrate" : "vibrate-off"} size={22} color={isVibrate ? theme.active : theme.subText} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setTarget(target === 33 ? 99 : 33)} style={[styles.targetChangeBtn, { backgroundColor: isDarkMode ? theme.card : '#1B4332' }]}><Text style={styles.targetChangeText}>{target === 33 ? "99'luya Geç" : "33'lüye Geç"}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={toggleSpeed} style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.active }}>{playbackSpeed}x</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setIsSound(!isSound); if (isSound) Object.values(players).forEach(p => p?.pause()); }} style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isSound && styles.btnOff]}><MaterialCommunityIcons name={isSound ? "volume-high" : "volume-off"} size={22} color={isSound ? theme.active : theme.subText} /></TouchableOpacity>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={resetAll}><MaterialCommunityIcons name="delete-sweep-outline" size={24} color="#DC2626" /></TouchableOpacity>
                </View>
            </View>

            <Modal visible={showReports} onRequestClose={() => setShowReports(false)} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Zikir Günlüğüm</Text>
                            <TouchableOpacity onPress={() => setShowReports(false)}><MaterialCommunityIcons name="chevron-down" size={32} color={theme.subText} /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {history.length > 0 ? (
                                history.map(([date, val]) => (
                                    <View key={date} style={[styles.reportItem, { borderBottomColor: theme.border }]}>
                                        <View>
                                            <Text style={[styles.reportDateText, { color: theme.text }]}>{date}</Text>
                                            <Text style={[styles.reportSubText, { color: theme.subText }]}>Günlük çekilen zikir</Text>
                                        </View>
                                        <View style={[styles.valueBadge, { backgroundColor: isDarkMode ? '#2D6A4F33' : '#E9F5EE' }]}>
                                            <Text style={[styles.reportValueText, { color: theme.active }]}>{val}</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={{ textAlign: 'center', marginTop: 50, color: theme.subText }}>Henüz kayıtlı zikir yok.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 10 },
    headerSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    headerTitle: { fontSize: 28, fontWeight: '900' },
    reportBtn: { alignItems: 'center', padding: 8, borderRadius: 12 },
    reportBtnText: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
    selectorContainer: { marginTop: 15, height: 50, justifyContent: 'center' },
    tab: { paddingHorizontal: 18, height: 38, borderRadius: 19, marginRight: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    tabText: { fontWeight: 'bold', fontSize: 13 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'space-around', paddingBottom: Platform.OS === 'android' ? 100 : 30, paddingVertical: 10 },
    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 25 },
    statCard: { flex: 1, padding: 12, borderRadius: 20, alignItems: 'center', elevation: 3 },
    statLabel: { fontSize: 9, fontWeight: '800' },
    statValue: { fontSize: 18, fontWeight: '900' },
    displayArea: { alignItems: 'center', justifyContent: 'center', width: width, paddingHorizontal: 30 },
    mainCount: {
        fontSize: 100,
        fontWeight: '900',
        letterSpacing: -2,
        textAlign: 'center',
        includeFontPadding: false,
        paddingRight: 15,
        minWidth: 160
    },
    progressBg: { width: width - 60, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%' },
    mainButton: { width: 180, height: 180, borderRadius: 90, padding: 10, elevation: 15 },
    innerButton: { flex: 1, borderRadius: 80, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)' },
    buttonText: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    buttonSubText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
    adContainer: {
        width: width - 60,
        height: 65,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        marginVertical: 10
    },
    adBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderBottomLeftRadius: 10
    },
    adBadgeText: { fontSize: 7, fontWeight: 'bold', color: '#6C757D' },
    bottomControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    controlBtn: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    btnOff: { opacity: 0.4 },
    targetChangeBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, elevation: 3 },
    targetChangeText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: height * 0.55, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    reportItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
    reportDateText: { fontSize: 16, fontWeight: 'bold' },
    reportSubText: { fontSize: 12, marginTop: 2 },
    valueBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 },
    reportValueText: { fontSize: 17, fontWeight: '900' }
});