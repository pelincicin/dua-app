import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useZikirZinciri } from '../context/ZikirZinciriContext';
import {
    bekleyenTalebiKabul,
    bekleyenTalebiReddet,
    davetKoduGetir,
    grupDavetiKabul,
    istekSil,
    tekliDavetiKabul
} from '../services/zikirZinciriService';

const { width } = Dimensions.get('window');

function ProgressBar({ value, max, color }) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    return (
        <View style={pb.bg}>
            <Animated.View style={[pb.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
    );
}
const pb = StyleSheet.create({
    bg: { height: 7, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
    fill: { height: '100%', borderRadius: 4 },
});

function BekleyenKart({ istek, theme, isDarkMode, onKabul, onReddet }) {
    const [yukleniyor, setYukleniyor] = useState(false);

    const kabul = async () => {
        setYukleniyor(true);
        try {
            await onKabul(istek.id);
        } finally {
            setYukleniyor(false);
        }
    };

    const reddet = () => {
        Alert.alert(
            'Reddet',
            `${istek.fromName} adlı kişinin ${istek.miktar?.toLocaleString()} zikirlik talebini reddedeceksiniz.`,
            [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Reddet', style: 'destructive', onPress: () => onReddet(istek.id) },
            ]
        );
    };

    return (
        <View style={[styles.kart, {
            backgroundColor: isDarkMode ? '#2D2000' : '#FFFBEB',
            borderColor: '#D97706',
        }]}>
            <View style={styles.kartUst}>
                <View style={styles.kartSol}>
                    <View style={[styles.tipPill, { backgroundColor: '#D97706' }]}>
                        <MaterialCommunityIcons name="account" size={11} color="#FFF" />
                        <Text style={styles.tipText}>BEKLEYEN</Text>
                    </View>
                    <Text style={[styles.kartIsim, { color: theme.text }]} numberOfLines={1}>
                        {istek.fromName}
                    </Text>
                </View>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#D97706" />
            </View>

            <Text style={[styles.bekleyenBilgi, { color: theme.subText }]}>
                {istek.miktar?.toLocaleString()} zikir talep ediyor
            </Text>

            <View style={styles.bekleyenBtnRow}>
                <TouchableOpacity
                    style={[styles.reddetBtn, { borderColor: theme.border }]}
                    onPress={reddet}
                    disabled={yukleniyor}
                >
                    <MaterialCommunityIcons name="close" size={16} color="#DC2626" />
                    <Text style={styles.reddetText}>Reddet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.kabulBtn}
                    onPress={kabul}
                    disabled={yukleniyor}
                >
                    {yukleniyor
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <>
                            <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                            <Text style={styles.kabulText}>Kabul Et</Text>
                        </>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

function IstekKart({ istek, theme, isDarkMode, onIcinCek }) {
    const pct = istek.miktar > 0 ? Math.round((istek.tamamlanan / istek.miktar) * 100) : 0;
    const tamamlandi = istek.durum === 'tamamlandi';

    const deadlineStr = istek.deadline
        ? (() => {
            const d = istek.deadline.toDate();
            const gun = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
            if (gun < 0) return 'Süre Doldu';
            if (gun === 0) return 'Bugün Son Gün';
            return `${gun} Gün Kaldı`;
        })()
        : null;

    return (
        <View style={[styles.kart, {
            backgroundColor: tamamlandi ? (isDarkMode ? '#0D2B1A' : '#E8F5EF') : theme.card,
            borderColor: tamamlandi ? '#2D6A4F' : theme.border,
        }]}>
            <View style={styles.kartUst}>
                <View style={styles.kartSol}>
                    <View style={[styles.tipPill, { backgroundColor: istek.tip === 'grup' ? '#8E94F2' : '#2D6A4F' }]}>
                        <MaterialCommunityIcons
                            name={istek.tip === 'grup' ? 'account-group' : 'account'}
                            size={11} color="#FFF"
                        />
                        <Text style={styles.tipText}>{istek.tip === 'grup' ? 'GRUP' : 'TEKLİ'}</Text>
                    </View>
                    <Text style={[styles.kartIsim, { color: theme.text }]} numberOfLines={1}>
                        {istek.fromName === 'Grup' ? 'Grup Zikiri' : istek.fromName}
                    </Text>
                </View>
                {deadlineStr && !tamamlandi && (
                    <Text style={[styles.deadlineText, {
                        color: deadlineStr === 'Süre Doldu' ? '#DC2626' : theme.subText
                    }]}>{deadlineStr}</Text>
                )}
                {tamamlandi && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2D6A4F" />
                )}
            </View>

            <View style={styles.kartMiktar}>
                <Text style={[styles.tamamlananText, { color: tamamlandi ? '#2D6A4F' : theme.active }]}>
                    {istek.tamamlanan.toLocaleString()}
                </Text>
                <Text style={[styles.bolText, { color: theme.subText }]}> / </Text>
                <Text style={[styles.hedefText, { color: theme.subText }]}>
                    {istek.miktar.toLocaleString()} zikir
                </Text>
                <Text style={[styles.pctText, { color: tamamlandi ? '#2D6A4F' : theme.active }]}>
                    {pct}%
                </Text>
            </View>

            <ProgressBar value={istek.tamamlanan} max={istek.miktar} color={tamamlandi ? '#2D6A4F' : '#2D6A4F'} />

            {!tamamlandi && onIcinCek && (
                <TouchableOpacity
                    style={[styles.icinCekBtn, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}
                    onPress={() => onIcinCek(istek)}
                >
                    <MaterialCommunityIcons name="hands-pray" size={16} color="#2D6A4F" />
                    <Text style={[styles.icinCekText, { color: '#2D6A4F' }]}>
                        Zikirmatik&apos;te Çek
                    </Text>
                </TouchableOpacity>
            )}

            {tamamlandi && (
                <Text style={styles.tamamText}>Allah kabul etsin</Text>
            )}
        </View>
    );
}

function GonderdiğimKart({ istek, theme, isDarkMode, onSil }) {
    const pct = istek.miktar > 0 ? Math.round((istek.tamamlanan / istek.miktar) * 100) : 0;
    const tamamlandi = istek.durum === 'tamamlandi';
    const beklemede = istek.durum === 'beklemede';

    const handleSil = () => {
        Alert.alert(
            'Talebi İptal Et',
            `${istek.toName || 'Alıcı'} adlı kişiye gönderilen talep iptal edilecek. Emin misiniz?`,
            [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'İptal Et', style: 'destructive', onPress: () => onSil(istek.id) },
            ]
        );
    };

    return (
        <View style={[styles.kart, {
            backgroundColor: theme.card,
            borderColor: tamamlandi ? '#2D6A4F' : beklemede ? '#D97706' : theme.border,
        }]}>
            <View style={styles.kartUst}>
                <View style={styles.kartSol}>
                    <MaterialCommunityIcons
                        name={tamamlandi ? 'check-decagram' : beklemede ? 'clock-alert-outline' : 'clock-outline'}
                        size={18}
                        color={tamamlandi ? '#2D6A4F' : beklemede ? '#D97706' : theme.subText}
                    />
                    <Text style={[styles.kartIsim, { color: theme.text }]} numberOfLines={1}>
                        {istek.toId === istek.fromId
                            ? 'Kendinize'
                            : (istek.toName || 'Bekliyor...')}
                    </Text>
                </View>
                {beklemede && (
                    <View style={[styles.tipPill, { backgroundColor: '#D97706' }]}>
                        <Text style={styles.tipText}>ONAY BEKL.</Text>
                    </View>
                )}
                {!beklemede && (
                    <Text style={[styles.hedefText, { color: theme.subText }]}>
                        {istek.miktar.toLocaleString()} zikir
                    </Text>
                )}
            </View>

            {!beklemede && (
                <>
                    <View style={styles.kartMiktar}>
                        <Text style={[styles.tamamlananText, { color: tamamlandi ? '#2D6A4F' : theme.active }]}>
                            {istek.tamamlanan.toLocaleString()}
                        </Text>
                        <Text style={[styles.pctText, { color: theme.subText }]}> {pct}%</Text>
                    </View>
                    <ProgressBar value={istek.tamamlanan} max={istek.miktar} color={tamamlandi ? '#2D6A4F' : '#8E94F2'} />
                </>
            )}

            {beklemede && (
                <Text style={[styles.bekleyenBilgi, { color: theme.subText }]}>
                    {istek.miktar?.toLocaleString()} zikir · yanıt bekleniyor
                </Text>
            )}

            {tamamlandi && (
                <Text style={[styles.tamamText, { color: '#2D6A4F' }]}>
                    Tamamlandı — Allah kabul etsin
                </Text>
            )}

            {beklemede && onSil && (
                <TouchableOpacity style={styles.iptalBtn} onPress={handleSil}>
                    <MaterialCommunityIcons name="close-circle-outline" size={14} color="#DC2626" />
                    <Text style={styles.iptalText}>İptal Et</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function ZikirZinciri({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const { userId, displayName, pushToken } = useUser();
    const { gelenIstekler, gonderdiğimIstekler, aktifGruplar, setAktifIcin } = useZikirZinciri();

    const [aktifTab, setAktifTab] = useState('gelen');
    const [kodModalAcik, setKodModalAcik] = useState(false);
    const [kodInput, setKodInput] = useState('');
    const [kodYukleniyor, setKodYukleniyor] = useState(false);

    const bekleyenIstekler = gelenIstekler.filter(r => r.durum === 'beklemede');
    const aktifIstekler = gelenIstekler.filter(r => r.durum !== 'beklemede');

    const handleKabul = async (requestId) => {
        try {
            await bekleyenTalebiKabul(requestId);
            Alert.alert('Kabul Edildi!', 'Zikir talebi kabul edildi. Zikirmatik\'te çekmeye başlayabilirsin.');
        } catch (e) {
            Alert.alert('Hata', 'Bir sorun oluştu.');
        }
    };

    const handleReddet = async (requestId) => {
        try {
            await bekleyenTalebiReddet(requestId);
        } catch (e) {
            Alert.alert('Hata', 'Bir sorun oluştu.');
        }
    };

    const kodKontrolEt = async () => {
        if (kodInput.trim().length !== 6) {
            Alert.alert('Hata', 'Davet kodu 6 karakter olmalıdır.');
            return;
        }
        setKodYukleniyor(true);
        try {
            const davet = await davetKoduGetir(kodInput.trim());
            if (!davet) {
                Alert.alert('Geçersiz Kod', 'Bu kod geçersiz, süresi dolmuş veya daha önce kullanılmış.');
                return;
            }

            if (davet.gonderen.id === userId) {
                Alert.alert('Hata', 'Kendi davet kodunuzu kullanamazsınız.');
                return;
            }

            const miktar = davet.miktar?.toLocaleString() || '?';
            const gonderen = davet.gonderen.isim;

            Alert.alert(
                'Zikir Talebi',
                `${gonderen} senden ${miktar} zikir talep ediyor.\n\nKabul ediyor musun?`,
                [
                    { text: 'Reddet', style: 'cancel' },
                    {
                        text: 'Kabul Et',
                        style: 'default',
                        onPress: async () => {
                            try {
                                if (davet.tip === 'grup') {
                                    await grupDavetiKabul({
                                        davet,
                                        toId: userId,
                                        toName: displayName,
                                        toPushToken: pushToken || '',
                                    });
                                } else {
                                    await tekliDavetiKabul({
                                        davet,
                                        toId: userId,
                                        toName: displayName,
                                        toPushToken: pushToken || '',
                                    });
                                }
                                setKodModalAcik(false);
                                setKodInput('');
                                Alert.alert('Kabul Edildi!', 'Zikir talebi kabul edildi. Zikirmatik\'te çekmeye başlayabilirsin.');
                            } catch (e) {
                                Alert.alert('Hata', e.message || 'Bir sorun oluştu.');
                            }
                        }
                    }
                ]
            );
        } catch (e) {
            Alert.alert('Hata', 'Kod kontrol edilemedi. İnternet bağlantınızı kontrol edin.');
        } finally {
            setKodYukleniyor(false);
        }
    };

    const handleSil = async (requestId) => {
        try {
            await istekSil(requestId);
        } catch (e) {
            Alert.alert('Hata', 'Talep silinemedi.');
        }
    };

    const icinCekBasildi = (istek) => {
        setAktifIcin(istek);
        navigation.navigate('Zikirmatik');
    };

    const gelenListeData = [
        ...bekleyenIstekler.map(r => ({ ...r, _tip: 'bekleyen' })),
        ...aktifIstekler.map(r => ({ ...r, _tip: 'aktif' })),
    ];

    const renderIcerik = () => {
        if (aktifTab === 'gelen') {
            return (
                <FlatList
                    data={gelenListeData}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.liste}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.bos}>
                            <MaterialCommunityIcons name="link-variant-off" size={56} color={theme.border} />
                            <Text style={[styles.bosText, { color: theme.subText }]}>
                                Henüz gelen zikir talebi yok.
                            </Text>
                            <Text style={[styles.bosAlt, { color: theme.subText }]}>
                                Bir davet kodu girerek başla
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        if (item._tip === 'bekleyen') {
                            return (
                                <BekleyenKart
                                    istek={item}
                                    theme={theme}
                                    isDarkMode={isDarkMode}
                                    onKabul={handleKabul}
                                    onReddet={handleReddet}
                                />
                            );
                        }
                        return (
                            <IstekKart
                                istek={item}
                                theme={theme}
                                isDarkMode={isDarkMode}
                                onIcinCek={item.durum === 'aktif' ? icinCekBasildi : null}
                            />
                        );
                    }}
                />
            );
        }

        if (aktifTab === 'gonderilen') {
            return (
                <FlatList
                    data={gonderdiğimIstekler}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.liste}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.bos}>
                            <MaterialCommunityIcons name="send-clock-outline" size={56} color={theme.border} />
                            <Text style={[styles.bosText, { color: theme.subText }]}>
                                Henüz zikir talebi göndermediniz.
                            </Text>
                            <TouchableOpacity
                                style={[styles.yeniBtn, { backgroundColor: theme.active }]}
                                onPress={() => navigation.navigate('YeniZincir')}
                            >
                                <Text style={styles.yeniBtnText}>Yeni Talep Oluştur</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <GonderdiğimKart
                            istek={item}
                            theme={theme}
                            isDarkMode={isDarkMode}
                            onSil={handleSil}
                        />
                    )}
                />
            );
        }

        const grupKodPaylas = async (grup) => {
            if (!grup.davetKodu) return;
            const mevcutUye = grup.mevcutUye || 1;
            const bosyer = (grup.maxUye || 0) - mevcutUye;
            const mesaj =
                `Zikir Zinciri grubuna davet edildiniz!\n\n` +
                `Grup: ${grup.baslik}\n` +
                `${grup.kisiBasinaMiktar?.toLocaleString()} zikir/kişi · ${mevcutUye}/${grup.maxUye} üye\n\n` +
                `Davet Kodu: *${grup.davetKodu}*\n\n` +
                `"Huzur: Zikirmatik ve Dualar" uygulamasını indir, Zikir Zinciri sekmesinde "Kod Gir" butonuna bas.\n\n` +
                `Android: https://play.google.com/store/apps/details?id=com.pelincicin.huzurzikirmatikvedualar`;
            await Share.share({ message: mesaj });
        };

        return (
            <FlatList
                data={aktifGruplar}
                keyExtractor={i => i.id}
                contentContainerStyle={styles.liste}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.bos}>
                        <MaterialCommunityIcons name="account-group-outline" size={56} color={theme.border} />
                        <Text style={[styles.bosText, { color: theme.subText }]}>Aktif grup yok.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.kart, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigation.navigate('GrupDetay', { groupId: item.id })}
                        activeOpacity={0.85}
                    >
                        <View style={styles.kartUst}>
                            <Text style={[styles.kartIsim, { color: theme.text }]}>{item.baslik}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.subText} />
                        </View>
                        <Text style={[styles.kartAlt, { color: theme.subText }]}>
                            {item.mevcutUye}/{item.maxUye} kişi · {item.toplamHedef?.toLocaleString()} zikir
                        </Text>
                        <ProgressBar
                            value={gelenIstekler.filter(r => r.groupId === item.id).reduce((s, r) => s + r.tamamlanan, 0)}
                            max={item.toplamHedef}
                            color="#8E94F2"
                        />
                        {item.davetKodu && item.mevcutUye < item.maxUye && (
                            <TouchableOpacity
                                style={[styles.kodPaylasBtn, { backgroundColor: isDarkMode ? '#1A1A2E' : '#F0EFFF' }]}
                                onPress={(e) => { e.stopPropagation?.(); grupKodPaylas(item); }}
                            >
                                <MaterialCommunityIcons name="share-variant" size={14} color="#8E94F2" />
                                <Text style={styles.kodPaylasBtnText}>Kodu Paylaş ({item.davetKodu})</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                )}
            />
        );
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>

            {/* HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerSub, { color: theme.subText }]}>ZİKİR</Text>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Zinciri</Text>
                </View>
                <View style={styles.headerBtns}>
                    <TouchableOpacity
                        style={[styles.headerBtn, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}
                        onPress={() => setKodModalAcik(true)}
                    >
                        <MaterialCommunityIcons name="key-outline" size={18} color={theme.active} />
                        <Text style={[styles.headerBtnText, { color: theme.active }]}>Kod Gir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerBtn, { backgroundColor: theme.active }]}
                        onPress={() => navigation.navigate('YeniZincir')}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                        <Text style={[styles.headerBtnText, { color: '#FFF' }]}>Yeni</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* TABS */}
            <View style={[styles.tabRow, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F0F0F0' }]}>
                {[
                    { key: 'gelen', label: 'Benden İstenen', icon: 'arrow-down-circle-outline' },
                    { key: 'gonderilen', label: 'Gönderdiğim', icon: 'arrow-up-circle-outline' },
                    { key: 'gruplar', label: 'Gruplar', icon: 'account-group-outline' },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, aktifTab === tab.key && { backgroundColor: theme.active }]}
                        onPress={() => setAktifTab(tab.key)}
                    >
                        <MaterialCommunityIcons
                            name={tab.icon}
                            size={14}
                            color={aktifTab === tab.key ? '#FFF' : theme.subText}
                        />
                        <Text style={[
                            styles.tabText,
                            { color: aktifTab === tab.key ? '#FFF' : theme.subText }
                        ]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* İÇERİK */}
            {renderIcerik()}

            {/* KOD GİR MODAL */}
            <Modal
                visible={kodModalAcik}
                transparent
                animationType="slide"
                onRequestClose={() => setKodModalAcik(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Davet Kodu Gir</Text>
                            <TouchableOpacity onPress={() => { setKodModalAcik(false); setKodInput(''); }}>
                                <MaterialCommunityIcons name="close" size={28} color={theme.subText} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSub, { color: theme.subText }]}>
                            Arkadaşının paylaştığı 6 haneli kodu girin
                        </Text>

                        <TextInput
                            style={[styles.kodInput, {
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5',
                                color: theme.text,
                                borderColor: theme.border
                            }]}
                            value={kodInput}
                            onChangeText={t => setKodInput(t.toUpperCase())}
                            placeholder="ABC123"
                            placeholderTextColor={theme.subText}
                            maxLength={6}
                            autoCapitalize="characters"
                            autoFocus
                            letterSpacing={8}
                        />

                        <TouchableOpacity
                            style={[styles.kodBtn, { backgroundColor: theme.active }]}
                            onPress={kodKontrolEt}
                            disabled={kodYukleniyor}
                        >
                            {kodYukleniyor
                                ? <ActivityIndicator color="#FFF" />
                                : <Text style={styles.kodBtnText}>Kodu Kontrol Et</Text>
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
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8
    },
    headerSub: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    headerTitle: { fontSize: 30, fontWeight: '900' },
    headerBtns: { flexDirection: 'row', gap: 8 },
    headerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14
    },
    headerBtnText: { fontSize: 13, fontWeight: '800' },

    tabRow: {
        flexDirection: 'row', marginHorizontal: 16, borderRadius: 14,
        padding: 4, marginBottom: 12
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: 8, borderRadius: 10
    },
    tabText: { fontSize: 10, fontWeight: '800' },

    liste: { paddingHorizontal: 16, paddingBottom: 40 },

    kart: {
        borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12, elevation: 2
    },
    kartUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    kartSol: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    tipPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8
    },
    tipText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    kartIsim: { fontSize: 16, fontWeight: '800', flex: 1 },
    kartAlt: { fontSize: 12, marginTop: 4 },
    kartMiktar: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
    tamamlananText: { fontSize: 22, fontWeight: '900' },
    bolText: { fontSize: 16 },
    hedefText: { fontSize: 13, fontWeight: '600' },
    pctText: { marginLeft: 'auto', fontSize: 14, fontWeight: '900' },
    deadlineText: { fontSize: 11, fontWeight: '700' },
    icinCekBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 12
    },
    icinCekText: { fontSize: 13, fontWeight: '800' },
    tamamText: { color: '#2D6A4F', fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },

    bekleyenBilgi: { fontSize: 13, marginTop: 2, marginBottom: 12 },
    bekleyenBtnRow: { flexDirection: 'row', gap: 10 },
    reddetBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5
    },
    reddetText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
    kabulBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#2D6A4F'
    },
    kabulText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

    bos: { alignItems: 'center', paddingTop: 60, gap: 12 },
    bosText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
    bosAlt: { fontSize: 13, textAlign: 'center' },
    yeniBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
    yeniBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 28 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSub: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
    kodInput: {
        height: 60, borderRadius: 16, borderWidth: 1.5,
        textAlign: 'center', fontSize: 28, fontWeight: '900',
        marginBottom: 16, letterSpacing: 8
    },
    kodBtn: {
        height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4
    },
    kodBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },

    iptalBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, marginTop: 10, paddingVertical: 6,
    },
    iptalText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },

    kodPaylasBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 10, paddingVertical: 8, borderRadius: 10,
    },
    kodPaylasBtnText: { color: '#8E94F2', fontSize: 12, fontWeight: '800' },
});
