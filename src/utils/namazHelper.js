import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NAMAZLAR = [
    { key: 'fajr',    isim: 'İmsak',  ikon: 'weather-night',         renk: '#4361EE', acik: '#EEF2FF', darkBg: '#0D1433' },
    { key: 'sunrise', isim: 'Güneş',  ikon: 'weather-sunset-up',     renk: '#FB8500', acik: '#FFF4E6', darkBg: '#2D1A00' },
    { key: 'dhuhr',   isim: 'Öğle',   ikon: 'white-balance-sunny',   renk: '#0096C7', acik: '#E0F4FF', darkBg: '#002233' },
    { key: 'asr',     isim: 'İkindi', ikon: 'weather-partly-cloudy', renk: '#F4A261', acik: '#FFF2E6', darkBg: '#2D1A00' },
    { key: 'maghrib', isim: 'Akşam',  ikon: 'weather-sunset',        renk: '#E63946', acik: '#FEECEE', darkBg: '#2D0008' },
    { key: 'isha',    isim: 'Yatsı',  ikon: 'moon-waning-crescent',  renk: '#457B9D', acik: '#E8F1F8', darkBg: '#001420' },
];

export const VARSAYILAN_TERCIHLER = {
    fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true,
};

export function hesaplaNamazVakitleri(lat, lng, tarih = new Date()) {
    const koordinat = new Coordinates(lat, lng);
    const params = CalculationMethod.Turkey();
    const pt = new PrayerTimes(koordinat, tarih, params);
    return {
        fajr:    pt.fajr,
        sunrise: pt.sunrise,
        dhuhr:   pt.dhuhr,
        asr:     pt.asr,
        maghrib: pt.maghrib,
        isha:    pt.isha,
    };
}

export function siradakiNamazi(vakitler) {
    const simdi = new Date();
    for (const n of NAMAZLAR) {
        const z = vakitler[n.key];
        if (z && z > simdi) return { ...n, zaman: z };
    }
    return null;
}

export function mevcutNamaz(vakitler) {
    const simdi = new Date();
    let son = null;
    for (const n of NAMAZLAR) {
        const z = vakitler[n.key];
        if (z && z <= simdi) son = { ...n, zaman: z };
    }
    return son;
}

export function formatSaat(d) {
    if (!d) return '--:--';
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function kalanSureStr(ms) {
    if (ms <= 0) return '00:00:00';
    const sn = Math.floor(ms / 1000);
    const s = sn % 60;
    const m = Math.floor(sn / 60) % 60;
    const h = Math.floor(sn / 3600);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function androidKanaliOlustur() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('namaz-vakitleri', {
        name: 'Namaz Vakitleri',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#2D6A4F',
    });
}

export async function namazBildirimleriniAyarla(lat, lng, tercihler) {
    try {
        await androidKanaliOlustur();

        // Sadece namaz bildirimlerini iptal et
        const planlananlar = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
            planlananlar
                .filter(n => n.content.data?.tip === 'namaz')
                .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
        );

        const simdi = new Date();

        // Bugün ve yarın için bildirim planla
        for (let gun = 0; gun <= 1; gun++) {
            const hedefGun = new Date(
                simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + gun, 12, 0, 0
            );
            const gunVakitleri = hesaplaNamazVakitleri(lat, lng, hedefGun);

            for (const namaz of NAMAZLAR) {
                if (namaz.key === 'sunrise') continue;
                if (!tercihler[namaz.key]) continue;

                const vakit = gunVakitleri[namaz.key];
                if (!vakit || vakit.getTime() <= simdi.getTime()) continue;

                const trigger = Platform.OS === 'android'
                    ? { date: vakit, channelId: 'namaz-vakitleri' }
                    : { date: vakit };

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `🕌 ${namaz.isim} Vakti`,
                        body: 'Hayırlı namazlar. Allah namazlarınızı kabul etsin.',
                        data: { tip: 'namaz', namaz: namaz.key },
                        sound: true,
                    },
                    trigger,
                });
            }
        }

        await AsyncStorage.setItem('@namazBildirimTarihi', simdi.toDateString());
    } catch (e) {
        console.log('Namaz bildirimi hatası:', e);
    }
}
