import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext'; // Tema eklendi
import data from '../data/prayers.json';

export default function Dualar({ navigation }) {
    const { theme, isDarkMode } = useTheme();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <Text style={[styles.headerSubtitle, { color: theme.subText }]}>KÜLLİYAT</Text>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Dualar ve Sureler</Text>
            </View>

            <FlatList
                data={data.categories}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listPadding}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.categorySection}>
                        {/* Kategori Başlığı */}
                        <Text style={[styles.categoryTitle, { color: theme.active }]}>
                            {item.name.toUpperCase()}
                        </Text>

                        {item.prayers.map((prayer) => (
                            <TouchableOpacity
                                key={prayer.id}
                                style={[
                                    styles.prayerCard,
                                    { backgroundColor: theme.card, borderColor: theme.border }
                                ]}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('DuaDetay', { prayer })}
                            >
                                <View style={styles.cardContent}>
                                    <View style={styles.leftInfo}>
                                        <View style={[
                                            styles.iconBox,
                                            { backgroundColor: isDarkMode ? '#2D6A4F33' : '#E9F5EE' }
                                        ]}>
                                            <MaterialCommunityIcons
                                                name="book-open-variant"
                                                size={20}
                                                color={theme.active}
                                            />
                                        </View>
                                        <Text style={[styles.prayerName, { color: theme.text }]}>
                                            {prayer.title}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={22}
                                        color={theme.subText}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: { paddingHorizontal: 25, paddingTop: 15, marginBottom: 10 },
    headerSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    headerTitle: { fontSize: 28, fontWeight: '900' },
    listPadding: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
    categorySection: { marginBottom: 30 },
    categoryTitle: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 15,
        marginLeft: 10,
        letterSpacing: 1.5
    },
    prayerCard: {
        borderRadius: 22,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    leftInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    prayerName: {
        fontSize: 18,
        fontWeight: '700',
        flexShrink: 1 // Uzun isimlerin taşmasını engeller
    }
});