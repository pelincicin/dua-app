import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import data from '../data/prayers.json';

export default function AnaSayfa() {
    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Huzur Kapısı</Text>
                        <Text style={styles.headerDate}>Hayırlı Günler</Text>
                    </View>

                    {/* Günün Duası Kartı */}
                    <View style={styles.mainCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTag}>✨ GÜNÜN DUASI</Text>
                        </View>
                        <Text style={styles.prayerTitle}>{data.gununDuasi.title}</Text>
                        <Text style={styles.prayerArabic}>"{data.gununDuasi.content}"</Text>
                        <View style={styles.divider} />
                        <Text style={styles.prayerMeaning}>{data.gununDuasi.meaning}</Text>
                    </View>

                    {/* Günün Sünneti Kartı */}
                    <View style={styles.sunnahCard}>
                        <Text style={styles.sunnahLabel}>🌹 GÜNÜN SÜNNETİ</Text>
                        <Text style={styles.sunnahText}>{data.gununSunneti}</Text>
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8F9FA' },
    container: { flex: 1 },
    content: { padding: 20 },
    header: { marginBottom: 30 },
    headerTitle: { fontSize: 32, fontWeight: '900', color: '#1A1A1A', letterSpacing: -1 },
    headerDate: { fontSize: 16, color: '#6C757D', marginTop: 4, fontWeight: '500' },
    mainCard: {
        backgroundColor: '#1B4332',
        borderRadius: 35,
        padding: 25,
        shadowColor: '#1B4332',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
        borderBottomWidth: 6,
        borderBottomColor: '#081C15'
    },
    cardHeader: { marginBottom: 15 },
    cardTag: { color: '#D8F3DC', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    prayerTitle: { color: '#FFF', fontSize: 26, fontWeight: '800', marginBottom: 15 },
    prayerArabic: { color: '#FFF', fontSize: 24, textAlign: 'center', fontStyle: 'italic', lineHeight: 38, marginBottom: 20 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20 },
    prayerMeaning: { color: '#B7E4C7', fontSize: 18, textAlign: 'center', lineHeight: 28 },
    sunnahCard: {
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 25,
        marginTop: 25,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        elevation: 3
    },
    sunnahLabel: { fontSize: 14, fontWeight: 'bold', color: '#6C757D', marginBottom: 10 },
    sunnahText: { fontSize: 21, color: '#212529', lineHeight: 32, fontWeight: '600' }
});