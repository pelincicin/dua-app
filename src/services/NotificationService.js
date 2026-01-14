import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Bildirimlerin nasıl görüneceğini (veya görünmeyeceğini) ayarla
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false, // Rahatsız etmemek için ses kapalı
        shouldSetBadge: true,
    }),
});

// 2. İzinleri al ve kanalları oluştur
export const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.LOW, // Daha az rahatsız edici (Android)
            showBadge: true,
        });
    }
    return true;
};

// 3. Günün Duası Hatırlatıcısı (Her sabah 09:00)
export const scheduleDuaReminder = async () => {
    // Önce eski planlanmış bildirimleri temizle (üst üste binmemesi için)
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Hayırlı Sabahlar 🤲",
            body: "Günün duasını okuyarak güne bereketli başlamak ister misin?",
            data: { screen: 'AnaSayfa' }, // Bildirime tıklayınca gidilecek yer için veri
        },
        trigger: {
            hour: 9,
            minute: 0,
            repeats: true,
        },
    });
};

// 4. Zikir Özeti (Her akşam 21:00)
// Bu fonksiyon AsyncStorage'dan dünkü veriyi çekip bildirimi hazırlar
export const scheduleZikirSummary = async () => {
    try {
        const kaydedilmisDun = await AsyncStorage.getItem('@dun_zikir');
        const count = kaydedilmisDun ? parseInt(kaydedilmisDun) : 0;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Zikir Notu ✨",
                body: count > 0
                    ? `Dün toplam ${count} zikir çektin. Rabbim kabul etsin!`
                    : "Dünü biraz sakin geçirdik, bugün zikirlerimize devam edelim mi?",
            },
            trigger: {
                hour: 21,
                minute: 0,
                repeats: true,
            },
        });
    } catch (error) {
        console.log("Bildirim planlama hatası:", error);
    }
};