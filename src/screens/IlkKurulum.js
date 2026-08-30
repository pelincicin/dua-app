import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

export default function IlkKurulum({ onComplete }) {
    const { theme, isDarkMode } = useTheme();
    const { saveDisplayName } = useUser();
    const [isim, setIsim] = useState('');
    const [loading, setLoading] = useState(false);
    const [hata, setHata] = useState('');
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const devam = async () => {
        const temizIsim = isim.trim();
        if (temizIsim.length < 2) {
            setHata('İsim en az 2 karakter olmalı.');
            return;
        }
        if (temizIsim.length > 20) {
            setHata('İsim en fazla 20 karakter olabilir.');
            return;
        }

        Keyboard.dismiss();
        setLoading(true);
        setHata('');

        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();

        try {
            await saveDisplayName(temizIsim);
            onComplete?.();
        } catch {
            setHata('Bağlantı hatası. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: isDarkMode ? '#0D1F17' : '#F0F7F3' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>

                {/* İkon */}
                <View style={[styles.iconWrapper, { backgroundColor: isDarkMode ? '#1B4332' : '#2D6A4F' }]}>
                    <MaterialCommunityIcons name="hand-heart" size={48} color="#FFF" />
                </View>

                <Text style={[styles.baslik, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
                    Huzur'a Hoş Geldiniz
                </Text>
                <Text style={[styles.altBaslik, { color: isDarkMode ? '#8AB89A' : '#5A8A6F' }]}>
                    Zikir Zinciri özelliğini kullanmak için{'\n'}bir kullanıcı adı oluşturun
                </Text>

                {/* Input */}
                <View style={[styles.inputWrap, {
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFF',
                    borderColor: hata ? '#DC2626' : (isDarkMode ? '#2A3A2E' : '#D0E8DA')
                }]}>
                    <MaterialCommunityIcons name="account-outline" size={22} color={isDarkMode ? '#4A8A5F' : '#2D6A4F'} />
                    <TextInput
                        style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
                        placeholder="Adınız (örn. Pelin)"
                        placeholderTextColor={isDarkMode ? '#4A6A58' : '#A0B8A8'}
                        value={isim}
                        onChangeText={t => { setIsim(t); setHata(''); }}
                        maxLength={20}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={devam}
                    />
                    {isim.length > 0 && (
                        <Text style={[styles.sayac, { color: isDarkMode ? '#4A6A58' : '#A0B8A8' }]}>
                            {isim.trim().length}/20
                        </Text>
                    )}
                </View>

                {hata ? <Text style={styles.hataText}>{hata}</Text> : null}

                <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: '#2D6A4F', opacity: loading ? 0.8 : 1 }]}
                        onPress={devam}
                        activeOpacity={0.85}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#FFF" />
                            : <>
                                <Text style={styles.btnText}>Devam Et</Text>
                                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                            </>
                        }
                    </TouchableOpacity>
                </Animated.View>

                <Text style={[styles.not, { color: isDarkMode ? '#3A5A48' : '#90B8A0' }]}>
                    Bu isim zikir taleplerinizde arkadaşlarınıza görünecek
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    content: { paddingHorizontal: 32, alignItems: 'center' },
    iconWrapper: {
        width: 88, height: 88, borderRadius: 44,
        justifyContent: 'center', alignItems: 'center', marginBottom: 24
    },
    baslik: { fontSize: 26, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
    altBaslik: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        width: '100%', height: 56, borderRadius: 18,
        borderWidth: 1.5, paddingHorizontal: 16, gap: 10, marginBottom: 8
    },
    input: { flex: 1, fontSize: 17, fontWeight: '600' },
    sayac: { fontSize: 12 },
    hataText: { color: '#DC2626', fontSize: 13, marginBottom: 12, alignSelf: 'flex-start' },
    btn: {
        width: '100%', height: 56, borderRadius: 18,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: 8, marginTop: 8, elevation: 4,
        shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    btnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
    not: { marginTop: 20, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
