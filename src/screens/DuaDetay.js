import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    StatusBar as RNStatusBar,

    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
const { width } = Dimensions.get('window');

const AUDIO_MAP = {
    "fatiha": require('../../assets/sounds/sureler/fatiha.mp3'),
    "fil": require('../../assets/sounds/sureler/fil.mp3'),
    "kureys": require('../../assets/sounds/sureler/kureys.mp3'),
    "maun": require('../../assets/sounds/sureler/maun.mp3'),
    "kevser": require('../../assets/sounds/sureler/kevser.mp3'),
    "kafirun": require('../../assets/sounds/sureler/kafirun.mp3'),
    "nasr": require('../../assets/sounds/sureler/nasr.mp3'),
    "tebbet": require('../../assets/sounds/sureler/tebbet.mp3'),
    "ihlas": require('../../assets/sounds/sureler/ihlas.mp3'),
    "felak": require('../../assets/sounds/sureler/felak.mp3'),
    "nas": require('../../assets/sounds/sureler/nas.mp3'),
    "subhaneke": require('../../assets/sounds/sureler/subhaneke.mp3'),
    "ettehiyyatu": require('../../assets/sounds/sureler/ettehiyyatu.mp3'),
    "rabbena-atina": require('../../assets/sounds/sureler/rabbena-atina.mp3'),
    "rabbenagfirli": require('../../assets/sounds/sureler/rabbenagfirli.mp3'),
    "salli-barik": require('../../assets/sounds/sureler/salli-barik.mp3'),
};

const CIRCLE_SIZE = 40;
const STROKE_WIDTH = 3;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DuaDetay({ route, navigation }) {
    const { prayer } = route.params;
    const [duaSayac, setDuaSayac] = useState(0);
    const { theme, isDarkMode } = useTheme();

    const soundFile = prayer.audio ? AUDIO_MAP[prayer.audio] : null;
    const player = useAudioPlayer(soundFile);
    const status = useAudioPlayerStatus(player);

    const progress = (status?.duration > 0) ? (status.currentTime / status.duration) : 0;
    const strokeDashoffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
            cardStyle: { backgroundColor: theme.bg }
        });
    }, [navigation, theme]);

    useEffect(() => {
        const loadCounter = async () => {
            try {
                const savedValue = await AsyncStorage.getItem(`sayac_${prayer.id}`);
                if (savedValue !== null) setDuaSayac(parseInt(savedValue));
            } catch (e) { console.log(e); }
        };
        loadCounter();
    }, [prayer.id]);

    const handleIncrement = async () => {
        const yeniDeger = duaSayac + 1;
        setDuaSayac(yeniDeger);
        try {
            await AsyncStorage.setItem(`sayac_${prayer.id}`, yeniDeger.toString());
            const mevcutToplam = await AsyncStorage.getItem('toplamZikir');
            const yeniToplam = (parseInt(mevcutToplam) || 0) + 1;
            await AsyncStorage.setItem('toplamZikir', yeniToplam.toString());
        } catch (e) { console.log(e); }
    };

    const handleReset = async () => {
        setDuaSayac(0);
        try { await AsyncStorage.setItem(`sayac_${prayer.id}`, "0"); } catch (e) { console.log(e); }
    };

    const togglePlayback = () => {
        if (!player || !soundFile) return;
        if (status.playing) {
            player.pause();
        } else {
            if (status.currentTime >= status.duration) player.seekTo(0);
            player.play();
        }
    };

    const restartAudio = () => {
        if (!player || !soundFile) return;
        player.seekTo(0);
        player.play();
    };

    const onShare = async () => {
        try {
            await Share.share({
                message: `${prayer.title}\n\n${prayer.arabic}\n\nAnlamı: ${prayer.meaning}`,
            });
        } catch (error) { console.log(error); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
                <RNStatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? "light-content" : "dark-content"} />

                <SafeAreaView style={styles.safeArea}>
                    <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarBtn}>
                            <MaterialCommunityIcons name="arrow-left" size={28} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.topBarTitle, { color: theme.text }]} numberOfLines={1}>
                            {prayer.title}
                        </Text>
                        <TouchableOpacity onPress={onShare} style={styles.topBarBtn}>
                            <MaterialCommunityIcons name="share-variant" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.contentInner}>

                            {soundFile && (
                                <View style={[styles.compactAudioBar, { backgroundColor: isDarkMode ? theme.card : '#F4F9F6', borderColor: theme.border }]}>
                                    <TouchableOpacity activeOpacity={0.7} onPress={togglePlayback} style={styles.miniPlayBtn}>
                                        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svgLayer}>
                                            <Circle
                                                cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                                                stroke={isDarkMode ? "#333" : "#E0E9E4"} strokeWidth={STROKE_WIDTH} fill="transparent"
                                            />
                                            <Circle
                                                cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                                                stroke={theme.active} strokeWidth={STROKE_WIDTH} fill="transparent"
                                                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round" rotation="-90" origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                                            />
                                        </Svg>
                                        <MaterialCommunityIcons
                                            name={status.playing ? "pause" : "play"}
                                            size={20} color={theme.active}
                                        />
                                    </TouchableOpacity>

                                    <View style={styles.audioInfo}>
                                        <Text style={[styles.audioLabel, { color: theme.text }]}>Sesli Okunuşu</Text>
                                    </View>

                                    <TouchableOpacity onPress={restartAudio} style={styles.replayBtn}>
                                        <MaterialCommunityIcons name="replay" size={22} color={theme.subText} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={[styles.arabicCard, { backgroundColor: isDarkMode ? theme.card : '#F1F8F5', borderColor: isDarkMode ? theme.border : '#E2EFE9' }]}>
                                <Text style={[styles.arabicText, { color: isDarkMode ? '#FFF' : '#1B4332' }]}>{prayer.arabic}</Text>
                            </View>

                            <View style={[styles.adContainer, { backgroundColor: isDarkMode ? theme.card : '#F1F8F5', borderColor: isDarkMode ? theme.border : '#E2EFE9' }]}>
                                <Text style={{ color: theme.subText, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>REKLAM ALANI</Text>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="translate" size={20} color={theme.active} />
                                    <Text style={[styles.sectionTitle, { color: theme.active }]}>TÜRKÇE OKUNUŞU</Text>
                                </View>
                                <Text style={[styles.readingText, { color: theme.text }]}>{prayer.pronunciation}</Text>
                            </View>

                            <View style={[styles.section, styles.meaningBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={styles.sectionHeader}>
                                    <MaterialCommunityIcons name="book-open-page-variant" size={20} color="#3A86FF" />
                                    <Text style={[styles.sectionTitle, { color: '#3A86FF' }]}>MEAL / ANLAM</Text>
                                </View>
                                <Text style={[styles.meaningText, { color: theme.text }]}>{prayer.meaning}</Text>
                            </View>

                            <View style={{ height: 180 }} />
                        </View>
                    </ScrollView>
                </SafeAreaView>

                <View style={[styles.footerCounter, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: Platform.OS === 'ios' ? 35 : 15, height: Platform.OS === 'ios' ? 120 : 100 }]}>
                    <View style={styles.counterInfo}>
                        <Text style={[styles.counterLabel, { color: theme.subText }]}>TOPLAM OKUMA</Text>
                        <Text style={[styles.counterValue, { color: theme.active }]}>{duaSayac}</Text>
                    </View>
                    <View style={styles.actionContainer}>
                        <TouchableOpacity activeOpacity={0.7} onPress={handleIncrement} style={[styles.readButton, { backgroundColor: theme.active }]}>
                            <MaterialCommunityIcons name="gesture-tap" size={26} color="white" />
                            <Text style={styles.readButtonText}>SAY</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                            <MaterialCommunityIcons name="refresh" size={22} color="#FF4D4D" />
                            <Text style={styles.resetBtnText}>SIFIRLA</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1 },
    safeArea: { flex: 1 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 10, paddingBottom: 15, borderBottomWidth: 0.5 },
    topBarTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    topBarBtn: { padding: 8, width: 45 },
    scrollContent: { flexGrow: 1 },
    contentInner: { paddingHorizontal: 20, paddingTop: 10 },
    compactAudioBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 20, marginTop: 5 },
    miniPlayBtn: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: 'center', alignItems: 'center' },
    svgLayer: { position: 'absolute' },
    audioInfo: { flex: 1, marginLeft: 12 },
    audioLabel: { fontSize: 14, fontWeight: '700' },
    replayBtn: { padding: 8, marginLeft: 5 },
    arabicCard: { padding: 25, borderRadius: 25, borderWidth: 1, marginBottom: 20 },
    adContainer: { width: '100%', height: 55, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    arabicText: { fontSize: width > 400 ? 28 : 24, textAlign: 'center', lineHeight: 50, fontFamily: Platform.OS === 'ios' ? 'Amiri' : 'serif' },
    section: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    readingText: { fontSize: 16, lineHeight: 24, fontWeight: '600', fontStyle: 'italic' },
    meaningBox: { padding: 20, borderRadius: 20, borderWidth: 1 },
    meaningText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
    footerCounter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, zIndex: 1000 },
    counterInfo: { flex: 0.7 },
    counterLabel: { fontSize: 9, fontWeight: '800' },
    counterValue: { fontSize: 30, fontWeight: '900' },
    actionContainer: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
    readButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, gap: 6 },
    readButtonText: { color: 'white', fontSize: 16, fontWeight: '900' },
    resetBtn: { marginLeft: 15, alignItems: 'center' },
    resetBtnText: { color: '#FF4D4D', fontSize: 9, fontWeight: '800' }
});