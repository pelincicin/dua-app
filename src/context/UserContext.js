import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { db } from '../config/firebase';

const UserContext = createContext();

function generateUserId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

async function getOrCreateUserId() {
    let id = await AsyncStorage.getItem('@userId');
    if (!id) {
        id = generateUserId();
        await AsyncStorage.setItem('@userId', id);
    }
    return id;
}

async function getExpoPushToken() {
    try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return null;
        const token = await Notifications.getExpoPushTokenAsync();
        return token.data;
    } catch {
        return null;
    }
}

export function UserProvider({ children }) {
    const [userId, setUserId] = useState(null);
    const [displayName, setDisplayName] = useState(null);
    const [pushToken, setPushToken] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        initUser();
    }, []);

    const initUser = async () => {
        try {
            const id = await getOrCreateUserId();
            const name = await AsyncStorage.getItem('@displayName');
            const token = await getExpoPushToken();

            setUserId(id);
            setDisplayName(name);
            setPushToken(token);

            // Firestore'da kayıtlıysa token güncelle
            if (name && token) {
                await syncUserToFirestore(id, name, token);
            }
        } catch (e) {
            console.log('UserContext init hatası:', e);
        } finally {
            setIsReady(true);
        }
    };

    const syncUserToFirestore = async (id, name, token) => {
        try {
            const userRef = doc(db, 'users', id);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                await updateDoc(userRef, { pushToken: token || '', displayName: name });
            } else {
                await setDoc(userRef, {
                    displayName: name,
                    pushToken: token || '',
                    createdAt: new Date(),
                });
            }
        } catch (e) {
            console.log('Firestore sync hatası:', e);
        }
    };

    const saveDisplayName = useCallback(async (name) => {
        try {
            const id = userId || await getOrCreateUserId();
            const token = pushToken || await getExpoPushToken();
            await AsyncStorage.setItem('@displayName', name);
            await setDoc(doc(db, 'users', id), {
                displayName: name,
                pushToken: token || '',
                createdAt: new Date(),
            }, { merge: true });
            setDisplayName(name);
            setUserId(id);
            if (token) setPushToken(token);
        } catch (e) {
            console.log('İsim kaydetme hatası:', e);
            throw e;
        }
    }, [userId, pushToken]);

    // lastSeen güncelleme — kullanıcı hazır olduğunda ve uygulama ön plana geldiğinde
    useEffect(() => {
        if (!userId || !displayName) return;

        const ping = async () => {
            try {
                await updateDoc(doc(db, 'users', userId), { lastSeen: serverTimestamp() });
            } catch {}
        };

        ping();
        const interval = setInterval(ping, 2 * 60 * 1000);
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') ping();
        });

        return () => {
            clearInterval(interval);
            sub.remove();
        };
    }, [userId, displayName]);

    return (
        <UserContext.Provider value={{ userId, displayName, pushToken, isReady, saveDisplayName }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
