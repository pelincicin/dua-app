import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../AdsConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { ZikirContext } from '../context/ZikirContext';
import data from '../data/data.json';

const { width } = Dimensions.get('window');

const adUnitId = AD_UNIT_IDS.ANASAYFA;

export default function AnaSayfa({ navigation }) {
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const { displayName, saveDisplayName } = useUser();
    const { toplamZikir, hedefZikir, setHedef } = useContext(ZikirContext);
    const [isimModalAcik, setIsimModalAcik] = useState(false);
    const [yeniIsim, setYeniIsim] = useState('');
    const [isimKaydediliyor, setIsimKaydediliyor] = useState(false);

    const isimKaydet = async () => {
        const trimmed = yeniIsim.trim();
        if (!trimmed || trimmed.length < 2) {
            Alert.alert('Hata', 'İsim en az 2 karakter olmalıdır.');
            return;
        }
        setIsimKaydediliyor(true);
        try {
            await saveDisplayName(trimmed);
            setIsimModalAcik(false);
            setYeniIsim('');
        } catch {
            Alert.alert('Hata', 'İsim kaydedilemedi.');
        } finally {
            setIsimKaydediliyor(false);
        }
    };
    const [hedefModalAcik, setHedefModalAcik] = useState(false);
    const [yeniHedef, setYeniHedef] = useState('');

    const hedefKaydet = async () => {
        const sayi = parseInt(yeniHedef.replace(/\D/g, ''));
        if (isNaN(sayi) || sayi < 1) {
            Alert.alert('Hata', 'Geçerli bir hedef girin.');
            return;
        }
        await setHedef(sayi);
        setHedefModalAcik(false);
        setYeniHedef('');
    };

    const zikirPaylas = async () => {
        const yuzde = Math.min(Math.round((toplamZikir / hedefZikir) * 100), 100);
        const mesaj = `Bugün ${toplamZikir.toLocaleString('tr-TR')} zikir çektim! 🤲\nGünlük hedefimin %${yuzde}'ini tamamladım.\n\nHuzur: Zikirmatik & Dualar 🌿`;
        try {
            await Share.share({ message: mesaj });
        } catch (e) {
            console.log('Paylaşma hatası:', e);
        }
    };

    const [weeklyStats, setWeeklyStats] = useState([]);
    const [iyilikler, setIyilikler] = useState({
        gulumseme: false,
        hayvanBesleme: false,
        selamlasma: false,
        iyilikYapma: false
    });

    const isFocused = useIsFocused();

    const now = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => now.toLocaleDateString('tr-TR'), [now]);

    const slideAnim = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isDarkMode ? 1 : 0,
            duration: 250,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
        }).start();
    }, [isDarkMode, slideAnim]);

    const translateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 24]
    });

    const { gununDuasi, gununSunneti, gununEsmasi, hicriTarih, selamlama } = useMemo(() => {
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayIdx = Math.floor(diff / oneDay);

        const d = data.dualar[dayIdx % data.dualar.length] || { turkce: '...', anlam: '...' };

        // sunnetler dizisinde iki farklı yapı var: {metin, kaynak} ve {sünnet}
        const rawS = data.sunnetler[dayIdx % data.sunnetler.length];
        const s = rawS
            ? { metin: rawS.metin || rawS['sünnet'] || '...', kaynak: rawS.kaynak || '' }
            : { metin: '...', kaynak: '' };

        const e = data.esmalar[dayIdx % data.esmalar.length] || { isim: '...', anlam: '...' };

        const saat = now.getHours();
        const sel =
            saat >= 5 && saat < 11 ? 'Hayırlı Sabahlar' :
            saat >= 11 && saat < 17 ? 'Hayırlı Günler' :
            saat >= 17 && saat < 21 ? 'Hayırlı Akşamlar' :
            'Hayırlı Geceler';

        const hicri = new Intl.DateTimeFormat('tr-u-ca-islamic-uma-nu-latn', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(now);

        return { gununDuasi: d, gununSunneti: s, gununEsmasi: e, hicriTarih: hicri, selamlama: sel };
    }, [now]);

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
        } catch (e) { console.log('Haftalık veri çekme hatası:', e); }
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
    }, [isFocused, fetchWeeklyData, loadIyilikler]);

    const toggleIyilik = async (key) => {
        const yeniIyilikler = { ...iyilikler, [key]: !iyilikler[key] };
        setIyilikler(yeniIyilikler);
        try {
            await AsyncStorage.setItem(`@iyilik_${todayStr}`, JSON.stringify(yeniIyilikler));
        } catch (e) { console.log(e); }
    };

    const yaklasanDiniGun = useMemo(() => {
        const diniGunler = [
            { isim: 'Miraç Kandili', tarih: new Date('2026-01-15') },
            { isim: 'Berat Kandili', tarih: new Date('2026-02-02') },
            { isim: 'Ramazan Başlangıcı', tarih: new Date('2026-02-19') },
            { isim: 'Kadir Gecesi', tarih: new Date('2026-03-16') },
            { isim: 'Ramazan Bayramı', tarih: new Date('2026-03-20') },
            { isim: 'Kurban Bayramı', tarih: new Date('2026-05-27') },
            { isim: 'Miraç Kandili', tarih: new Date('2027-01-05') },
            { isim: 'Berat Kandili', tarih: new Date('2027-01-22') },
            { isim: 'Ramazan Başlangıcı', tarih: new Date('2027-02-09') },
            { isim: 'Kadir Gecesi', tarih: new Date('2027-03-05') },
            { isim: 'Ramazan Bayramı', tarih: new Date('2027-03-10') },
            { isim: 'Kurban Bayramı', tarih: new Date('2027-05-17') },
        ];
        const bugunSifir = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const gelecekGun = diniGunler
            .filter(gun => gun.tarih >= bugunSifir)
            .sort((a, b) => a.tarih - b.tarih)[0];
        if (!gelecekGun) return { isim: 'Mübarek Gün', kalan: "2027'de" };
        const gunSayisi = Math.ceil((gelecekGun.tarih - bugunSifir) / (1000 * 60 * 60 * 24));
        return { isim: gelecekGun.isim, kalan: gunSayisi === 0 ? 'Bugün!' : `${gunSayisi} Gün Kaldı` };
    }, [now]);

    const maxWeeklyValue = Math.max(...weeklyStats.map(s => s.value), 1);
    const tamamlananIyilik = Object.values(iyilikler).filter(Boolean).length;

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
                    <TouchableOpacity onPress={() => { setYeniIsim(displayName || ''); setIsimModalAcik(true); }}>
                        <Text style={[styles.hicriDate, { color: theme.active }]}>{hicriTarih}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={[styles.miladiDate, { color: theme.subText }]}>{selamlama}</Text>
                            {displayName && (
                                <MaterialCommunityIcons name="pencil-outline" size={12} color={theme.subText} />
                            )}
                        </View>
                    </TouchableOpacity>

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
                                    transform: [{ translateX }]
                                }
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={isDarkMode ? 'moon-waning-crescent' : 'weather-sunny'}
                                size={16}
                                color={isDarkMode ? '#A29BFE' : '#FFB703'}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                {/* YAKLAŞAN GÜN BANNER */}
                <View style={[styles.eventBanner, {
                    backgroundColor: isDarkMode ? '#1B4332' : '#2D6A4F',
                }]}>
                    <View style={styles.eventBannerLeft}>
                        <MaterialCommunityIcons name="star-crescent" size={18} color="rgba(255,255,255,0.8)" />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.eventBannerTitle}>{yaklasanDiniGun.isim}</Text>
                            <Text style={styles.eventBannerSub}>Yaklaşan Mübarek Gün</Text>
                        </View>
                    </View>
                    <View style={styles.eventBannerRight}>
                        <Text style={styles.eventBannerKalan}>{yaklasanDiniGun.kalan}</Text>
                    </View>
                </View>

                {/* ZİKİR KARTI */}
                <TouchableOpacity
                    style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Zikirmatik')}
                    activeOpacity={0.9}
                >
                    <View style={styles.progressHeader}>
                        <View>
                            <Text style={[styles.progressSubtitle, { color: theme.subText }]}>BUGÜNKÜ TOPLAM ZİKİR</Text>
                            <Text style={[styles.progressTitle, { color: theme.text }]}>
                                {toplamZikir?.toLocaleString() || 0}{' '}
                                <Text style={{ fontSize: 14, fontWeight: '600' }}>Zikir</Text>
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.progressIconBox, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }]}
                                onPress={zikirPaylas}
                            >
                                <MaterialCommunityIcons name="share-variant" size={22} color={theme.active} />
                            </TouchableOpacity>
                            <View style={[styles.progressIconBox, { backgroundColor: theme.active }]}>
                                <MaterialCommunityIcons name="podium-gold" size={24} color="white" />
                            </View>
                        </View>
                    </View>
                    <View style={styles.progressMeta}>
                        <Text style={[styles.progressPercent, { color: theme.active }]}>
                            {Math.min(Math.round(((toplamZikir || 0) / hedefZikir) * 100), 100)}%
                        </Text>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            onPress={() => { setYeniHedef(hedefZikir.toString()); setHedefModalAcik(true); }}
                        >
                            <Text style={[styles.progressGoal, { color: theme.subText }]}>
                                Hedef: {hedefZikir.toLocaleString()}
                            </Text>
                            <MaterialCommunityIcons name="pencil-outline" size={12} color={theme.subText} />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#333' : '#F0F0F0' }]}>
                        <View style={[
                            styles.progressBarFill,
                            { backgroundColor: theme.active, width: `${Math.min(((toplamZikir || 0) / hedefZikir) * 100, 100)}%` }
                        ]} />
                    </View>
                </TouchableOpacity>

                {/* HAFTALIK ANALİZ */}
                <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.chartTitle, { color: theme.subText }]}>HFT. ZİKİR ANALİZİ</Text>
                    <View style={styles.chartContainer}>
                        {weeklyStats.map((stat, index) => {
                            const isToday = index === 6;
                            return (
                                <View key={index} style={styles.chartBarWrapper}>
                                    <View style={[
                                        styles.chartBarBg,
                                        { backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }
                                    ]}>
                                        <View style={[
                                            styles.chartBarFill,
                                            {
                                                backgroundColor: isToday ? theme.active : (isDarkMode ? '#3A5A4A' : '#A8D5BE'),
                                                height: `${(stat.value / maxWeeklyValue) * 100}%`,
                                                minHeight: stat.value > 0 ? 4 : 0
                                            }
                                        ]} />
                                    </View>
                                    <Text style={[
                                        styles.chartDayText,
                                        { color: isToday ? theme.active : theme.subText, fontWeight: isToday ? '900' : 'bold' }
                                    ]}>{stat.dayName}</Text>
                                    <Text style={[styles.chartValueText, { color: isToday ? theme.active : theme.subText }]}>
                                        {stat.value > 999 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value || ''}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* HIZLI ARAÇLAR */}
                <View style={styles.quickToolsContainer}>
                    <TouchableOpacity
                        style={[styles.toolItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigation.navigate('Zikirmatik')}
                    >
                        <View style={[styles.toolIcon, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}>
                            <MaterialCommunityIcons name="hands-pray" size={26} color={theme.active} />
                        </View>
                        <Text style={[styles.toolText, { color: theme.text }]}>Zikirmatik</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toolItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigation.navigate('Dualar')}
                    >
                        <View style={[styles.toolIcon, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={26} color={theme.active} />
                        </View>
                        <Text style={[styles.toolText, { color: theme.text }]}>Dualar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toolItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigation.navigate('Kible')}
                    >
                        <View style={[styles.toolIcon, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}>
                            <MaterialCommunityIcons name="compass-rose" size={26} color={theme.active} />
                        </View>
                        <Text style={[styles.toolText, { color: theme.text }]}>Kıble</Text>
                    </TouchableOpacity>
                </View>

                {/* İYİLİK SAYACI */}
                <View style={[styles.iyilikSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.iyilikSectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Bugün Bir İyilik Yap</Text>
                        <View style={[styles.iyilikBadge, { backgroundColor: tamamlananIyilik === 4 ? theme.active : (isDarkMode ? '#333' : '#F0F0F0') }]}>
                            <Text style={[styles.iyilikBadgeText, { color: tamamlananIyilik === 4 ? '#FFF' : theme.subText }]}>
                                {tamamlananIyilik}/4
                            </Text>
                        </View>
                    </View>
                    <View style={styles.iyilikGrid}>
                        <TouchableOpacity
                            onPress={() => toggleIyilik('gulumseme')}
                            style={[styles.iyilikItem, {
                                backgroundColor: iyilikler.gulumseme
                                    ? (isDarkMode ? iyilikColors.gulumseme.darkBg : iyilikColors.gulumseme.bg)
                                    : (isDarkMode ? '#2A2A2A' : '#FAFAFA'),
                                borderColor: iyilikler.gulumseme ? iyilikColors.gulumseme.active : theme.border
                            }]}
                        >
                            <View style={[styles.iconCircle, {
                                backgroundColor: iyilikler.gulumseme ? iyilikColors.gulumseme.active : (isDarkMode ? '#333' : '#F0F0F0')
                            }]}>
                                <MaterialCommunityIcons name="emoticon-happy-outline" size={20}
                                    color={iyilikler.gulumseme ? '#FFF' : theme.subText} />
                            </View>
                            <Text style={[styles.iyilikText, {
                                color: iyilikler.gulumseme
                                    ? (isDarkMode ? '#FFD97D' : '#B28000')
                                    : theme.text
                            }]}>Gülümsedim</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => toggleIyilik('hayvanBesleme')}
                            style={[styles.iyilikItem, {
                                backgroundColor: iyilikler.hayvanBesleme
                                    ? (isDarkMode ? iyilikColors.hayvan.darkBg : iyilikColors.hayvan.bg)
                                    : (isDarkMode ? '#2A2A2A' : '#FAFAFA'),
                                borderColor: iyilikler.hayvanBesleme ? iyilikColors.hayvan.active : theme.border
                            }]}
                        >
                            <View style={[styles.iconCircle, {
                                backgroundColor: iyilikler.hayvanBesleme ? iyilikColors.hayvan.active : (isDarkMode ? '#333' : '#F0F0F0')
                            }]}>
                                <MaterialCommunityIcons name="cat" size={20}
                                    color={iyilikler.hayvanBesleme ? '#FFF' : theme.subText} />
                            </View>
                            <Text style={[styles.iyilikText, {
                                color: iyilikler.hayvanBesleme
                                    ? (isDarkMode ? '#FFB86C' : '#D47000')
                                    : theme.text
                            }]}>Canlı Besledim</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => toggleIyilik('selamlasma')}
                            style={[styles.iyilikItem, {
                                backgroundColor: iyilikler.selamlasma
                                    ? (isDarkMode ? iyilikColors.selam.darkBg : iyilikColors.selam.bg)
                                    : (isDarkMode ? '#2A2A2A' : '#FAFAFA'),
                                borderColor: iyilikler.selamlasma ? iyilikColors.selam.active : theme.border
                            }]}
                        >
                            <View style={[styles.iconCircle, {
                                backgroundColor: iyilikler.selamlasma ? iyilikColors.selam.active : (isDarkMode ? '#333' : '#F0F0F0')
                            }]}>
                                <MaterialCommunityIcons name="hand-heart-outline" size={20}
                                    color={iyilikler.selamlasma ? '#FFF' : theme.subText} />
                            </View>
                            <Text style={[styles.iyilikText, {
                                color: iyilikler.selamlasma
                                    ? (isDarkMode ? '#8ECAE6' : '#007EA7')
                                    : theme.text
                            }]}>Selam Verdim</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => toggleIyilik('iyilikYapma')}
                            style={[styles.iyilikItem, {
                                backgroundColor: iyilikler.iyilikYapma
                                    ? (isDarkMode ? iyilikColors.iyilik.darkBg : iyilikColors.iyilik.bg)
                                    : (isDarkMode ? '#2A2A2A' : '#FAFAFA'),
                                borderColor: iyilikler.iyilikYapma ? iyilikColors.iyilik.active : theme.border
                            }]}
                        >
                            <View style={[styles.iconCircle, {
                                backgroundColor: iyilikler.iyilikYapma ? iyilikColors.iyilik.active : (isDarkMode ? '#333' : '#F0F0F0')
                            }]}>
                                <MaterialCommunityIcons name="star-outline" size={20}
                                    color={iyilikler.iyilikYapma ? '#FFF' : theme.subText} />
                            </View>
                            <Text style={[styles.iyilikText, {
                                color: iyilikler.iyilikYapma
                                    ? (isDarkMode ? '#C7CAFF' : '#5A61C5')
                                    : theme.text
                            }]}>İyilik Yaptım</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* GÜNÜN DUASI */}
                <View style={[styles.mainCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardTagPill, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}>
                            <MaterialCommunityIcons name="star-face" size={14} color={theme.active} />
                            <Text style={[styles.cardTag, { color: theme.active }]}>GÜNÜN DUASI</Text>
                        </View>
                    </View>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{gununDuasi.turkce}</Text>
                    <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />
                    <Text style={[styles.cardDesc, { color: theme.subText }]}>{gununDuasi.anlam}</Text>
                </View>

                {/* ESMA-ÜL HÜSNA */}
                <View style={[styles.esmaCard, { backgroundColor: isDarkMode ? '#1B3A2D' : '#2D6A4F' }]}>
                    <View style={styles.esmaLeft}>
                        <Text style={styles.esmaLabel}>GÜNÜN ESMA-ÜL HÜSNASI</Text>
                        <Text style={styles.esmaName}>{gununEsmasi.isim}</Text>
                        <Text style={styles.esmaMeaning}>{gununEsmasi.anlam}</Text>
                    </View>
                    <View style={styles.esmaRight}>
                        <MaterialCommunityIcons name="star-four-points" size={40} color="rgba(255,255,255,0.15)" />
                    </View>
                </View>

                {/* REKLAM */}
                <View style={styles.adWrapper}>
                    <BannerAd
                        unitId={adUnitId}
                        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    />
                </View>

                {/* GÜNÜN SÜNNETİ */}
                <View style={[styles.sunnetBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.sunnetHeader}>
                        <View style={[styles.sunnetAccent, { backgroundColor: theme.active }]} />
                        <Text style={[styles.sunnetLabel, { color: theme.active }]}>Günün Sünneti</Text>
                    </View>
                    <Text style={[styles.sunnetText, { color: theme.text }]}>
                        &quot;{gununSunneti.metin}&quot;
                        {gununSunneti.kaynak ? (
                            <Text style={[styles.sunnetKaynak, { color: theme.subText }]}>
                                {' '}({gununSunneti.kaynak})
                            </Text>
                        ) : null}
                    </Text>
                </View>

                {/* TASARIMCI İMZASI */}
                <View style={styles.footerSignature}>
                    <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
                    <Text style={[styles.footerLabel, { color: theme.subText }]}>Tasarım & Geliştirme</Text>
                    <Text style={[styles.footerName, { color: theme.text }]}>PELİN ÇİÇİN</Text>
                    <View style={[styles.footerLine, { backgroundColor: theme.border }]} />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* KULLANICI ADI DEĞİŞTİR MODAL */}
            <Modal
                visible={isimModalAcik}
                transparent
                animationType="slide"
                onRequestClose={() => setIsimModalAcik(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Kullanıcı Adı</Text>
                            <TouchableOpacity onPress={() => setIsimModalAcik(false)}>
                                <MaterialCommunityIcons name="close" size={28} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSub, { color: theme.subText }]}>
                            Arkadaşlarınızın sizi tanıyacağı ad
                        </Text>
                        <TextInput
                            style={[styles.modalInput, {
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5',
                                color: theme.text, borderColor: theme.border
                            }]}
                            value={yeniIsim}
                            onChangeText={setYeniIsim}
                            placeholder="Adınız"
                            placeholderTextColor={theme.subText}
                            maxLength={30}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={isimKaydet}
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: theme.active }]}
                            onPress={isimKaydet}
                            disabled={isimKaydediliyor}
                        >
                            <Text style={styles.modalBtnText}>
                                {isimKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* GÜNLÜK HEDEF MODAL */}
            <Modal
                visible={hedefModalAcik}
                transparent
                animationType="slide"
                onRequestClose={() => setHedefModalAcik(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Günlük Hedef</Text>
                            <TouchableOpacity onPress={() => setHedefModalAcik(false)}>
                                <MaterialCommunityIcons name="close" size={28} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSub, { color: theme.subText }]}>
                            Bugün kaç zikir çekmek istiyorsunuz?
                        </Text>
                        <TextInput
                            style={[styles.modalInput, {
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5',
                                color: theme.text, borderColor: theme.border
                            }]}
                            value={yeniHedef}
                            onChangeText={setYeniHedef}
                            placeholder="örn. 1200"
                            placeholderTextColor={theme.subText}
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={hedefKaydet}
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: theme.active }]}
                            onPress={hedefKaydet}
                        >
                            <Text style={styles.modalBtnText}>Kaydet</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scrollContent: { paddingHorizontal: 18 },

    // Üst Bar
    topInfoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        marginTop: 10
    },
    hicriDate: { fontSize: 17, fontWeight: '900' },
    miladiDate: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    themeToggleNew: {
        width: 54, height: 30, borderRadius: 15,
        borderWidth: 1, justifyContent: 'center', padding: 2
    },
    themeToggleInner: {
        width: 24, height: 24, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', elevation: 2
    },

    // Yaklaşan Gün Banner
    eventBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 14,
    },
    eventBannerLeft: { flexDirection: 'row', alignItems: 'center' },
    eventBannerTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    eventBannerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', marginTop: 1 },
    eventBannerRight: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10
    },
    eventBannerKalan: { color: '#FFF', fontSize: 12, fontWeight: '900' },

    // Zikir Kartı
    progressCard: {
        padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 14,
        elevation: 3, shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 8
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    progressSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    progressTitle: { fontSize: 26, fontWeight: '900', marginTop: 2 },
    progressIconBox: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressPercent: { fontSize: 12, fontWeight: '900' },
    progressGoal: { fontSize: 11, fontWeight: '600' },
    progressBarBg: { height: 8, width: '100%', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },

    // Haftalık Chart
    chartCard: {
        padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 14,
        elevation: 2
    },
    chartTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 14, textAlign: 'center' },
    chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 90 },
    chartBarWrapper: { alignItems: 'center', flex: 1 },
    chartBarBg: { width: 10, height: 65, borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
    chartBarFill: { width: '100%', borderRadius: 5 },
    chartDayText: { fontSize: 8, marginTop: 6 },
    chartValueText: { fontSize: 8, marginTop: 2, fontWeight: '700' },

    // Hızlı Araçlar
    quickToolsContainer: { flexDirection: 'row', marginBottom: 14, gap: 10 },
    toolItem: {
        flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center',
        borderWidth: 1, elevation: 2
    },
    toolIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    toolText: { fontSize: 11, fontWeight: '800' },

    // İyilik Sayacı
    iyilikSection: {
        borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 14,
        elevation: 2
    },
    iyilikSectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14
    },
    sectionTitle: { fontSize: 15, fontWeight: '900' },
    iyilikBadge: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10
    },
    iyilikBadgeText: { fontSize: 12, fontWeight: '900' },
    iyilikGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iyilikItem: {
        width: (width - 80) / 2,
        paddingVertical: 12, paddingHorizontal: 12,
        borderRadius: 18, borderWidth: 1.5,
        alignItems: 'center', flexDirection: 'row', gap: 10
    },
    iconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    iyilikText: { fontSize: 11, fontWeight: '800', flex: 1 },

    // Günün Duası
    mainCard: {
        padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 14,
        elevation: 2
    },
    cardHeader: { marginBottom: 14 },
    cardTagPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10
    },
    cardTag: { fontSize: 11, fontWeight: '900' },
    cardTitle: { fontSize: 18, fontWeight: '800', lineHeight: 26, marginBottom: 12 },
    cardDivider: { height: 1, marginBottom: 12, opacity: 0.4 },
    cardDesc: { fontSize: 14, fontStyle: 'italic', lineHeight: 22 },

    // Esma Kartı
    esmaCard: {
        padding: 22, borderRadius: 24, flexDirection: 'row',
        alignItems: 'center', marginBottom: 14, overflow: 'hidden'
    },
    esmaLeft: { flex: 1 },
    esmaRight: { marginLeft: 10 },
    esmaLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
    esmaName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 4 },
    esmaMeaning: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 19 },

    // Reklam
    adWrapper: { width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 10, minHeight: 60 },

    // Günün Sünneti
    sunnetBox: {
        padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 25,
        elevation: 2
    },
    sunnetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    sunnetAccent: { width: 4, height: 16, borderRadius: 2 },
    sunnetLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    sunnetText: { fontSize: 14, fontWeight: '500', lineHeight: 22 },
    sunnetKaynak: { fontSize: 13, fontStyle: 'italic' },

    // Footer
    footerSignature: { alignItems: 'center', marginTop: 10, marginBottom: 10, width: '100%' },
    footerLine: { width: width * 0.4, height: 1, marginVertical: 8, opacity: 0.2 },
    footerLabel: { fontSize: 9, fontWeight: '500', letterSpacing: 1, marginBottom: 2, opacity: 0.7 },
    footerName: { fontSize: 14, fontWeight: '800', letterSpacing: 3 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSub: { fontSize: 13, marginBottom: 16 },
    modalInput: {
        height: 54, borderRadius: 14, borderWidth: 1.5,
        paddingHorizontal: 16, fontSize: 18, fontWeight: '700', marginBottom: 16,
    },
    modalBtn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
