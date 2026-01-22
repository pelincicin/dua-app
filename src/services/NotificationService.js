import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Bildirim Yönetimi (Ses ve Görünüm)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true, // SES AÇIK
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrationPattern: [0, 250, 250, 250],
    }),
});

// 2. Kurulum ve İzinler
export const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Genel Hatırlatıcılar',
            importance: Notifications.AndroidImportance.MAX, // Ses çıkması için MAX olmalı
            sound: true,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1B4332',
        });
    }
    return true;
};

// 3. Günün Duası (Sabah 10:30 - Güne başlarken)
export const scheduleDuaReminder = async () => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Hayırlı Sabahlar 🤲",
            body: "Günün özel duasını okuyarak huzura kavuşmak ister misin?",
            data: { screen: 'DuaDetay' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 10,
            minute: 0,
            channelId: 'default',
        },
    });
};

// 4. Öğle Salavat Hatırlatıcısı (Öğle 14:00)
export const scheduleSalavatReminder = async () => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Salavat Getirmeyi Unutma ✨",
            body: "Allahümme salli alâ seyyidinâ Muhammedin ve alâ âli seyyidinâ Muhammed.",
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 14,
            minute: 5,
            channelId: 'default',
        },
    });
};

// 5. Cuma Tebriği (Her Cuma 11:00)
export const scheduleFridayReminder = async () => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Hayırlı Cumalar 🌹",
            body: "Bugün Cuma, Cuma duasını okumayı unutmayın.",
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 6, // 6 = Cuma (Expo takvimine göre)
            hour: 11,
            minute: 0,
            channelId: 'default',
        },
    });
};

// 6. Gün Sonu Zikir Özeti (Akşam 18:30 - Geceye kalmadan)
export const scheduleZikirSummary = async () => {
    try {
        const kaydedilmisDun = await AsyncStorage.getItem('@dun_zikir');
        const count = kaydedilmisDun ? parseInt(kaydedilmisDun) : 0;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Günün Zikir Notu ✨",
                body: count > 0
                    ? `Bugün ${count} zikir çektin. Rabbim kabul etsin!`
                    : "Bugünü biraz durgun geçirdik, akşam zikrini çekmek ister misin?",
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 19,
                minute: 0,
                channelId: 'default',
            },
        });
    } catch (error) {
        console.log("Bildirim planlama hatası:", error);
    }
};

// Toplu Planlayıcı (Uygulama açılışında çağrılır)
export const scheduleAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync(); // Üst üste binmesin
    await scheduleDuaReminder();
    await scheduleSalavatReminder();
    await scheduleFridayReminder();
    await scheduleZikirSummary();
};