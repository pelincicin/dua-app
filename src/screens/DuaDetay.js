import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function DuaDetay({ route, navigation }) {
    const { prayer } = route.params;
    const [duaSayac, setDuaSayac] = useState(0);
    const { theme, isDarkMode } = useTheme();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                        <Text style={[styles.sectionTitle, { color: theme.active }]}>OKUNUŞU</Text>
                        <Text style={[styles.readingText, { color: theme.text }]}>
                            {prayer.reading}
                        </Text>
                    </View>

                    {/* Anlamı Bölümü */}
                    <View style={[styles.section, styles.meaningBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.sectionTitle, { color: '#3A86FF' }]}>ANLAMI</Text>
                        <Text style={[styles.meaningText, { color: theme.text }]}>
                            {prayer.meaning}
                        </Text>
                    </View>

                    {/* Alt sayacın üstüne binmemesi için boşluk */}
                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* --- SABİT ALT ZİKİRMATİK --- */}
            <View style={[
                styles.footerCounter,
                {
                    backgroundColor: theme.card,
                    borderTopColor: isDarkMode ? theme.border : '#FFEEDD',
                    shadowColor: '#000'
                }
            ]}>
                <View style={styles.counterInfo}>
                    <Text style={[styles.counterLabel, { color: isDarkMode ? theme.subText : '#844D11' }]}>OKUMA ADEDİ</Text>
                    <Text style={[styles.counterValue, { color: isDarkMode ? '#FF9F1C' : '#E67E22' }]}>{duaSayac}</Text>
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setDuaSayac(duaSayac + 1)}
                    style={[styles.readButton, { backgroundColor: isDarkMode ? theme.active : '#E67E22' }]}
                >
                    <MaterialCommunityIcons name="check-decagram" size={24} color="white" />
                    <Text style={styles.readButtonText}>OKUDUM</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setDuaSayac(0)} style={styles.resetBtn}>
                    <MaterialCommunityIcons name="refresh" size={20} color="#FF4D4D" />
                    <Text style={styles.resetBtnText}>SIFIRLA</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    container: { padding: 20 },
    title: {
        fontSize: 26,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 25,
        marginTop: 10
    },
    arabicCard: {
        padding: 25,
        borderRadius: 35,
        borderWidth: 2,
        marginBottom: 30,
        elevation: 2
    },
    arabicText: {
        fontSize: 38,
        textAlign: 'right',
        lineHeight: 60,
        fontFamily: Platform.OS === 'ios' ? 'Traditional Arabic' : 'serif'
    },
    section: { marginBottom: 25 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 10,
        marginLeft: 5
    },
    readingText: {
        fontSize: 20,
        lineHeight: 32,
        fontWeight: '600',
        fontStyle: 'italic',
        paddingHorizontal: 5
    },
    meaningBox: {
        padding: 20,
        borderRadius: 25,
        borderWidth: 1
    },
    meaningText: {
        fontSize: 18,
        lineHeight: 28,
        fontWeight: '500'
    },
    footerCounter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 15,
        paddingBottom: Platform.OS === 'ios' ? 35 : 15,
        paddingHorizontal: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        elevation: 20,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -5 }
    },
    counterInfo: { flex: 1 },
    counterLabel: { fontSize: 10, fontWeight: '800' },
    counterValue: { fontSize: 36, fontWeight: '900', marginTop: -5 },
    readButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 20,
        gap: 8,
        elevation: 5
    },
    readButtonText: { color: 'white', fontSize: 18, fontWeight: '900' },
    resetBtn: { marginLeft: 15, alignItems: 'center' },
    resetBtnText: { color: '#FF4D4D', fontSize: 10, fontWeight: 'bold', marginTop: 2 }
});