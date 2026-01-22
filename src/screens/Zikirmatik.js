import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ZikirContext } from '../context/ZikirContext';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isIPad = width > 600;

// Ekran boyutuna göre dinamik buton ve yazı boyutları
const responsiveBtnSize = isIPad ? height * 0.22 : (isSmallDevice ? height * 0.17 : height * 0.20);
const responsiveCountSize = isIPad ? height * 0.12 : (isSmallDevice ? height * 0.08 : height * 0.10);

const ZIKIR_DATA = [
    { id: 1, name: "Sübhânallah", file: require('../../assets/sounds/subhanallah.mp3') },
    { id: 2, name: "Elhamdülillâh", file: require('../../assets/sounds/elhamdulillah.mp3') },
    { id: 3, name: "Allâhu Ekber", file: require('../../assets/sounds/allahuekber.mp3') },
    { id: 4, name: "Lâ ilâhe illallah", file: require('../../assets/sounds/lailahe.mp3') }
];

export default function Zikirmatik() {
    const { theme, isDarkMode } = useTheme();
    const { toplamZikir, arttir, sifirla: contextSifirla } = useContext(ZikirContext);
    const isFocused = useIsFocused();

    const [count, setCount] = useState(0);
    const [target, setTarget] = useState(33);
    const [isVibrate, setIsVibrate] = useState(true);
    const [isSound, setIsSound] = useState(true);
    const [selectedZikir, setSelectedZikir] = useState(ZIKIR_DATA[0]);
    const [showReports, setShowReports] = useState(false);
    const [history, setHistory] = useState([]);

    const player1 = useAudioPlayer(ZIKIR_DATA[0].file);
    const player2 = useAudioPlayer(ZIKIR_DATA[1].file);
    const player3 = useAudioPlayer(ZIKIR_DATA[2].file);
    const player4 = useAudioPlayer(ZIKIR_DATA[3].file);

    const players = useMemo(() => ({
        1: player1, 2: player2, 3: player3, 4: player4
    }), [player1, player2, player3, player4]);

    const scaleValue = useRef(new Animated.Value(1)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    const loadData = useCallback(async () => {
        try {
            const today = new Date().toLocaleDateString('tr-TR');
            const values = await AsyncStorage.multiGet(['@count', '@target', '@reports', '@lastDate']);

            if (values[1][1]) setTarget(parseInt(values[1][1]));
            if (values[2][1]) {
                const parsed = JSON.parse(values[2][1]);
                setHistory(Object.entries(parsed).reverse());
            }

            const lastDate = values[3][1];
            if (lastDate && lastDate !== today) {
                setCount(0);
                contextSifirla();
                await AsyncStorage.multiSet([['@lastDate', today], ['@count', "0"]]);
            } else {
                if (values[0][1]) setCount(parseInt(values[0][1]));
                if (!lastDate) await AsyncStorage.setItem('@lastDate', today);
            }
        } catch (e) { console.log(e); }
    }, [contextSifirla]);

    useEffect(() => { if (isFocused) loadData(); }, [isFocused, loadData]);

    useEffect(() => {
        const progress = (count % target) / target;
        Animated.timing(progressWidth, {
            toValue: progress * (width - 60),
            duration: 200,
            useNativeDriver: false
        }).start();
    }, [count, target]);

    const saveData = useCallback(async (currentCount, currentTotal) => {
        try {
            const today = new Date().toLocaleDateString('tr-TR');
            await AsyncStorage.multiSet([
                ['@count', currentCount.toString()],
                ['@target', target.toString()],
                ['@lastDate', today]
            ]);
            let reports = await AsyncStorage.getItem('@reports');
            let reportsObj = reports ? JSON.parse(reports) : {};
            reportsObj[today] = currentTotal;
            await AsyncStorage.setItem('@reports', JSON.stringify(reportsObj));
            setHistory(Object.entries(reportsObj).reverse());
        } catch (e) { console.log(e); }
    }, [target]);

    const playZikirSound = useCallback(() => {
        if (!isSound) return;
        const currentPlayer = players[selectedZikir.id];
        if (currentPlayer) {
            currentPlayer.seekTo(0);
            currentPlayer.play();
        }
    }, [isSound, players, selectedZikir.id]);

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleValue, { toValue: 0.92, duration: 45, useNativeDriver: true }),
            Animated.timing(scaleValue, { toValue: 1, duration: 90, useNativeDriver: true }),
        ]).start();

        const newCount = count + 1;
        const newTotal = toplamZikir + 1;

        arttir();
        setCount(newCount);
        playZikirSound();

        if (isVibrate) {
            newCount % target === 0 ? Vibration.vibrate([0, 150, 100, 150]) : Vibration.vibrate(40);
        }
        saveData(newCount, newTotal);
    };

    const resetAll = () => {
        setCount(0);
        contextSifirla();
        Vibration.vibrate(100);
        saveData(0, 0);
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right', 'bottom']}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
                
                {/* ÜST GRUP */}
                <View style={styles.topGroup}>
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.headerSubtitle, { color: theme.subText }]}>GÜNLÜK TESBİHAT</Text>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Zikirmatik</Text>
                        </View>
                        <TouchableOpacity style={[styles.reportBtn, { backgroundColor: isDarkMode ? theme.card : '#E9F5EE' }]} onPress={() => setShowReports(true)}>
                            <MaterialCommunityIcons name="book-open-variant" size={22} color={theme.active} />
                            <Text style={[styles.reportBtnText, { color: theme.active }]}>Günlüğüm</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.selectorWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                            {ZIKIR_DATA.map((z) => (
                                <TouchableOpacity 
                                    key={z.id} 
                                    onPress={() => { setSelectedZikir(z); setCount(0); }} 
                                    style={[styles.tab, { backgroundColor: theme.card, borderColor: theme.border }, selectedZikir.id === z.id && { backgroundColor: theme.active, borderColor: theme.active }]}
                                >
                                    <Text style={[styles.tabText, { color: theme.subText }, selectedZikir.id === z.id && { color: '#FFF' }]}>{z.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* ORTA GRUP (ESNEK ALAN) */}
                <View style={styles.centerGroup}>
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{target}{"\'LÜ TUR"}</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{Math.floor(count / target)}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>TOPLAM</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{toplamZikir}</Text>
                        </View>
                    </View>

                    <View style={styles.displayArea}>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.mainCount, { color: isDarkMode ? '#FFF' : '#1B4332' }]}>{count}</Text>
                        <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#333' : '#E9ECEF' }]}>
                            <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: theme.active }]} />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity activeOpacity={1} onPress={handlePress}>
                            <Animated.View style={[styles.mainButton, { backgroundColor: isDarkMode ? theme.card : '#1B4332', width: responsiveBtnSize, height: responsiveBtnSize, borderRadius: responsiveBtnSize / 2, transform: [{ scale: scaleValue }] }]}>
                                <View style={[styles.innerButton, { backgroundColor: theme.active, borderRadius: (responsiveBtnSize - 12) / 2 }]}>
                                    <Text style={[styles.buttonText, { fontSize: responsiveBtnSize * 0.14 }]}>ZİKİR</Text>
                                    <Text numberOfLines={1} style={styles.buttonSubText}>{selectedZikir.name}</Text>
                                </View>
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ALT GRUP */}
                <View style={styles.bottomGroup}>
                    <View style={[styles.adContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={{ color: theme.subText, fontSize: 10, fontWeight: '600' }}>Reklam Alanı</Text>
                    </View>

                    <View style={styles.bottomControls}>
                        <TouchableOpacity onPress={() => setIsVibrate(!isVibrate)} style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isVibrate && styles.btnOff]}>
                            <MaterialCommunityIcons name={isVibrate ? "vibrate" : "vibrate-off"} size={20} color={isVibrate ? theme.active : theme.subText} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setTarget(target === 33 ? 99 : 33)} style={[styles.targetChangeBtn, { backgroundColor: isDarkMode ? theme.card : '#1B4332' }]}>
                            <Text style={styles.targetChangeText}>{target === 33 ? "99\'lu Mod" : "33\'lü Mod"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsSound(!isSound)} style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isSound && styles.btnOff]}>
                            <MaterialCommunityIcons name={isSound ? "volume-high" : "volume-off"} size={20} color={isSound ? theme.active : theme.subText} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={resetAll}>
                            <MaterialCommunityIcons name="delete-sweep-outline" size={22} color="#DC2626" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* MODAL GÜNLÜK */}
            <Modal visible={showReports} onRequestClose={() => setShowReports(false)} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Zikir Günlüğüm</Text>
                            <TouchableOpacity onPress={() => setShowReports(false)}>
                                <MaterialCommunityIcons name="chevron-down" size={32} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            {history.length > 0 ? history.map(([date, val]) => (
                                <View key={date} style={[styles.reportItem, { borderBottomColor: theme.border }]}>
                                    <View>
                                        <Text style={[styles.reportDateText, { color: theme.text }]}>{date}</Text>
                                        <Text style={[styles.reportSubText, { color: theme.subText }]}>Günlük toplam zikir</Text>
                                    </View>
                                    <View style={[styles.valueBadge, { backgroundColor: isDarkMode ? '#2D6A4F33' : '#E9F5EE' }]}>
                                        <Text style={[styles.reportValueText, { color: theme.active }]}>{val}</Text>
                                    </View>
                                </View>
                            )) : (
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <MaterialCommunityIcons name="calendar-blank" size={60} color={theme.subText} />
                                    <Text style={{ marginTop: 15, color: theme.subText }}>Henüz kayıtlı zikir yok.</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
    topGroup: { paddingTop: 10, paddingBottom: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 15 },
    headerSubtitle: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
    headerTitle: { fontSize: 26, fontWeight: '900' },
    reportBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
    reportBtnText: { fontSize: 12, fontWeight: 'bold' },
    selectorWrapper: { height: 45 },
    selectorScroll: { paddingHorizontal: 20, alignItems: 'center' },
    tab: { paddingHorizontal: 16, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 1, justifyContent: 'center' },
    tabText: { fontWeight: 'bold', fontSize: 11 },
    centerGroup: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
    statsRow: { flexDirection: 'row', gap: 15, width: '100%', marginBottom: 20 },
    statCard: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    statLabel: { fontSize: 9, fontWeight: '800', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '900' },
    displayArea: { alignItems: 'center', width: '100%', marginBottom: 20 },
    mainCount: { fontSize: responsiveCountSize, fontWeight: '900', textAlign: 'center' },
    progressBg: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10 },
    progressFill: { height: '100%' },
    buttonContainer: { justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
    mainButton: { padding: 8, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8 },
    innerButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
    buttonText: { color: '#FFF', fontWeight: '900' },
    buttonSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
    bottomGroup: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'android' ? 35 : 15, width: '100%' },
    adContainer: { width: '100%', height: 50, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    bottomControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    controlBtn: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    targetChangeBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    targetChangeText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    btnOff: { opacity: 0.4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: height * 0.7, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    reportItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
    reportDateText: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
    reportSubText: { fontSize: 12 },
    valueBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 },
    reportValueText: { fontSize: 16, fontWeight: '900' }
});