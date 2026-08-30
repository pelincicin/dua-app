import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Bildirim Davranışı Ayarı
// Uygulama açıkken (ön planda) bildirimlerin sessiz kalmasını sağlar.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

// 2. İzinler ve Android Kanal Kurulumu
export const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('zikir-v2', {
            name: 'Huzur Hatırlatıcıları',
            importance: Notifications.AndroidImportance.MAX,
            sound: true,
            vibrationPattern: [0, 250, 250, 250],
            enableVibrate: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
    }
    return true;
};

// 3. Merkezi Bildirim Planlayıcı (Data parametresi eklendi)
const schedule = async (id, title, body, trigger, screenName) => {
    try {
        await Notifications.scheduleNotificationAsync({
            identifier: id,
            content: {
                title,
                body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { screen: screenName }, // Tıklandığında gidilecek ekran bilgisi
                android: {
                    channelId: 'zikir-v2',
                    pressAction: { id: 'default' }
                }
            },
            trigger: {
                ...trigger,
                channelId: 'zikir-v2'
            },
        });
    } catch (e) {
        console.log(`${id} planlanırken hata:`, e);
    }
};

// 4. Hatırlatıcı Tanımlamaları
export const scheduleDuaReminder = () => schedule(
    'dua_daily',
    "Hayırlı Sabahlar 🤲",
    "Günün özel duasını okuyarak huzura kavuşmak ister misin?",
    { hour: 10, minute: 0, repeats: true },
    'Ana Sayfa' // Tıklanınca gideceği ekran adı
);

export const scheduleSalavatReminder = () => schedule(
    'salavat_daily',
    "Salavat Getirmeyi Unutma ✨",
    "Efendimize (sav) bir salavat göndererek güne bereket katabilirsin.",
    { hour: 14, minute: 5, repeats: true },
    'Ana Sayfa'
);

export const scheduleFridayReminder = () => schedule(
    'friday_weekly',
    "Hayırlı Cumalar 🌹",
    "Bugün Cuma; Kehf suresini okumayı ve dua etmeyi unutmayın.",
    { weekday: 6, hour: 11, minute: 0, repeats: true },
    'Ana Sayfa'
);

export const scheduleZikirSummary = () => schedule(
    'zikir_summary',
    "Günün Zikir Notu ✨",
    "Bugünkü zikir hedefine ulaştın mı? Kontrol etmek için tıkla. 🤲",
    { hour: 19, minute: 0, repeats: true },
    'Zikirmatik' // Buraya Zikirmatik sayfasının Navigation name'ini yazıyoruz
);

// 5. Ana Başlatıcı
export const scheduleAllNotifications = async () => {
    try {
        const isSet = await AsyncStorage.getItem('notifications_initialised_v2');
        if (isSet === 'true') {
            console.log("Bildirimler zaten kurulu, tekrar kurulmadı.");
            return;
        }

        const hasPermission = await setupNotifications();
        if (!hasPermission) return;

        // Eski planları temizle ve yenilerini kur
        await Notifications.cancelAllScheduledNotificationsAsync();

        await Promise.all([
            scheduleDuaReminder(),
            scheduleSalavatReminder(),
            scheduleFridayReminder(),
            scheduleZikirSummary()
        ]);

        await AsyncStorage.setItem('notifications_initialised_v2', 'true');
        console.log("Tüm bildirimler başarıyla planlandı.");

    } catch (error) {
        console.log("Bildirim kurulum hatası:", error);
    }
};