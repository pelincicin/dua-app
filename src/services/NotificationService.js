import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Bildirim Davranışı Ayarı
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
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
        // Kanal ismini değiştirerek Android sistemini ayarları güncellemeye zorluyoruz
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

// 3. Merkezi Bildirim Planlayıcı (Hataları Önleyen Fonksiyon)
const schedule = async (id, title, body, trigger) => {
    try {
        await Notifications.scheduleNotificationAsync({
            identifier: id, // Aynı ID ile gelen yeni bildirim eskisini ezer, kalabalığı önler.
            content: {
                title,
                body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
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
        console.log(`${id} planlanırken hata oluştu:`, e);
    }
};

// 4. Hatırlatıcı Tanımlamaları
export const scheduleDuaReminder = async () => {
    await schedule(
        'dua_daily',
        "Hayırlı Sabahlar 🤲",
        "Günün özel duasını okuyarak huzura kavuşmak ister misin?",
        { hour: 10, minute: 0, repeats: true }
    );
};

export const scheduleSalavatReminder = async () => {
    await schedule(
        'salavat_daily',
        "Salavat Getirmeyi Unutma ✨",
        "Peygamber Efendimize (sav) bir salavat göndererek güne bereket katabilirsin.",
        { hour: 14, minute: 5, repeats: true }
    );
};

export const scheduleFridayReminder = async () => {
    await schedule(
        'friday_weekly',
        "Hayırlı Cumalar 🌹",
        "Bugün Cuma; Kehf suresini okumayı ve dua etmeyi unutmayın.",
        { weekday: 6, hour: 11, minute: 0, repeats: true } // 6 = Cuma (Bazı sistemlerde 5 olabilir, test ediniz)
    );
};

export const scheduleZikirSummary = async () => {
    // Sayı hatasını önlemek için metni kullanıcıyı uygulamaya davet edecek şekilde güncelledik.
    await schedule(
        'zikir_summary',
        "Günün Zikir Notu ✨",
        "Bugünkü zikir hedefine ulaştın mı? Kontrol etmek ve huzura kavuşmak için tıkla. 🤲",
        { hour: 19, minute: 0, repeats: true }
    );
};

// 5. Ana Başlatıcı
export const scheduleAllNotifications = async () => {
    const hasPermission = await setupNotifications();
    if (!hasPermission) {
        console.log("Bildirim izni alınamadı.");
        return;
    }

    // Önceki tüm hatalı/çakışan planları temizliyoruz.
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Yeni tertemiz planları kuruyoruz.
    await Promise.all([
        scheduleDuaReminder(),
        scheduleSalavatReminder(),
        scheduleFridayReminder(),
        scheduleZikirSummary()
    ]);
};