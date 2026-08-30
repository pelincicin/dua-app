import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useZikirZinciri } from '../context/ZikirZinciriContext';
import { grupSil, grupUyeleriniDinle, gruptenCik, yeniTurBaslat } from '../services/zikirZinciriService';

function ProgressBar({ value, max, color, animated: useAnim = false }) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    const animWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (useAnim) {
            Animated.spring(animWidth, {
                toValue: pct,
                useNativeDriver: false,
                tension: 60,
                friction: 10,
            }).start();
        }
    }, [pct, useAnim, animWidth]);

    if (useAnim) {
        return (
            <View style={pb.bg}>
                <Animated.View style={[pb.fill, {
                    width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    backgroundColor: color
                }]} />
            </View>
        );
    }

    return (
        <View style={pb.bg}>
            <View style={[pb.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
    );
}
const pb = StyleSheet.create({
    bg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4 },
});

function UyeKart({ uye, theme, isDarkMode, isCurrentUser, onPress }) {
    const pct = uye.miktar > 0 ? Math.round((uye.tamamlanan / uye.miktar) * 100) : 0;
    const tamamlandi = uye.tamamlanan >= uye.miktar;
    const Wrapper = onPress ? TouchableOpacity : View;

    return (
        <Wrapper onPress={onPress} activeOpacity={0.8} style={[uStyle.kart, {
            backgroundColor: tamamlandi
                ? (isDarkMode ? '#0D2B1A' : '#E8F5EF')
                : theme.card,
            borderColor: tamamlandi ? '#2D6A4F' : (isCurrentUser ? '#8E94F2' : theme.border),
            borderWidth: isCurrentUser ? 2 : 1,
        }]}>
            <View style={uStyle.row}>
                <View style={[uStyle.avatar, {
                    backgroundColor: tamamlandi ? '#2D6A4F' : (isCurrentUser ? '#8E94F2' : (isDarkMode ? '#333' : '#E8E8E8'))
                }]}>
                    {tamamlandi
                        ? <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                        : <Text style={[uStyle.avatarText, { color: tamamlandi || isCurrentUser ? '#FFF' : theme.subText }]}>
                            {(uye.displayName || '?')[0].toUpperCase()}
                        </Text>
                    }
                </View>
                <View style={uStyle.info}>
                    <View style={uStyle.nameRow}>
                        <Text style={[uStyle.name, { color: theme.text }]} numberOfLines={1}>
                            {uye.displayName || 'Bilinmiyor'}
                        </Text>
                        {isCurrentUser && (
                            <View style={uStyle.benPill}>
                                <Text style={uStyle.benText}>Ben</Text>
                            </View>
                        )}
                        {uye.isCreator && (
                            <View style={[uStyle.kurucuPill]}>
                                <MaterialCommunityIcons name="crown" size={10} color="#F59E0B" />
                                <Text style={uStyle.kurucuText}>Kurucu</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[uStyle.counts, { color: theme.subText }]}>
                        {uye.tamamlanan.toLocaleString()} / {uye.miktar.toLocaleString()} zikir
                    </Text>
                </View>
                <Text style={[uStyle.pct, { color: tamamlandi ? '#2D6A4F' : theme.active }]}>
                    {pct}%
                </Text>
            </View>
            <View style={{ marginTop: 10 }}>
                <ProgressBar value={uye.tamamlanan} max={uye.miktar} color={tamamlandi ? '#2D6A4F' : '#8E94F2'} />
            </View>
            {onPress && !tamamlandi && (
                <View style={uStyle.zikirmatikHint}>
                    <MaterialCommunityIcons name="hands-pray" size={12} color="#8E94F2" />
                    <Text style={uStyle.zikirmatikHintText}>Zikirmatik'te çek</Text>
                </View>
            )}
        </Wrapper>
    );
}
const uStyle = StyleSheet.create({
    kart: {
        borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center'
    },
    avatarText: { fontSize: 16, fontWeight: '900' },
    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    name: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
    counts: { fontSize: 12 },
    pct: { fontSize: 15, fontWeight: '900' },
    benPill: {
        backgroundColor: '#8E94F2', borderRadius: 6,
        paddingHorizontal: 6, paddingVertical: 1,
    },
    benText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    kurucuPill: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1
    },
    kurucuText: { color: '#B45309', fontSize: 9, fontWeight: '900' },
    zikirmatikHint: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, marginTop: 8,
    },
    zikirmatikHintText: { color: '#8E94F2', fontSize: 11, fontWeight: '700' },
});

export default function GrupDetay({ route, navigation }) {
    const { groupId } = route.params;
    const { theme, isDarkMode } = useTheme();
    const { userId } = useUser();
    const { aktifGruplar, gelenIstekler, setAktifIcin } = useZikirZinciri();

    const [uyeler, setUyeler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [yeniTurModal, setYeniTurModal] = useState(false);
    const [yeniMiktar, setYeniMiktar] = useState('');
    const grup = aktifGruplar.find(g => g.id === groupId);
    const isKurucu = grup?.kurucuId === userId;

    useEffect(() => {
        if (grup?.baslik) navigation.setOptions({ title: grup.baslik });
    }, [grup?.baslik, navigation]);

    useEffect(() => {
        const unsub = grupUyeleriniDinle(groupId, (data) => {
            setUyeler(data.sort((a, b) => b.tamamlanan - a.tamamlanan));
        });
        return unsub;
    }, [groupId]);

    const benimIstek = gelenIstekler.find(r => r.groupId === groupId && r.toId === userId && r.durum === 'aktif');

    const handleBenimKart = () => {
        if (benimIstek) {
            setAktifIcin(benimIstek);
            navigation.navigate('MainTabs', { screen: 'Zikirmatik' });
        }
    };

    const handleGrupSil = () => {
        Alert.alert(
            'Grubu Sil',
            'Grup silinecek ve tüm üyeler gruptan çıkarılacak. Bu işlem geri alınamaz.',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil', style: 'destructive', onPress: async () => {
                        setYukleniyor(true);
                        try {
                            await grupSil(groupId);
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Hata', 'Grup silinemedi.');
                        } finally {
                            setYukleniyor(false);
                        }
                    }
                },
            ]
        );
    };

    const handleGruptenCik = () => {
        Alert.alert(
            'Gruptan Çık',
            'Gruptan çıkmak istediğinizden emin misiniz? İlerlemeniz kaybolacak.',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Çık', style: 'destructive', onPress: async () => {
                        setYukleniyor(true);
                        try {
                            await gruptenCik(groupId, userId);
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Hata', 'Gruptan çıkılamadı.');
                        } finally {
                            setYukleniyor(false);
                        }
                    }
                },
            ]
        );
    };

    const handleYeniTur = async () => {
        const miktar = parseInt(yeniMiktar);
        if (!miktar || miktar < 1 || miktar > 100000) {
            Alert.alert('Hata', 'Geçerli bir miktar girin (1 - 100.000).');
            return;
        }
        setYukleniyor(true);
        try {
            await yeniTurBaslat(groupId, miktar);
            setYeniTurModal(false);
            setYeniMiktar('');
        } catch (e) {
            Alert.alert('Hata', 'Yeni tur başlatılamadı.');
        } finally {
            setYukleniyor(false);
        }
    };

    const kodPaylas = async () => {
        if (!grup?.davetKodu) return;
        const mesaj =
            `Zikir Zinciri grubuna davet edildiniz!\n\n` +
            `Grup: ${grup.baslik}\n` +
            `${grup.kisiBasinaMiktar?.toLocaleString()} zikir/kişi · ${grup.mevcutUye}/${grup.maxUye} üye\n\n` +
            `Davet Kodu: *${grup.davetKodu}*\n\n` +
            `"Huzur: Zikirmatik ve Dualar" uygulamasını indir, Zikir Zinciri sekmesinde "Kod Gir" butonuna bas.\n\n` +
            `Android: https://play.google.com/store/apps/details?id=com.pelincicin.huzurzikirmatikvedualar`;
        await Share.share({ message: mesaj });
    };

    const toplamTamamlanan = uyeler.reduce((s, u) => s + u.tamamlanan, 0);
    const toplamHedef = grup?.toplamHedef || uyeler.reduce((s, u) => s + u.miktar, 0);
    const genelPct = toplamHedef > 0 ? Math.round((toplamTamamlanan / toplamHedef) * 100) : 0;
    const tamamlananSayisi = uyeler.filter(u => u.tamamlanan >= u.miktar).length;
    const hepsiBitti = uyeler.length > 0 && tamamlananSayisi === uyeler.length;

    const deadlineStr = grup?.deadline
        ? (() => {
            const d = grup.deadline.toDate();
            const gun = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
            if (gun < 0) return 'Süre Doldu';
            if (gun === 0) return 'Bugün Son Gün';
            return `${gun} gün kaldı`;
        })()
        : null;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['bottom', 'left', 'right']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* GRUP GENEL DURUM */}
                <View style={[styles.ozet, {
                    backgroundColor: hepsiBitti ? '#1B4332' : (isDarkMode ? '#1A1A2E' : '#F0EFFF'),
                    marginHorizontal: 16, marginTop: 16,
                }]}>
                    {hepsiBitti && (
                        <View style={styles.kutlamaRow}>
                            <MaterialCommunityIcons name="party-popper" size={28} color="#FFD700" />
                            <Text style={styles.kutlamaText}>Grup Hedefini Tamamladı!</Text>
                            <MaterialCommunityIcons name="party-popper" size={28} color="#FFD700" />
                        </View>
                    )}

                    <View style={styles.ozetStat}>
                        <View style={styles.statBlok}>
                            <Text style={[styles.statSayi, { color: hepsiBitti ? '#A7F3D0' : '#8E94F2' }]}>
                                {toplamTamamlanan.toLocaleString()}
                            </Text>
                            <Text style={[styles.statEtiket, { color: hepsiBitti ? '#6EE7B7' : theme.subText }]}>
                                Toplam Çekilen
                            </Text>
                        </View>
                        <View style={[styles.statAyrac, { backgroundColor: hepsiBitti ? '#2D6A4F' : theme.border }]} />
                        <View style={styles.statBlok}>
                            <Text style={[styles.statSayi, { color: hepsiBitti ? '#A7F3D0' : '#8E94F2' }]}>
                                {toplamHedef.toLocaleString()}
                            </Text>
                            <Text style={[styles.statEtiket, { color: hepsiBitti ? '#6EE7B7' : theme.subText }]}>
                                Toplam Hedef
                            </Text>
                        </View>
                        <View style={[styles.statAyrac, { backgroundColor: hepsiBitti ? '#2D6A4F' : theme.border }]} />
                        <View style={styles.statBlok}>
                            <Text style={[styles.statSayi, { color: hepsiBitti ? '#FFD700' : '#8E94F2' }]}>
                                {genelPct}%
                            </Text>
                            <Text style={[styles.statEtiket, { color: hepsiBitti ? '#6EE7B7' : theme.subText }]}>
                                Tamamlandı
                            </Text>
                        </View>
                    </View>

                    <View style={{ marginTop: 16, marginHorizontal: 4 }}>
                        <ProgressBar
                            value={toplamTamamlanan}
                            max={toplamHedef}
                            color={hepsiBitti ? '#34D399' : '#8E94F2'}
                            animated
                        />
                    </View>

                    <View style={styles.ozetAlt}>
                        <View style={styles.ozetAltItem}>
                            <MaterialCommunityIcons
                                name="account-group"
                                size={14}
                                color={hepsiBitti ? '#6EE7B7' : theme.subText}
                            />
                            <Text style={[styles.ozetAltText, { color: hepsiBitti ? '#6EE7B7' : theme.subText }]}>
                                {tamamlananSayisi}/{uyeler.length} kişi tamamladı
                            </Text>
                        </View>
                        {deadlineStr && (
                            <View style={styles.ozetAltItem}>
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={14}
                                    color={deadlineStr === 'Süre Doldu' ? '#DC2626' : (hepsiBitti ? '#6EE7B7' : theme.subText)}
                                />
                                <Text style={[styles.ozetAltText, {
                                    color: deadlineStr === 'Süre Doldu' ? '#DC2626' : (hepsiBitti ? '#6EE7B7' : theme.subText)
                                }]}>
                                    {deadlineStr}
                                </Text>
                            </View>
                        )}
                    </View>

                    {hepsiBitti && (
                        <Text style={styles.kabulText}>Allah hepinizden kabul etsin</Text>
                    )}
                </View>

                {/* ÜYELER */}
                <View style={styles.uyelerBaslik}>
                    <Text style={[styles.uyelerTitle, { color: theme.text }]}>Üye İlerlemeleri</Text>
                    <Text style={[styles.uyelerAlt, { color: theme.subText }]}>
                        {uyeler.length} üye
                    </Text>
                </View>

                {/* AKSIYONLAR */}
                <View style={[styles.aksiyonRow, { marginHorizontal: 16, marginBottom: 12 }]}>
                    {/* Kodu Paylaş */}
                    {grup?.davetKodu && (grup?.mevcutUye || 0) < (grup?.maxUye || 0) && grup?.durum !== 'tamamlandi' && (
                        <TouchableOpacity
                            style={[styles.aksiyonBtn, { backgroundColor: isDarkMode ? '#1A1A2E' : '#F0EFFF' }]}
                            onPress={kodPaylas}
                        >
                            <MaterialCommunityIcons name="share-variant" size={15} color="#8E94F2" />
                            <Text style={[styles.aksiyonBtnText, { color: '#8E94F2' }]}>
                                Paylaş ({grup.davetKodu})
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Yeni Tur — hepsi tamamladıysa ve kurucu ise */}
                    {hepsiBitti && isKurucu && (
                        <TouchableOpacity
                            style={[styles.aksiyonBtn, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}
                            onPress={() => setYeniTurModal(true)}
                        >
                            <MaterialCommunityIcons name="restart" size={15} color="#2D6A4F" />
                            <Text style={[styles.aksiyonBtnText, { color: '#2D6A4F' }]}>Yeni Tur</Text>
                        </TouchableOpacity>
                    )}

                    {/* Gruptan Çık — üye ise */}
                    {!isKurucu && (
                        <TouchableOpacity
                            style={[styles.aksiyonBtn, { borderWidth: 1, borderColor: theme.border }]}
                            onPress={handleGruptenCik}
                            disabled={yukleniyor}
                        >
                            <MaterialCommunityIcons name="exit-to-app" size={15} color={theme.subText} />
                            <Text style={[styles.aksiyonBtnText, { color: theme.subText }]}>Çık</Text>
                        </TouchableOpacity>
                    )}

                    {/* Grubu Sil — sadece kurucu */}
                    {isKurucu && (
                        <TouchableOpacity
                            style={[styles.aksiyonBtn, { borderWidth: 1, borderColor: '#DC2626' }]}
                            onPress={handleGrupSil}
                            disabled={yukleniyor}
                        >
                            {yukleniyor
                                ? <ActivityIndicator size="small" color="#DC2626" />
                                : <>
                                    <MaterialCommunityIcons name="delete-outline" size={15} color="#DC2626" />
                                    <Text style={[styles.aksiyonBtnText, { color: '#DC2626' }]}>Grubu Sil</Text>
                                </>
                            }
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                    {uyeler.map((uye) => {
                        const isOwn = uye.userId === userId;
                        return (
                            <UyeKart
                                key={uye.id}
                                uye={uye}
                                theme={theme}
                                isDarkMode={isDarkMode}
                                isCurrentUser={isOwn}
                                onPress={isOwn && benimIstek ? handleBenimKart : undefined}
                            />
                        );
                    })}
                </View>
            </ScrollView>

            {/* YENİ TUR MODAL */}
            <Modal
                visible={yeniTurModal}
                transparent
                animationType="slide"
                onRequestClose={() => setYeniTurModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Yeni Tur Başlat</Text>
                            <TouchableOpacity onPress={() => setYeniTurModal(false)}>
                                <MaterialCommunityIcons name="close" size={28} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalAlt, { color: theme.subText }]}>
                            Tüm üyeler için kişi başına yeni zikir miktarını girin.
                        </Text>
                        <TextInput
                            style={[styles.modalInput, {
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5',
                                color: theme.text, borderColor: theme.border
                            }]}
                            value={yeniMiktar}
                            onChangeText={setYeniMiktar}
                            keyboardType="number-pad"
                            placeholder={`Ör. ${grup?.kisiBasinaMiktar || 100}`}
                            placeholderTextColor={theme.subText}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: '#2D6A4F' }]}
                            onPress={handleYeniTur}
                            disabled={yukleniyor}
                        >
                            {yukleniyor
                                ? <ActivityIndicator color="#FFF" />
                                : <Text style={styles.modalBtnText}>Yeni Turu Başlat</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    ozet: {
        borderRadius: 24, padding: 20,
    },
    kutlamaRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, marginBottom: 16,
    },
    kutlamaText: {
        color: '#FFD700', fontSize: 16, fontWeight: '900', textAlign: 'center',
    },
    ozetStat: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    },
    statBlok: { alignItems: 'center', flex: 1 },
    statSayi: { fontSize: 22, fontWeight: '900' },
    statEtiket: { fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
    statAyrac: { width: 1, height: 36, marginHorizontal: 4 },
    ozetAlt: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginTop: 12, flexWrap: 'wrap', gap: 8,
    },
    ozetAltItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    ozetAltText: { fontSize: 12, fontWeight: '600' },
    kabulText: {
        color: '#A7F3D0', fontSize: 14, fontWeight: '800',
        textAlign: 'center', marginTop: 14,
    },
    uyelerBaslik: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginTop: 20, marginBottom: 10,
    },
    uyelerTitle: { fontSize: 17, fontWeight: '900' },
    uyelerAlt: { fontSize: 12, fontWeight: '600' },
    aksiyonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    aksiyonBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14,
    },
    aksiyonBtnText: { fontSize: 13, fontWeight: '800' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalAlt: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
    modalInput: {
        height: 56, borderRadius: 14, borderWidth: 1.5,
        paddingHorizontal: 16, fontSize: 20, fontWeight: '800', marginBottom: 16,
    },
    modalBtn: {
        height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    },
    modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
