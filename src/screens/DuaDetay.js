import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Hafıza için eklendi
import { useState } from 'react';
import {
    Platform,
    StatusBar as RNStatusBar,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function DuaDetay({ route, navigation }) {
    const { prayer } = route.params;
    const [duaSayac, setDuaSayac] = useState(0);
    const { theme, isDarkMode } = useTheme();

    // SAY butonuna basıldığında hem yerel sayacı hem genel hafızayı artırır
    const handleIncrement = async () => {
        const yeniDeger = duaSayac + 1;
        setDuaSayac(yeniDeger);

        try {
            // Ana sayfadaki o barın dolması için toplam zikri güncelle
            const mevcutToplam = await AsyncStorage.getItem('toplamZikir');
            const yeniToplam = (parseInt(mevcutToplam) || 0) + 1;
            await AsyncStorage.setItem('toplamZikir', yeniToplam.toString());
        } catch (e) {
            console.log("Kayıt hatası:", e);
        }
    };

    // SIFIRLA butonuna basıldığında (Sadece bu duanın sayacını sıfırlar)
    const handleReset = () => {
        setDuaSayac(0);
    };

    // Paylaşma Fonksiyonu
    const onShare = async () => {
        try {
            await Share.share({
                message: `${prayer.title}\n\n${prayer.arabic}\n\nAnlamı: ${prayer.meaning}`,
            });
        } catch (error) {
            console.log(error.message);
        }
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
            {/* ÜST ARAÇ ÇUBUĞU */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={30} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onShare} style={styles.topBarBtn}>
                    <MaterialCommunityIcons name="share-variant" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    {/* Dua Başlığı */}
                    <Text style={[styles.title, { color: theme.active }]}>
                        {prayer.title}
                    </Text>

                    {/* Arapça Bölümü */}
                    <View style={[
                        styles.arabicCard,
                        {
                            backgroundColor: isDarkMode ? theme.card : '#F1F8F5',
                            borderColor: isDarkMode ? theme.border : '#E2EFE9'
                        }
                    ]}>
                        <Text style={[styles.arabicText, { color: isDarkMode ? '#FFF' : '#1B4332' }]}>
                            {prayer.arabic}
                        </Text>
                    </View>

                    {/* Okunuşu Bölümü */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="volume-high" size={18} color={theme.active} />
                            <Text style={[styles.sectionTitle, { color: theme.active }]}>TÜRKÇE OKUNUŞU</Text>
                        </View>
                        <Text style={[styles.readingText, { color: theme.text }]}>
                            {prayer.pronunciation}
                        </Text>
                    </View>

                    {/* Anlamı Bölümü */}
                    <View style={[styles.section, styles.meaningBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="book-open-variant" size={18} color="#3A86FF" />
                            <Text style={[styles.sectionTitle, { color: '#3A86FF' }]}>MEAL / ANLAM</Text>
                        </View>
                        <Text style={[styles.meaningText, { color: theme.text }]}>
                            {prayer.meaning}
                        </Text>
                    </View>

                    {/* Footer Altı Boşluk */}
                    <View style={{ height: 200 }} />
                </View>
            </ScrollView>

            {/* --- SABİT ALT ZİKİRMATİK PANELİ --- */}
            <View style={[
                styles.footerCounter,
                {
                    backgroundColor: theme.card,
                    borderTopColor: isDarkMode ? theme.border : '#E9F5EE',
                    // Alt navigasyon çakışmasını önleyen boşluklar
                    paddingBottom: Platform.OS === 'android' ? 50 : 35,
                    height: Platform.OS === 'android' ? 140 : 120,
                }
            ]}>
                <View style={styles.counterInfo}>
                    <Text style={[styles.counterLabel, { color: theme.subText }]}>BU OKUMA</Text>
                    <Text style={[styles.counterValue, { color: theme.active }]}>{duaSayac}</Text>
                </View>

                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleIncrement}
                        style={[styles.readButton, { backgroundColor: theme.active }]}
                    >
                        <MaterialCommunityIcons name="fingerprint" size={26} color="white" />
                        <Text style={styles.readButtonText}>SAY</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                        <MaterialCommunityIcons name="cached" size={22} color="#FF4D4D" />
                        <Text style={styles.resetBtnText}>SIFIRLA</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10
    },
    topBarBtn: {
        padding: 8,
        borderRadius: 12
    },
    scrollContent: { flexGrow: 1 },
    container: { paddingHorizontal: 20 },
    title: {
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 25,
    },
    arabicCard: {
        padding: 25,
        borderRadius: 30,
        borderWidth: 1,
        marginBottom: 30,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    arabicText: {
        fontSize: 28,
        textAlign: 'center',
        lineHeight: 52,
        fontFamily: Platform.OS === 'ios' ? 'Amiri' : 'serif',
    },
    section: { marginBottom: 25 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        marginLeft: 5
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    readingText: {
        fontSize: 18,
        lineHeight: 28,
        fontWeight: '600',
        paddingHorizontal: 5
    },
    meaningBox: {
        padding: 20,
        borderRadius: 25,
        borderWidth: 1,
    },
    meaningText: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500'
    },
    footerCounter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        elevation: 35,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -5 }
    },
    counterInfo: { flex: 0.8, justifyContent: 'center' },
    counterLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    counterValue: { fontSize: 36, fontWeight: '900', marginTop: -2 },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1.2,
        justifyContent: 'flex-end',
        height: '100%'
    },
    readButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 20,
        gap: 8,
        elevation: 4,
    },
    readButtonText: { color: 'white', fontSize: 18, fontWeight: '900' },
    resetBtn: { marginLeft: 20, alignItems: 'center', justifyContent: 'center' },
    resetBtnText: { color: '#FF4D4D', fontSize: 9, fontWeight: '900', marginTop: 2 }
});