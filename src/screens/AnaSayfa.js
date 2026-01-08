import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext'; // Context'i çekiyoruz
import data from '../data/prayers.json';

export default function AnaSayfa() {
    const { isDarkMode, toggleTheme, theme } = useTheme();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

                    <View style={styles.headerRow}>
                        <View>
                            <Text style={[styles.dateText, { color: theme.subText }]}>
                                {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                            </Text>
                            <Text style={[styles.welcomeText, { color: theme.text }]}>Hayırlı Günler ✨</Text>
                        </View>
                        <TouchableOpacity onPress={toggleTheme} style={[styles.themeToggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <MaterialCommunityIcons
                                name={isDarkMode ? "weather-sunny" : "weather-night"}
                                size={22}
                                color={isDarkMode ? "#FFD60A" : "#1B4332"}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mainCard}>
                        <Text style={styles.cardTagText}>✨ GÜNÜN DUASI</Text>
                        <Text style={styles.prayerTitleText}>{data.gununDuasi.title}</Text>
                        <Text style={styles.prayerArabicText}>{data.gununDuasi.content}</Text>
                        <View style={styles.cardDivider} />
                        <Text style={styles.prayerMeaningText}>{data.gununDuasi.meaning}</Text>
                    </View>

                    <View style={[styles.sunnahCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.sunnahTitle, { color: theme.subText }]}>GÜNÜN SÜNNETİ</Text>
                        <Text style={[styles.sunnahMainText, { color: theme.text }]}>{data.gununSunneti}</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: { paddingHorizontal: 25, paddingTop: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    dateText: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    welcomeText: { fontSize: 28, fontWeight: '900', marginTop: 2 },
    themeToggle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    mainCard: { backgroundColor: '#1B4332', borderRadius: 30, padding: 25, elevation: 8 },
    cardTagText: { color: '#D8F3DC', fontSize: 10, fontWeight: '900', opacity: 0.8 },
    prayerTitleText: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 15 },
    prayerArabicText: { color: '#FFF', fontSize: 22, textAlign: 'center', marginVertical: 20, lineHeight: 34 },
    cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
    prayerMeaningText: { color: '#B7E4C7', fontSize: 15, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
    sunnahCard: { marginTop: 20, borderRadius: 25, padding: 20, borderWidth: 1 },
    sunnahTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 },
    sunnahMainText: { fontSize: 17, fontWeight: '700', lineHeight: 26 },
});