import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar as RNStatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import data from '../data/prayers.json';
const { width } = Dimensions.get('window');
const isIPad = width > 600;

export default function Dualar({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState([]);

    // Favorileri Yükle (Ekran her odaklandığında güncellenir)
    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    const loadFavorites = async () => {
        try {
            const savedFavs = await AsyncStorage.getItem('@fav_prayers');
            if (savedFavs) setFavorites(JSON.parse(savedFavs));
        } catch (e) { console.log(e); }
    };

    const toggleFavorite = async (prayerId) => {
        let newFavs = [...favorites];
        if (newFavs.includes(prayerId)) {
            newFavs = newFavs.filter(id => id !== prayerId);
        } else {
            newFavs.push(prayerId);
        }
        setFavorites(newFavs);
        await AsyncStorage.setItem('@fav_prayers', JSON.stringify(newFavs));
    };

    // Arama ve Favoriler Filtreleme Mantığı
    const getFilteredData = () => {
        let allPrayers = [];
        data.categories.forEach(cat => {
            cat.prayers.forEach(p => {
                allPrayers.push({ ...p, categoryIcon: cat.icon });
            });
        });

        // Favori Listesi oluştur
        const favoriteList = allPrayers.filter(p => favorites.includes(p.id));

        // Normal Kategorileri Filtrele
        const filteredCats = data.categories.map(category => ({
            ...category,
            prayers: category.prayers.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.meaning.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })).filter(category => category.prayers.length > 0);

        // Eğer favori varsa ve arama yapılmıyorsa en başa Favorilerim ekle
        let finalData = [...filteredCats];
        if (favoriteList.length > 0 && searchQuery === '') {
            finalData.unshift({
                id: 'fav_cat',
                name: 'Favorilerim',
                icon: 'heart',
                prayers: favoriteList
            });
        }
        return finalData;
    };

    const renderPrayerCard = (prayer) => {
        const isFav = favorites.includes(prayer.id);
        return (
            <TouchableOpacity
                key={prayer.id}
                style={[styles.prayerCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('DuaDetay', { prayer })}
            >
                <View style={styles.cardContent}>
                    <View style={styles.leftInfo}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#2D6A4F33' : '#E9F5EE' }]}>
                            <MaterialCommunityIcons name="book-open-variant" size={isIPad ? 26 : 20} color={theme.active} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.prayerName, { color: theme.text }]} numberOfLines={1}>{prayer.title}</Text>
                            <Text style={[styles.prayerShort, { color: theme.subText }]} numberOfLines={1}>{prayer.meaning}</Text>
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => toggleFavorite(prayer.id)} style={styles.favBtn}>
                        <MaterialCommunityIcons
                            name={isFav ? "heart" : "heart-outline"}
                            size={22}
                            color={isFav ? "#E63946" : theme.subText}
                        />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                <View style={styles.header}>
                    <Text style={[styles.headerSubtitle, { color: theme.subText }]}>KÜLLİYAT</Text>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Dualar ve Sureler</Text>
                </View>

                <View style={styles.searchContainer}>
                    <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <MaterialCommunityIcons name="magnify" size={22} color={theme.subText} />
                        <TextInput
                            placeholder="Dua veya sure ara..."
                            placeholderTextColor={theme.subText}
                            style={[styles.searchInput, { color: theme.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <MaterialCommunityIcons name="close-circle" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <FlatList
                    data={getFilteredData()}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listPadding}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true} // Bellek yönetimi için
                    initialNumToRender={10} // Ekran kasmaması için
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.subText }}>Sonuç bulunamadı.</Text>
                        </View>
                    )}
                    renderItem={({ item: category }) => (
                        <View style={styles.categorySection}>
                            <View style={styles.categoryHeader}>
                                <MaterialCommunityIcons
                                    name={category.icon || "rhombus-medium"}
                                    size={18}
                                    color={category.id === 'fav_cat' ? "#E63946" : theme.active}
                                />
                                <Text style={[styles.categoryTitle, { color: category.id === 'fav_cat' ? "#E63946" : theme.active }]}>
                                    {category.name.toUpperCase()}
                                </Text>
                            </View>
                            {category.prayers.map(prayer => renderPrayerCard(prayer))}
                        </View>
                    )}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 0 },
    header: { paddingHorizontal: 25, paddingTop: 15, marginBottom: 5 },
    headerSubtitle: { fontSize: isIPad ? 14 : 10, fontWeight: '800', letterSpacing: 2 },
    headerTitle: { fontSize: isIPad ? 36 : 28, fontWeight: '900' },
    searchContainer: { paddingHorizontal: 25, marginVertical: 15 },
    searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 50, borderRadius: 15, borderWidth: 1 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '500' },
    listPadding: { paddingHorizontal: 20, paddingBottom: 40 },
    categorySection: { marginBottom: 25 },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, marginLeft: 10 },
    categoryTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
    prayerCard: { borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, elevation: 2 },
    cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    leftInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    textContainer: { flex: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    prayerName: { fontSize: 16, fontWeight: '700' },
    prayerShort: { fontSize: 12, marginTop: 2, fontWeight: '500' },
    favBtn: { padding: 5 },
    emptyContainer: { alignItems: 'center', marginTop: 40 }
});