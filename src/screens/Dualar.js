import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    FlatList,
    Platform,
    StatusBar as RNStatusBar,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import data from '../data/prayers.json'; // Kategorize edilmiş JSON dosyan

export default function Dualar({ navigation }) {
    const { theme, isDarkMode } = useTheme();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
            {/* ÜST BAŞLIK ALANI */}
            <View style={styles.header}>
                <Text style={[styles.headerSubtitle, { color: theme.subText }]}>KÜLLİYAT</Text>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Dualar ve Sureler</Text>
            </View>

            <FlatList
                data={data.categories}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listPadding}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: category }) => (
                    <View style={styles.categorySection}>
                        {/* KATEGORİ BAŞLIĞI */}
                        <View style={styles.categoryHeader}>
                            <MaterialCommunityIcons
                                name={category.icon || "rhombus-medium"}
                                size={18}
                                color={theme.active}
                            />
                            <Text style={[styles.categoryTitle, { color: theme.active }]}>
                                {category.name.toUpperCase()}
                            </Text>
                        </View>

                        {/* KATEGORİYE AİT DUALAR */}
                        {category.prayers.map((prayer) => (
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
                                        <View style={styles.textContainer}>
                                            <Text style={[styles.prayerName, { color: theme.text }]}>
                                                {prayer.title}
                                            </Text>
                                            <Text style={[styles.prayerShort, { color: theme.subText }]} numberOfLines={1}>
                                                {prayer.meaning.substring(0, 40)}...
                                            </Text>
                                        </View>
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
    safe: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 0
    },
    header: {
        paddingHorizontal: 25,
        paddingTop: 15,
        marginBottom: 10
    },
    headerSubtitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900'
    },
    listPadding: {
        paddingHorizontal: 20,
        paddingBottom: 120,
        paddingTop: 10
    },
    categorySection: {
        marginBottom: 25
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 15,
        marginLeft: 10
    },
    categoryTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.2
    },
    prayerCard: {
        borderRadius: 22,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    leftInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    textContainer: {
        flex: 1
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    prayerName: {
        fontSize: 16,
        fontWeight: '700'
    },
    prayerShort: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500'
    }
});