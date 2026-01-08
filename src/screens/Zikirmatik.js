import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext'; // Tema eklendi

const { width, height } = Dimensions.get('window');

const ZIKIR_DATA = [
    { id: 1, name: "Sübhânallah", soundFile: null },
    { id: 2, name: "Elhamdülillâh", soundFile: null },
    { id: 3, name: "Allâhu Ekber", soundFile: null },
    { id: 4, name: "Lâ ilâhe illallah", soundFile: null }
];

export default function Zikirmatik() {
    const { theme, isDarkMode } = useTheme(); // Global tema çekildi

    const [count, setCount] = useState(0);
    const [target, setTarget] = useState(33);
    const [isVibrate, setIsVibrate] = useState(true);
    const [isSound, setIsSound] = useState(true);
    const [selectedZikir, setSelectedZikir] = useState(ZIKIR_DATA[0]);
    const [dailyTotal, setDailyTotal] = useState(0);
    const [showReports, setShowReports] = useState(false);
    const [history, setHistory] = useState([]);

    const scaleValue = useRef(new Animated.Value(1)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    const totalFinished = Math.floor(count / target);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        saveData();
        const progress = (count % target) / target;
        Animated.timing(progressWidth, {
            toValue: progress * (width - 60),
            duration: 200,
            useNativeDriver: false
        }).start();
    }, [count, target, dailyTotal]);

    const saveData = async () => {
        try {
            const today = new Date().toLocaleDateString('tr-TR');
            await AsyncStorage.multiSet([
                ['@count', count.toString()],
                ['@target', target.toString()],
                ['@daily', dailyTotal.toString()]
            ]);
            let reports = await AsyncStorage.getItem('@reports');
            let reportsObj = reports ? JSON.parse(reports) : {};
            reportsObj[today] = dailyTotal;
            await AsyncStorage.setItem('@reports', JSON.stringify(reportsObj));
            setHistory(Object.entries(reportsObj).reverse());
        } catch (e) { console.log("Veri kaydetme hatası:", e); }
    };

    const loadData = async () => {
        try {
            const values = await AsyncStorage.multiGet(['@count', '@target', '@daily', '@reports']);
            if (values[0][1]) setCount(parseInt(values[0][1]));
            if (values[1][1]) setTarget(parseInt(values[1][1]));
            if (values[2][1]) setDailyTotal(parseInt(values[2][1]));
            if (values[3][1]) setHistory(Object.entries(JSON.parse(values[3][1])).reverse());
        } catch (e) { console.log("Veri yükleme hatası:", e); }
    };

    const speakZikir = async () => {
        if (!isSound || !selectedZikir.soundFile) return;
        try {
            const { sound } = await Audio.Sound.createAsync(selectedZikir.soundFile);
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) sound.unloadAsync(); });
        } catch (error) { console.log("Ses hatası."); }
    };

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleValue, { toValue: 0.92, duration: 40, useNativeDriver: true }),
            Animated.timing(scaleValue, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();

        const newCount = count + 1;
        setDailyTotal(prev => prev + 1);

        if (newCount % target === 0) {
            speakZikir();
            if (isVibrate) Vibration.vibrate([0, 150, 100, 150]);
        } else {
            if (isVibrate) Vibration.vibrate(40);
        }
        setCount(newCount);
    };

    const resetAll = () => {
        setCount(0);
        setDailyTotal(0);
        Vibration.vibrate(100);
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
            {/* 1. ÜST HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSubtitle, { color: theme.subText }]}>GÜNLÜK TESBİHAT</Text>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Zikirmatik</Text>
                </View>
                <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: isDarkMode ? theme.card : '#E9F5EE' }]}
                    onPress={() => setShowReports(true)}
                >
                    <MaterialCommunityIcons name="book-open-variant" size={26} color={theme.active} />
                    <Text style={[styles.reportBtnText, { color: theme.active }]}>Günlüğüm</Text>
                </TouchableOpacity>
            </View>

            {/* 2. ZİKİR SEÇİCİ */}
            <View style={styles.selectorContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 25, alignItems: 'center' }}
                >
                    {ZIKIR_DATA.map((z) => (
                        <TouchableOpacity
                            key={z.id}
                            onPress={() => setSelectedZikir(z)}
                            style={[
                                styles.tab,
                                { backgroundColor: theme.card, borderColor: theme.border },
                                selectedZikir.id === z.id && { backgroundColor: theme.active, borderColor: theme.active }
                            ]}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: theme.subText },
                                selectedZikir.id === z.id && { color: '#FFF' }
                            ]}>
                                {z.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* 3. ANA İÇERİK ALANI */}
            <View style={styles.content}>
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statLabel, { color: theme.subText }]}>{target}'LÜ TAM TUR</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>{totalFinished}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.statLabel, { color: theme.subText }]}>GÜNLÜK TOPLAM</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>{dailyTotal}</Text>
                    </View>
                </View>

                <View style={styles.displayArea}>
                    <Text style={[styles.mainCount, { color: isDarkMode ? '#FFF' : '#1B4332' }]}>{count}</Text>
                    <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#333' : '#E9ECEF' }]}>
                        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: theme.active }]} />
                    </View>
                </View>

                <TouchableOpacity activeOpacity={1} onPress={handlePress}>
                    <Animated.View style={[
                        styles.mainButton,
                        { backgroundColor: isDarkMode ? theme.card : '#1B4332', transform: [{ scale: scaleValue }] }
                    ]}>
                        <View style={[styles.innerButton, { backgroundColor: theme.active }]}>
                            <Text style={styles.buttonText}>ZİKİR</Text>
                            <Text style={styles.buttonSubText}>{selectedZikir.name}</Text>
                        </View>
                    </Animated.View>
                </TouchableOpacity>

                <View style={styles.bottomControls}>
                    <TouchableOpacity
                        onPress={() => setIsVibrate(!isVibrate)}
                        style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isVibrate && styles.btnOff]}
                    >
                        <MaterialCommunityIcons name={isVibrate ? "vibrate" : "vibrate-off"} size={22} color={isVibrate ? theme.active : theme.subText} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.targetChangeBtn, { backgroundColor: isDarkMode ? theme.card : '#1B4332', borderColor: theme.border, borderWidth: isDarkMode ? 1 : 0 }]}
                        onPress={() => setTarget(target === 33 ? 99 : 33)}
                    >
                        <Text style={styles.targetChangeText}>{target === 33 ? "99'luya Geç" : "33'lüye Geç"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setIsSound(!isSound)}
                        style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }, !isSound && styles.btnOff]}
                    >
                        <MaterialCommunityIcons name={isSound ? "volume-high" : "volume-off"} size={22} color={isSound ? theme.active : theme.subText} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={resetAll}
                    >
                        <MaterialCommunityIcons name="delete-sweep-outline" size={24} color="#DC2626" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 4. ZİKİR GÜNLÜĞÜ MODAL */}
            <Modal
                visible={showReports}
                onRequestClose={() => setShowReports(false)}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Zikir Günlüğüm</Text>
                            <TouchableOpacity onPress={() => setShowReports(false)}>
                                <MaterialCommunityIcons name="chevron-down" size={32} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {history.map(([date, val]) => (
                                <View key={date} style={[styles.reportItem, { borderBottomColor: theme.border }]}>
                                    <View>
                                        <Text style={[styles.reportDateText, { color: theme.text }]}>{date}</Text>
                                        <Text style={[styles.reportSubText, { color: theme.subText }]}>Günlük çekilen zikir</Text>
                                    </View>
                                    <View style={[styles.valueBadge, { backgroundColor: isDarkMode ? '#2D6A4F33' : '#E9F5EE' }]}>
                                        <Text style={[styles.reportValueText, { color: theme.active }]}>{val}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: Platform.OS === 'android' ? 15 : 10
    },
    headerSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    headerTitle: { fontSize: 28, fontWeight: '900' },
    reportBtn: { alignItems: 'center', padding: 8, borderRadius: 12 },
    reportBtnText: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },

    selectorContainer: { marginTop: 15, height: 50, justifyContent: 'center' },
    tab: {
        paddingHorizontal: 18,
        height: 38,
        borderRadius: 19,
        marginRight: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tabText: { fontWeight: 'bold', fontSize: 13 },

    content: { flex: 1, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10 },

    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 25 },
    statCard: {
        flex: 1,
        padding: 12,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    statLabel: { fontSize: 9, fontWeight: '800' },
    statValue: { fontSize: 18, fontWeight: '900' },

    displayArea: { alignItems: 'center' },
    mainCount: { fontSize: 90, fontWeight: '900', letterSpacing: -5 },
    progressBg: { width: width - 60, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%' },

    mainButton: {
        width: 200, height: 200, borderRadius: 100, padding: 10,
        elevation: 15, shadowOpacity: 0.3, shadowRadius: 20
    },
    innerButton: {
        flex: 1, borderRadius: 90, justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)'
    },
    buttonText: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    buttonSubText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', marginTop: 4 },

    bottomControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    controlBtn: {
        width: 45, height: 45, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1
    },
    btnOff: { opacity: 0.4 },
    targetChangeBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, elevation: 3 },
    targetChangeText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        height: height * 0.55, borderTopLeftRadius: 30,
        borderTopRightRadius: 30, padding: 25
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    reportItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 18, borderBottomWidth: 1
    },
    reportDateText: { fontSize: 16, fontWeight: 'bold' },
    reportSubText: { fontSize: 12, marginTop: 2 },
    valueBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 },
    reportValueText: { fontSize: 17, fontWeight: '900' }
});