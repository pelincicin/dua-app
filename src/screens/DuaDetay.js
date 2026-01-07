import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function DuaDetay({ route }) {
    const { prayer } = route.params;
    const [duaSayac, setDuaSayac] = useState(0);

    return (
        <View className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="p-6">

                    {/* Dua Başlığı */}
                    <Text className="text-3xl font-extrabold text-green-800 text-center mb-6">
                        {prayer.title}
                    </Text>

                    {/* Arapça Bölümü - Çok Büyük */}
                    <View className="bg-emerald-50 p-8 rounded-[40px] border-2 border-emerald-100 mb-8">
                        <Text className="text-5xl text-right leading-[70px] font-serif text-emerald-900">
                            {prayer.arabic}
                        </Text>
                    </View>

                    {/* Okunuşu Bölümü */}
                    <View className="mb-8">
                        <Text className="text-green-600 font-bold text-lg mb-2">OKUNUŞU:</Text>
                        <Text className="text-2xl text-gray-800 leading-10 italic">
                            {prayer.reading}
                        </Text>
                    </View>

                    {/* Anlamı Bölümü */}
                    <View className="mb-10 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <Text className="text-blue-600 font-bold text-lg mb-2">ANLAMI:</Text>
                        <Text className="text-2xl text-gray-700 leading-9">
                            {prayer.meaning}
                        </Text>
                    </View>

                </View>
            </ScrollView>

            {/* --- SABİT ALT ZİKİRMATİK (Sayfa Kaydırılsa da Burada Kalır) --- */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-orange-200 p-5 items-center flex-row justify-between shadow-2xl">
                <View className="flex-1">
                    <Text className="text-orange-800 font-bold text-xs uppercase">Dua Sayacı</Text>
                    <Text className="text-4xl font-black text-orange-600">{duaSayac}</Text>
                </View>

                <TouchableOpacity
                    onPress={() => setDuaSayac(duaSayac + 1)}
                    className="bg-orange-500 px-10 py-4 rounded-3xl shadow-lg active:bg-orange-600"
                >
                    <Text className="text-white text-2xl font-bold italic">OKUDUM</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setDuaSayac(0)} className="ml-4">
                    <Text className="text-red-400 text-xs font-bold underline">SIFIRLA</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}