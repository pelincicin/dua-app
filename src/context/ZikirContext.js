import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { updateZikirWidget } from '../utils/widgetHelper';

export const ZikirContext = createContext();

export const ZikirProvider = ({ children }) => {
    const [toplamZikir, setToplamZikir] = useState(0);
    const [dunZikir, setDunZikir] = useState(0);
    const [hedefZikir, setHedefZikir_] = useState(1200);
    const hedefRef = useRef(1200);
    const toplamRef = useRef(0);

    useEffect(() => {
        const veriyiYukle = async () => {
            try {
                const kaydedilmisZikir = await AsyncStorage.getItem('@toplam_zikir');
                const kaydedilmisTarih = await AsyncStorage.getItem('@kayit_tarihi');
                const kaydedilmisDun = await AsyncStorage.getItem('@dun_zikir');
                const kaydedilmisHedef = await AsyncStorage.getItem('@hedef_zikir');

                const bugun = new Date().toLocaleDateString('tr-TR');

                if (kaydedilmisDun !== null) {
                    setDunZikir(parseInt(kaydedilmisDun));
                }

                if (kaydedilmisHedef !== null) {
                    const hedef = parseInt(kaydedilmisHedef);
                    setHedefZikir_(hedef);
                    hedefRef.current = hedef;
                }

                if (kaydedilmisTarih !== null) {
                    if (kaydedilmisTarih === bugun) {
                        if (kaydedilmisZikir !== null) {
                            setToplamZikir(parseInt(kaydedilmisZikir));
                        }
                    } else {
                        const eskiZikir = kaydedilmisZikir || '0';
                        await AsyncStorage.setItem('@dun_zikir', eskiZikir);
                        setDunZikir(parseInt(eskiZikir));
                        setToplamZikir(0);
                        await AsyncStorage.setItem('@toplam_zikir', '0');
                        await AsyncStorage.setItem('@kayit_tarihi', bugun);
                    }
                } else {
                    await AsyncStorage.setItem('@kayit_tarihi', bugun);
                    await AsyncStorage.setItem('@dun_zikir', '0');
                }
            } catch (e) {
                console.log("Veri yükleme hatası:", e);
            }
        };
        veriyiYukle();
    }, []);

    useEffect(() => {
        const veriyiKaydet = async () => {
            try {
                const bugun = new Date().toLocaleDateString('tr-TR');
                toplamRef.current = toplamZikir;
                await AsyncStorage.setItem('@toplam_zikir', toplamZikir.toString());
                await AsyncStorage.setItem('@kayit_tarihi', bugun);
                updateZikirWidget(toplamZikir, hedefRef.current);
            } catch (e) {
                console.log("Veri kaydetme hatası:", e);
            }
        };
        if (toplamZikir >= 0) veriyiKaydet();
    }, [toplamZikir]);

    const arttir = () => setToplamZikir(prev => prev + 1);
    const sifirla = () => setToplamZikir(0);

    const setHedef = useCallback(async (value) => {
        const parsed = parseInt(value);
        if (!isNaN(parsed) && parsed > 0) {
            setHedefZikir_(parsed);
            hedefRef.current = parsed;
            try {
                await AsyncStorage.setItem('@hedef_zikir', parsed.toString());
                updateZikirWidget(toplamRef.current, parsed);
            } catch (e) {
                console.log('Hedef kaydetme hatası:', e);
            }
        }
    }, []);

    return (
        <ZikirContext.Provider value={{ toplamZikir, dunZikir, arttir, sifirla, setToplamZikir, hedefZikir, setHedef }}>
            {children}
        </ZikirContext.Provider>
    );
};
