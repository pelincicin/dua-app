import { useContext } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ZikirContext } from '../context/ZikirContext';

export default function Zikirmatik() {
    const { count, arttir, sifirla } = useContext(ZikirContext);

    return (
        <View className="flex-1 bg-white items-center justify-center p-6">
            <Text className="text-gray-400 mb-2 uppercase tracking-widest font-bold">Zikirmatik Sayacı</Text>

            {/* Sayı Paneli */}
            <View className="bg-green-50 w-full py-10 rounded-3xl border-2 border-green-100 items-center mb-10 shadow-inner">
                <Text className="text-8xl font-black text-green-700">{count}</Text>
            </View>

            {/* Dev Zikir Butonu */}
            <TouchableOpacity
                onPress={arttir}
                activeOpacity={0.9}
                className="bg-green-600 w-60 h-60 rounded-full items-center justify-center shadow-2xl border-[12px] border-green-100"
            >
                <Text className="text-white text-5xl font-black italic">ÇEK</Text>
            </TouchableOpacity>

            {/* Sıfırla Butonu */}
            <TouchableOpacity
                onPress={sifirla}
                className="mt-12 bg-red-50 px-10 py-4 rounded-full border border-red-100"
            >
                <Text className="text-red-600 font-bold text-xl uppercase">Sıfırla</Text>
            </TouchableOpacity>
        </View>
    );
}