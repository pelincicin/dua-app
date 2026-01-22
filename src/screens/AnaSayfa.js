import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ZikirContext } from '../context/ZikirContext';
import data from '../data/data.json';

const { width } = Dimensions.get('window');

export default function AnaSayfa({ navigation }) {
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const { toplamZikir } = useContext(ZikirContext);
    const [weeklyStats, setWeeklyStats] = useState([]);
    const [iyilikler, setIyilikler] = useState({
        gulumseme: false,
        hayvanBesleme: false,
        selamlasma: false,
        iyilikYapma: false
    });

    const isFocused = useIsFocused();
    const hedefZikir = 1200;

    // now nesnesini her renderda değişmeyecek şekilde, ancak tarih değişince güncellenecek formda tutuyoruz
    const now = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => now.toLocaleDateString('tr-TR'), [now]);

    // --- ANIMASYON KURULUMU ---
    const slideAnim = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isDarkMode ? 1 : 0,
            duration: 250,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
        }).start();
    }, [isDarkMode, slideAnim]); // slideAnim eklendi (ESLint hatası fix)

    const translateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 24]
    });
    // ---------------------------

    const { gununDuasi, gununSunneti, gununEsmasi, hicriTarih, selamlama } = useMemo(() => {
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayIdx = Math.floor(diff / oneDay);

        const d = data.dualar[dayIdx % data.dualar.length] || { turkce: "...", anlam: "..." };
        const s = data.sunnetler[dayIdx % data.sunnetler.length] || { metin: "...", kaynak: "..." };
        const e = data.esmalar[dayIdx % data.esmalar.length] || { isim: "...", anlam: "..." };

        const saat = now.getHours();
        const sel = saat >= 5 && saat < 11 ? "Hayırlı Sabahlar" : saat >= 11 && saat < 17 ? "Hayırlı Günler" : saat >= 17 && saat < 21 ? "Hayırlı Akşamlar" : "Hayırlı Geceler";
        const hicri = new Intl.DateTimeFormat('tr-u-ca-islamic-uma-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);

        return { gununDuasi: d, gununSunneti: s, gununEsmasi: e, hicriTarih: hicri, selamlama: sel };
    }, [now]); // todayStr gereksiz olduğu için kaldırıldı

    const fetchWeeklyData = useCallback(async () => {
        try {
            const reports = await AsyncStorage.getItem('@reports');
            const reportsObj = reports ? JSON.parse(reports) : {};
            const stats = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('tr-TR');
                let dayValue = reportsObj[dateStr] || 0;
                if (dateStr === todayStr) dayValue = toplamZikir;
                stats.push({
                    dayName: d.toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase(),
                    value: dayValue
                });
            }
            setWeeklyStats(stats);
        } catch (e) { console.log("Haftalık veri çekme hatası:", e); }
    }, [toplamZikir, todayStr]);

    const loadIyilikler = useCallback(async () => {
        try {
            const saved = await AsyncStorage.getItem(`@iyilik_${todayStr}`);
            if (saved) setIyilikler(JSON.parse(saved));
            else setIyilikler({ gulumseme: false, hayvanBesleme: false, selamlasma: false, iyilikYapma: false });
        } catch (e) { console.log(e); }
    }, [todayStr]);

    useEffect(() => {
        if (isFocused) {
            fetchWeeklyData();
            loadIyilikler();
        }
    }, [isFocused, fetchWeeklyData, loadIyilikler]); // Bağımlılıklar eklendi (ESLint hatası fix)

    const toggleIyilik = async (key) => {
        const yeniIyilikler = { ...iyilikler, [key]: !iyilikler[key] };
        setIyilikler(yeniIyilikler);
        try {
            await AsyncStorage.setItem(`@iyilik_${todayStr}`, JSON.stringify(yeniIyilikler));
        } catch (e) { console.log(e); }
    };

    const handleKiblePress = () => {
        Alert.alert("Çok Yakında! ✨", "Kıble Pusulası geliştirilme aşamasındadır.", [{ text: "Anladım", style: "cancel" }]);
    };

    const yaklasanDiniGun = useMemo(() => {
        const diniGunler = [
            { isim: "Miraç Kandili", tarih: new Date('2026-01-15') },
            { isim: "Berat Kandili", tarih: new Date('2026-02-02') },
            { isim: "Ramazan Başlangıcı", tarih: new Date('2026-02-19') },
            { isim: "Kadir Gecesi", tarih: new Date('2026-03-16') },
            { isim: "Ramazan Bayramı", tarih: new Date('2026-03-20') },
            { isim: "Kurban Bayramı", tarih: new Date('2026-05-27') },
        ];
        const bugunSifir = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const gelecekGun = diniGunler.filter(gun => gun.tarih >= bugunSifir).sort((a, b) => a.tarih - b.tarih)[0];
        if (!gelecekGun) return { isim: "Mübarek Gün", kalan: "2027'de" };
        const gunSayisi = Math.ceil((gelecekGun.tarih - bugunSifir) / (1000 * 60 * 60 * 24));
        return { isim: gelecekGun.isim, kalan: gunSayisi === 0 ? "Bugün!" : `${gunSayisi} Gün Kaldı` };
    }, [now]); // todayStr gereksiz olduğu için kaldırıldı

    const maxWeeklyValue = Math.max(...weeklyStats.map(s => s.value), 1);

    const iyilikColors = {
        gulumseme: { active: '#FFB703', bg: '#FFF9E6', darkBg: '#332900' },
        hayvan: { active: '#FB8500', bg: '#FFF2E6', darkBg: '#331B00' },
        selam: { active: '#219EBC', bg: '#E6F6F9', darkBg: '#00252D' },
        iyilik: { active: '#8E94F2', bg: '#F2F3FF', darkBg: '#1A1C3D' }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['right', 'top', 'left']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* ÜST BAR */}
                <View style={styles.topInfoBar}>
                    <View>
                        <Text style={[styles.hicriDate, { color: theme.active }]}>{hicriTarih}</Text>
                        <Text style={[styles.miladiDate, { color: theme.subText }]}>{selamlama}</Text>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={toggleTheme}
                        style={[
                            styles.themeToggleNew,
                            {
                                backgroundColor: isDarkMode ? '#1E1E1E' : '#E0E0E0',
                                borderColor: isDarkMode ? '#333' : '#CCC'
                            }
                        ]}
                    >
                        <Animated.View
                            style={[
                                styles.themeToggleInner,
                                {
                                    backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
                                    transform: [{ translateX: translateX }]
                                }
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={isDarkMode ? "moon-waning-crescent" : "weather-sunny"}
                                size={16}
                                color={isDarkMode ? "#A29BFE" : "#FFB703"}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                {/* YAKLAŞAN GÜN */}
                <View style={[styles.daysBadge, { backgroundColor: isDarkMode ? '#2D6A4F33' : '#E9F5EE' }]}>
                    <Text style={[styles.daysLabel, { color: theme.active }]}>{yaklasanDiniGun.isim} - {yaklasanDiniGun.kalan}</Text>
                </View>

                {/* ZİKİR KARTI */}
                <TouchableOpacity style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => navigation.navigate('Zikirmatik')} activeOpacity={0.9}>
                    <View style={styles.progressHeader}>
                        <View>
                            <Text style={[styles.progressSubtitle, { color: theme.subText }]}>BUGÜNKÜ TOPLAM ZİKİR</Text>
                            <Text style={[styles.progressTitle, { color: theme.text }]}>{toplamZikir?.toLocaleString() || 0} <Text style={{ fontSize: 14 }}>Zikir</Text></Text>
                        </View>
                        <View style={[styles.progressIconBox, { backgroundColor: theme.active }]}><MaterialCommunityIcons name="podium-gold" size={24} color="white" /></View>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#333' : '#F0F0F0' }]}>
                        <View style={[styles.progressBarFill, { backgroundColor: theme.active, width: `${Math.min(((toplamZikir || 0) / hedefZikir) * 100, 100)}%` }]} />
                    </View>
                </TouchableOpacity>

                {/* HAFTALIK ANALİZ */}
                <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.chartTitle, { color: theme.text }]}>Haftalık Zikir Analizi</Text>
                    <View style={styles.chartContainer}>
                        {weeklyStats.map((stat, index) => (
                            <View key={index} style={styles.chartBarWrapper}>
                                <View style={[styles.chartBarBg, { backgroundColor: isDarkMode ? '#333' : '#F0F0F0' }]}>
                                    <View style={[styles.chartBarFill, { backgroundColor: theme.active, height: `${(stat.value / maxWeeklyValue) * 100}%`, minHeight: stat.value > 0 ? 5 : 0 }]} />
                                </View>
                                <Text style={[styles.chartDayText, { color: theme.subText }]}>{stat.dayName}</Text>
                                <Text style={[styles.chartValueText, { color: theme.active }]}>{stat.value > 999 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* İYİLİK SAYACI */}
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Bugün Bir İyilik Yap ✨</Text>
                <View style={styles.iyilikGrid}>
                    <TouchableOpacity
                        onPress={() => toggleIyilik('gulumseme')}
                        style={[styles.iyilikItem, {
                            backgroundColor: iyilikler.gulumseme ? (isDarkMode ? iyilikColors.gulumseme.darkBg : iyilikColors.gulumseme.bg) : theme.card,
                            borderColor: iyilikler.gulumseme ? iyilikColors.gulumseme.active : theme.border
                        }]}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: iyilikler.gulumseme ? iyilikColors.gulumseme.active : (isDarkMode ? '#333' : '#F8F8F8') }]}>
                            <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color={iyilikler.gulumseme ? '#FFF' : theme.subText} />
                        </View>
                        <Text style={[styles.iyilikText, { color: iyilikler.gulumseme ? (isDarkMode ? '#FFD97D' : '#B28000') : theme.text }]}>Gülümsedim</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => toggleIyilik('hayvanBesleme')}
                        style={[styles.iyilikItem, {
                            backgroundColor: iyilikler.hayvanBesleme ? (isDarkMode ? iyilikColors.hayvan.darkBg : iyilikColors.hayvan.bg) : theme.card,
                            borderColor: iyilikler.hayvanBesleme ? iyilikColors.hayvan.active : theme.border
                        }]}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: iyilikler.hayvanBesleme ? iyilikColors.hayvan.active : (isDarkMode ? '#333' : '#F8F8F8') }]}>
                            <MaterialCommunityIcons name="cat" size={20} color={iyilikler.hayvanBesleme ? '#FFF' : theme.subText} />
                        </View>
                        <Text style={[styles.iyilikText, { color: iyilikler.hayvanBesleme ? (isDarkMode ? '#FFB86C' : '#D47000') : theme.text }]}>Canlı Besledim</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => toggleIyilik('selamlasma')}
                        style={[styles.iyilikItem, {
                            backgroundColor: iyilikler.selamlasma ? (isDarkMode ? iyilikColors.selam.darkBg : iyilikColors.selam.bg) : theme.card,
                            borderColor: iyilikler.selamlasma ? iyilikColors.selam.active : theme.border
                        }]}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: iyilikler.selamlasma ? iyilikColors.selam.active : (isDarkMode ? '#333' : '#F8F8F8') }]}>
                            <MaterialCommunityIcons name="hand-heart-outline" size={20} color={iyilikler.selamlasma ? '#FFF' : theme.subText} />
                        </View>
                        <Text style={[styles.iyilikText, { color: iyilikler.selamlasma ? (isDarkMode ? '#8ECAE6' : '#007EA7') : theme.text }]}>Selam Verdim</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => toggleIyilik('iyilikYapma')}
                        style={[styles.iyilikItem, {
                            backgroundColor: iyilikler.iyilikYapma ? (isDarkMode ? iyilikColors.iyilik.darkBg : iyilikColors.iyilik.bg) : theme.card,
                            borderColor: iyilikler.iyilikYapma ? iyilikColors.iyilik.active : theme.border
                        }]}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: iyilikler.iyilikYapma ? iyilikColors.iyilik.active : (isDarkMode ? '#333' : '#F8F8F8') }]}>
                            <MaterialCommunityIcons name="star-outline" size={20} color={iyilikler.iyilikYapma ? '#FFF' : theme.subText} />
                        </View>
                        <Text style={[styles.iyilikText, { color: iyilikler.iyilikYapma ? (isDarkMode ? '#C7CAFF' : '#5A61C5') : theme.text }]}>İyilik Yaptım</Text>
                    </TouchableOpacity>
                </View>

                {/* GÜNÜN DUASI */}
                <View style={[styles.mainCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="star-face" size={24} color={theme.active} />
                        <Text style={[styles.cardTag, { color: theme.active }]}>GÜNÜN DUASI</Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{gununDuasi.turkce}</Text>
                    {/* HATA ÇÖZÜMÜ: Tırnak işaretleri escaped yapıldı */}
                    <Text style={[styles.cardDesc, { color: theme.subText }]}>&quot;{gununDuasi.anlam}&quot;</Text>
                </View>

                {/* HIZLI ARAÇLAR */}
                <View style={styles.quickToolsContainer}>
                    <TouchableOpacity style={[styles.toolItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Zikirmatik')}>
                        <View style={[styles.toolIcon, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}><MaterialCommunityIcons name="hands-pray" size={26} color={theme.active} /></View>
                        <Text style={[styles.toolText, { color: theme.text }]}>Zikirmatik</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toolItem, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Dualar')}>
                        <View style={[styles.toolIcon, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}><MaterialCommunityIcons name="book-open-page-variant" size={26} color={theme.active} /></View>
                        <Text style={[styles.toolText, { color: theme.text }]}>Dualar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toolItem, { backgroundColor: theme.card }]} onPress={handleKiblePress}>
                        <View style={[styles.toolIcon, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}><MaterialCommunityIcons name="compass-outline" size={26} color={theme.active} /></View>
                        <Text style={[styles.toolText, { color: theme.text }]}>Kıble</Text>
                    </TouchableOpacity>
                </View>

                {/* ESMA-ÜL HÜSNA */}
                <View style={[styles.esmaCard, { backgroundColor: isDarkMode ? theme.card : '#1B4332' }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.esmaLabel}>Günün Esma-ül Hüsnası</Text>
                        <Text style={styles.esmaName}>{gununEsmasi.isim}</Text>
                        <Text style={styles.esmaMeaning}>{gununEsmasi.anlam}</Text>
                    </View>
                </View>

                {/* REKLAM ALANI */}
                <View style={[styles.adContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.adBadge}><Text style={styles.adBadgeText}>SPONSOR</Text></View>
                    <MaterialCommunityIcons name="advertisements" size={20} color={theme.subText} style={{ marginBottom: 5 }} />
                    <Text style={{ color: theme.subText, fontSize: 12, fontWeight: '600' }}>Reklam Alanı</Text>
                </View>

                {/* GÜNÜN SÜNNETİ */}
                <View style={[styles.sunnetBox, { backgroundColor: theme.card, borderLeftColor: theme.active }]}>
                    <Text style={[styles.sunnetLabel, { color: theme.active }]}>Günün Sünneti</Text>
                    {/* HATA ÇÖZÜMÜ: Tırnak işaretleri escaped yapıldı */}
                    <Text style={[styles.sunnetText, { color: theme.text }]}>&quot;{gununSunneti.metin}&quot; ({gununSunneti.kaynak})</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    topInfoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10 },
    hicriDate: { fontSize: 18, fontWeight: '900' },
    miladiDate: { fontSize: 13, fontWeight: '600' },
    themeToggleNew: {
        width: 54,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        justifyContent: 'center',
        padding: 2,
    },
    themeToggleInner: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    daysBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 15 },
    daysLabel: { fontSize: 11, fontWeight: '800' },
    progressCard: { padding: 20, borderRadius: 25, borderWidth: 1, marginBottom: 15 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    progressSubtitle: { fontSize: 10, fontWeight: '800' },
    progressTitle: { fontSize: 24, fontWeight: '900' },
    progressIconBox: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    progressBarBg: { height: 10, width: '100%', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 5 },
    chartCard: { padding: 15, borderRadius: 25, borderWidth: 1, marginBottom: 15 },
    chartTitle: { fontSize: 12, fontWeight: '800', marginBottom: 15, textAlign: 'center', opacity: 0.6 },
    chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80 },
    chartBarWrapper: { alignItems: 'center', flex: 1 },
    chartBarBg: { width: 8, height: 60, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
    chartBarFill: { width: '100%', borderRadius: 4 },
    chartDayText: { fontSize: 8, fontWeight: 'bold', marginTop: 6 },
    chartValueText: { fontSize: 9, fontWeight: 'bold', marginTop: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 12, marginTop: 5 },
    iyilikGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    iyilikItem: {
        width: (width - 50) / 2,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    iyilikText: { fontSize: 11, fontWeight: '900' },
    adContainer: { width: '100%', height: 70, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', marginBottom: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    adBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 2, borderBottomLeftRadius: 10 },
    adBadgeText: { fontSize: 7, fontWeight: 'bold', color: '#6C757D' },
    mainCard: { padding: 20, borderRadius: 25, borderWidth: 1, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTag: { fontSize: 11, fontWeight: '900' },
    cardTitle: { fontSize: 19, fontWeight: '800', marginBottom: 10 },
    cardDesc: { fontSize: 15, fontStyle: 'italic' },
    quickToolsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
    toolItem: { flex: 1, paddingVertical: 15, borderRadius: 20, alignItems: 'center' },
    toolIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    toolText: { fontSize: 12, fontWeight: '800' },
    esmaCard: { padding: 22, borderRadius: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    esmaLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
    esmaName: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    esmaMeaning: { color: '#FFF', fontSize: 14, opacity: 0.9 },
    sunnetBox: { padding: 20, borderRadius: 20, borderLeftWidth: 5, marginBottom: 25 },
    sunnetLabel: { fontSize: 12, fontWeight: '900', marginBottom: 8 },
    sunnetText: { fontSize: 15, fontWeight: '500' },
});