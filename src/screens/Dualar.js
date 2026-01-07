import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import data from '../data/prayers.json';

// Eski hali: export default function Dualar() {
// Yeni hali (içine { navigation } ekledik):
export default function Dualar({ navigation }) {
    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <Text className="text-gray-500 mb-4 text-center">Dua Kategorileri</Text>

            {data.categories.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    className="bg-white p-6 rounded-2xl mb-4 shadow-sm border-l-8 border-green-600 flex-row justify-between items-center"
                    // Buradaki navigation.navigate artık hata vermeyecek:
                    onPress={() => navigation.navigate('DuaDetay', { prayer: item.prayers[0] })}
                >
                    <View>
                        <Text className="text-2xl font-bold text-gray-800">{item.name}</Text>
                        <Text className="text-gray-500">{item.prayers.length} Dua Mevcut</Text>
                    </View>
                    <Text className="text-3xl text-green-600">➔</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}