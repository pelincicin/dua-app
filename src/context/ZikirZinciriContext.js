import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    arkadaslariDinle,
    gelenIstekleriDinle,
    gonderdiginIstekleriDinle,
    gruplarıDinle
} from '../services/zikirZinciriService';
import { useUser } from './UserContext';

const ZikirZinciriContext = createContext();

export function ZikirZinciriProvider({ children }) {
    const { userId } = useUser();

    const [gelenIstekler, setGelenIstekler] = useState([]);
    const [gonderdiğimIstekler, setGonderdiğimIstekler] = useState([]);
    const [aktifGruplar, setAktifGruplar] = useState([]);
    const [arkadaslar, setArkadaslar] = useState([]);
    const [aktifIcinId, setAktifIcinId] = useState(null);

    const unsubRefs = useRef([]);

    useEffect(() => {
        if (!userId) return;

        unsubRefs.current.forEach(fn => fn());
        unsubRefs.current = [];

        const u1 = gelenIstekleriDinle(userId, setGelenIstekler);
        const u2 = gonderdiginIstekleriDinle(userId, setGonderdiğimIstekler);
        const u3 = gruplarıDinle(userId, setAktifGruplar);
        const u4 = arkadaslariDinle(userId, setArkadaslar);

        unsubRefs.current = [u1, u2, u3, u4];

        return () => {
            unsubRefs.current.forEach(fn => fn());
        };
    }, [userId]);

    const aktifIcin = aktifIcinId
        ? (gelenIstekler.find(r => r.id === aktifIcinId) ?? null)
        : null;

    const setAktifIcin = (istek) => setAktifIcinId(istek ? istek.id : null);

    const bekleyenSayisi = gelenIstekler.length;

    return (
        <ZikirZinciriContext.Provider value={{
            gelenIstekler,
            gonderdiğimIstekler,
            aktifGruplar,
            arkadaslar,
            bekleyenSayisi,
            aktifIcin,
            setAktifIcin,
        }}>
            {children}
        </ZikirZinciriContext.Provider>
    );
}

export const useZikirZinciri = () => useContext(ZikirZinciriContext);
