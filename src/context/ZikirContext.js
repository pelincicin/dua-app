import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState } from 'react';

export const ZikirContext = createContext();

export const ZikirProvider = ({ children }) => {
    const [toplamZikir, setToplamZikir] = useState(0);
    const [dunZikir, setDunZikir] = useState(0); // Dünün verisini tutmak için yeni state

    // Uygulama açıldığında verileri yükle ve GÜN KONTROLÜ yap
    useEffect(() => {
        const veriyiYukle = async () => {
            try {
                const kaydedilmisZikir = await AsyncStorage.getItem('@toplam_zikir');
                const kaydedilmisTarih = await AsyncStorage.getItem('@kayit_tarihi');
                const kaydedilmisDun = await AsyncStorage.getItem('@dun_zikir');

                const bugun = new Date().toLocaleDateString('tr-TR');

                // Dünün zikir sayısını state'e yükle
                if (kaydedilmisDun !== null) {
                    setDunZikir(parseInt(kaydedilmisDun));
                }

                if (kaydedilmisTarih !== null) {
                    if (kaydedilmisTarih === bugun) {
                        // Aynı gündeyiz, bugünün sayısını yükle
                        if (kaydedilmisZikir !== null) {
                            setToplamZikir(parseInt(kaydedilmisZikir));
                        }
                    } else {
                        // GÜN DEĞİŞMİŞ! 
                        // 1. Önce dünkü zikri hafızaya "dün" olarak kaydet (Bildirim için)
                        const eskiZikir = kaydedilmisZikir || '0';
                        await AsyncStorage.setItem('@dun_zikir', eskiZikir);
                        setDunZikir(parseInt(eskiZikir));

                        // 2. Bugünün sayacını sıfırla
                        setToplamZikir(0);
                        await AsyncStorage.setItem('@toplam_zikir', '0');
                        await AsyncStorage.setItem('@kayit_tarihi', bugun);
                    }
                } else {
                    // İlk kurulum
                    await AsyncStorage.setItem('@kayit_tarihi', bugun);
                    await AsyncStorage.setItem('@dun_zikir', '0');
                }
            } catch (e) {
                console.log("Veri yükleme hatası:", e);
            }
        };
        veriyiYukle();
    }, []);

    // Zikir her değiştiğinde telefon hafızasına kaydet
    useEffect(() => {
        const veriyiKaydet = async () => {
            try {
                const bugun = new Date().toLocaleDateString('tr-TR');
                await AsyncStorage.setItem('@toplam_zikir', toplamZikir.toString());
                await AsyncStorage.setItem('@kayit_tarihi', bugun);
            } catch (e) {
                console.log("Veri kaydetme hatası:", e);
            }
        };
        if (toplamZikir >= 0) veriyiKaydet();
    }, [toplamZikir]);

    const arttir = () => setToplamZikir(prev => prev + 1);
    const sifirla = () => setToplamZikir(0);

    return (
        <ZikirContext.Provider value={{ toplamZikir, dunZikir, arttir, sifirla, setToplamZikir }}>
            {children}
        </ZikirContext.Provider>
    );
};