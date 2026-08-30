import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
    arkadasLastSeenGetir,
    dogrudanTalepOlustur,
    grupTalepOlustur,
    tekliTalepOlustur
} from '../services/zikirZinciriService';

const { width } = Dimensions.get('window');

const MIKTAR_SECENEKLERI = [33, 100, 200, 500, 1000, 3000];
const SURE_SECENEKLERI = [
    { label: 'Süre Yok', value: null },
    { label: '1 Gün', value: 1 },
    { label: '3 Gün', value: 3 },
    { label: '7 Gün', value: 7 },
    { label: '30 Gün', value: 30 },
];

export default function YeniZincir({ navigation }) {
    const { theme, isDarkMode } = useTheme();
    const { userId, displayName, pushToken } = useUser();
    const { arkadaslar } = useZikirZinciri();

    const [tip, setTip] = useState('tekli'); // tekli | grup
    const [grupAdi, setGrupAdi] = useState('');
    const [miktar, setMiktar] = useState(500);
    const [ozelMiktar, setOzelMiktar] = useState('');
    const [ozelMiktarAktif, setOzelMiktarAktif] = useState(false);
    const [kisiSayisi, setKisiSayisi] = useState(3);
    const [deadlineDays, setDeadlineDays] = useState(null);
    const [loading, setLoading] = useState(false);
    const [olusturulanKod, setOlusturulanKod] = useState(null);
    const [dogrudan, setDogrudan] = useState(false); // direct request, no code

    const [arkadasModalAcik, setArkadasModalAcik] = useState(false);
    const [secilenArkadas, setSecilenArkadas] = useState(null);
    const [arkadasLastSeen, setArkadasLastSeen] = useState({});

    useEffect(() => {
        if (!arkadasModalAcik || arkadaslar.length === 0) return;
        arkadasLastSeenGetir(arkadaslar.map(a => a.id)).then(setArkadasLastSeen);
    }, [arkadasModalAcik]);

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const gercekMiktar = ozelMiktarAktif
        ? (parseInt(ozelMiktar) || 0)
        : miktar;

    const toplamMiktar = tip === 'grup' ? gercekMiktar * kisiSayisi : gercekMiktar;

    const olustur = async () => {
        if (gercekMiktar < 1) {
            Alert.alert('Hata', 'Geçerli bir miktar girin.');
            return;
        }
        if (gercekMiktar > 100000) {
            Alert.alert('Hata', 'Miktar en fazla 100.000 olabilir.');
            return;
        }
        if (tip === 'grup' && (kisiSayisi < 2 || kisiSayisi > 10)) {
            Alert.alert('Hata', 'Grup 2-10 kişi arasında olmalıdır.');
            return;
        }

        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();

        setLoading(true);
        try {
            // Arkadaşa doğrudan gönder
            if (secilenArkadas && tip === 'tekli') {
                await dogrudanTalepOlustur({
                    fromId: userId,
                    fromName: displayName,
                    fromPushToken: pushToken,
                    toId: secilenArkadas.id,
                    toName: secilenArkadas.displayName,
                    toPushToken: secilenArkadas.pushToken || '',
                    amount: gercekMiktar,
                    deadlineDays,
                });
                setDogrudan(true);
                setOlusturulanKod('__dogrudan__');
                return;
            }

            let kod;
            if (tip === 'tekli') {
                kod = await tekliTalepOlustur({
                    fromId: userId,
                    fromName: displayName,
                    fromPushToken: pushToken,
                    amount: gercekMiktar,
                    deadlineDays,
                });
            } else {
                const result = await grupTalepOlustur({
                    creatorId: userId,
                    creatorName: displayName,
                    creatorPushToken: pushToken,
                    kisiSayisi,
                    kisiBasinaMiktar: gercekMiktar,
                    deadlineDays,
                    grupAdi: grupAdi.trim() || undefined,
                });
                kod = result.kod;
            }
            setOlusturulanKod(kod);
        } catch (e) {
            Alert.alert('Hata', 'Talep oluşturulamadı. İnternet bağlantınızı kontrol edin.');
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const paylas = async () => {
        const sureBilgi = deadlineDays ? `\nSüre: ${deadlineDays} gün` : '';
        const grupBilgi = tip === 'grup'
            ? `\nGrup: ${kisiSayisi} kişi × ${gercekMiktar.toLocaleString()} = ${toplamMiktar.toLocaleString()} zikir`
            : `\n${gercekMiktar.toLocaleString()} zikir talebi`;

        const mesaj =
            `Selamün Aleyküm,\n\n` +
            `${displayName} senden zikir talep ediyor.\n` +
            `${grupBilgi}${sureBilgi}\n\n` +
            `Davet Kodu: *${olusturulanKod}*\n\n` +
            `"Huzur: Zikirmatik ve Dualar" uygulamasını indir, Zikir Zinciri sekmesinde "Kod Gir" butonuna bas ve bu kodu gir.\n\n` +
            `Android: https://play.google.com/store/apps/details?id=com.pelincicin.huzurzikirmatikvedualar`;

        await Share.share({ message: mesaj });
    };

    // Doğrudan gönderim başarı ekranı
    if (olusturulanKod && dogrudan) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
                <ScrollView contentContainerStyle={styles.basariContent}>
                    <View style={[styles.basariIkon, { backgroundColor: isDarkMode ? '#1B4332' : '#2D6A4F' }]}>
                        <MaterialCommunityIcons name="send-check-outline" size={52} color="#FFF" />
                    </View>
                    <Text style={[styles.basariBaslik, { color: theme.text }]}>Talep Gönderildi!</Text>
                    <Text style={[styles.basariAlt, { color: theme.subText }]}>
                        {secilenArkadas?.displayName} adlı arkadaşına {gercekMiktar.toLocaleString()} zikirlik talep gönderildi.
                        Kabul ettiğinde bildirim alacaksın.
                    </Text>

                    <View style={[styles.ozet, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.ozetSatir}>
                            <Text style={[styles.ozetLabel, { color: theme.subText }]}>Alıcı</Text>
                            <Text style={[styles.ozetValue, { color: theme.text }]}>{secilenArkadas?.displayName}</Text>
                        </View>
                        <View style={[styles.ozetCizgi, { backgroundColor: theme.border }]} />
                        <View style={styles.ozetSatir}>
                            <Text style={[styles.ozetLabel, { color: theme.subText }]}>Miktar</Text>
                            <Text style={[styles.ozetValue, { color: theme.text }]}>{gercekMiktar.toLocaleString()} zikir</Text>
                        </View>
                        {deadlineDays && <>
                            <View style={[styles.ozetCizgi, { backgroundColor: theme.border }]} />
                            <View style={styles.ozetSatir}>
                                <Text style={[styles.ozetLabel, { color: theme.subText }]}>Süre</Text>
                                <Text style={[styles.ozetValue, { color: theme.text }]}>{deadlineDays} gün</Text>
                            </View>
                        </>}
                    </View>

                    <TouchableOpacity
                        style={[styles.geriBtn, { borderColor: theme.border }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.geriBtnText, { color: theme.text }]}>Zincire Dön</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Normal kod başarı ekranı
    if (olusturulanKod) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
                <ScrollView contentContainerStyle={styles.basariContent}>
                    <View style={[styles.basariIkon, { backgroundColor: isDarkMode ? '#1B4332' : '#2D6A4F' }]}>
                        <MaterialCommunityIcons name="check-circle-outline" size={52} color="#FFF" />
                    </View>
                    <Text style={[styles.basariBaslik, { color: theme.text }]}>Talep Oluşturuldu!</Text>
                    <Text style={[styles.basariAlt, { color: theme.subText }]}>
                        Bu kodu arkadaşınla paylaş. Kodu girerek talebi kabul edebilir.
                    </Text>

                    <View style={[styles.kodKart, {
                        backgroundColor: isDarkMode ? '#1B4332' : '#2D6A4F'
                    }]}>
                        <Text style={styles.kodLabel}>DAVET KODU</Text>
                        <Text style={styles.kodBuyuk}>{olusturulanKod}</Text>
                        <Text style={styles.kodSure}>{tip === 'grup' ? '14' : '7'} gün geçerli</Text>
                    </View>

                    <View style={[styles.ozet, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.ozetSatir}>
                            <Text style={[styles.ozetLabel, { color: theme.subText }]}>Tip</Text>
                            <Text style={[styles.ozetValue, { color: theme.text }]}>
                                {tip === 'grup' ? `Grup (${kisiSayisi} kişi)` : 'Tekli'}
                            </Text>
                        </View>
                        <View style={[styles.ozetCizgi, { backgroundColor: theme.border }]} />
                        <View style={styles.ozetSatir}>
                            <Text style={[styles.ozetLabel, { color: theme.subText }]}>Miktar</Text>
                            <Text style={[styles.ozetValue, { color: theme.text }]}>
                                {tip === 'grup'
                                    ? `${gercekMiktar.toLocaleString()} × ${kisiSayisi} = ${toplamMiktar.toLocaleString()}`
                                    : `${gercekMiktar.toLocaleString()} zikir`}
                            </Text>
                        </View>
                        {deadlineDays && <>
                            <View style={[styles.ozetCizgi, { backgroundColor: theme.border }]} />
                            <View style={styles.ozetSatir}>
                                <Text style={[styles.ozetLabel, { color: theme.subText }]}>Süre</Text>
                                <Text style={[styles.ozetValue, { color: theme.text }]}>{deadlineDays} gün</Text>
                            </View>
                        </>}
                    </View>

                    <TouchableOpacity style={styles.paylasBtn} onPress={paylas}>
                        <MaterialCommunityIcons name="share-variant" size={22} color="#FFF" />
                        <Text style={styles.paylasBtnText}>Kodu Paylaş</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.geriBtn, { borderColor: theme.border }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.geriBtnText, { color: theme.text }]}>Zincire Dön</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    <Text style={[styles.baslik, { color: theme.text }]}>Yeni Zikir Zinciri</Text>

                    {/* ARKADAŞLARA GÖNDER */}
                    {arkadaslar.length > 0 && (
                        <>
                            <Text style={[styles.bolumBaslik, { color: theme.subText }]}>ARKADAŞIMA GÖNDER</Text>
                            <TouchableOpacity
                                style={[styles.arkadasSecBtn, {
                                    backgroundColor: secilenArkadas
                                        ? (isDarkMode ? '#1B4332' : '#E9F5EE')
                                        : theme.card,
                                    borderColor: secilenArkadas ? theme.active : theme.border,
                                }]}
                                onPress={() => setArkadasModalAcik(true)}
                            >
                                <View style={styles.arkadasSecIc}>
                                    <MaterialCommunityIcons
                                        name={secilenArkadas ? 'account-check' : 'account-plus-outline'}
                                        size={22}
                                        color={secilenArkadas ? theme.active : theme.subText}
                                    />
                                    <Text style={[styles.arkadasSecText, {
                                        color: secilenArkadas ? theme.active : theme.subText
                                    }]}>
                                        {secilenArkadas ? secilenArkadas.displayName : 'Arkadaş seç (opsiyonel)'}
                                    </Text>
                                </View>
                                {secilenArkadas && (
                                    <TouchableOpacity onPress={() => setSecilenArkadas(null)}>
                                        <MaterialCommunityIcons name="close-circle" size={20} color={theme.subText} />
                                    </TouchableOpacity>
                                )}
                                {!secilenArkadas && (
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.subText} />
                                )}
                            </TouchableOpacity>
                            {secilenArkadas && (
                                <Text style={[styles.arkadasBilgi, { color: theme.subText }]}>
                                    Seçili arkadaşa bildirim gider, kod paylaşmanıza gerek kalmaz.
                                </Text>
                            )}
                        </>
                    )}

                    {/* TİP SEÇİMİ */}
                    <Text style={[styles.bolumBaslik, { color: theme.subText }]}>TİP</Text>
                    <View style={[styles.tipRow, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F0F0F0' }]}>
                        {[
                            { k: 'tekli', l: 'Tekli', i: 'account' },
                            { k: 'grup', l: 'Grup', i: 'account-group' }
                        ].map(t => (
                            <TouchableOpacity
                                key={t.k}
                                style={[styles.tipBtn, tip === t.k && { backgroundColor: theme.active }]}
                                onPress={() => { setTip(t.k); if (t.k === 'grup') setSecilenArkadas(null); }}
                            >
                                <MaterialCommunityIcons name={t.i} size={18}
                                    color={tip === t.k ? '#FFF' : theme.subText} />
                                <Text style={[styles.tipBtnText, { color: tip === t.k ? '#FFF' : theme.subText }]}>
                                    {t.l}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* GRUP ADI */}
                    {tip === 'grup' && (
                        <>
                            <Text style={[styles.bolumBaslik, { color: theme.subText }]}>GRUP ADI (OPSİYONEL)</Text>
                            <TextInput
                                style={[styles.ozelInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                value={grupAdi}
                                onChangeText={setGrupAdi}
                                placeholder={`${displayName} Grubu`}
                                placeholderTextColor={theme.subText}
                                maxLength={30}
                                returnKeyType="done"
                            />
                        </>
                    )}

                    {/* GRUP KİŞİ SAYISI */}
                    {tip === 'grup' && (
                        <>
                            <Text style={[styles.bolumBaslik, { color: theme.subText }]}>
                                KİŞİ SAYISI (SİZ DAHİL)
                            </Text>
                            <View style={styles.sayacRow}>
                                <TouchableOpacity
                                    style={[styles.sayacBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                                    onPress={() => setKisiSayisi(Math.max(2, kisiSayisi - 1))}
                                >
                                    <MaterialCommunityIcons name="minus" size={22} color={theme.text} />
                                </TouchableOpacity>
                                <View style={[styles.sayacGoster, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <Text style={[styles.sayacSayi, { color: theme.text }]}>{kisiSayisi}</Text>
                                    <Text style={[styles.sayacAlt, { color: theme.subText }]}>kişi</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.sayacBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                                    onPress={() => setKisiSayisi(Math.min(10, kisiSayisi + 1))}
                                >
                                    <MaterialCommunityIcons name="plus" size={22} color={theme.text} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* MİKTAR SEÇİMİ */}
                    <Text style={[styles.bolumBaslik, { color: theme.subText }]}>
                        {tip === 'grup' ? 'KİŞİ BAŞINA MİKTAR' : 'MİKTAR'}
                    </Text>
                    <View style={styles.miktarGrid}>
                        {MIKTAR_SECENEKLERI.map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[
                                    styles.miktarBtn,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                    !ozelMiktarAktif && miktar === m && { backgroundColor: theme.active, borderColor: theme.active }
                                ]}
                                onPress={() => { setMiktar(m); setOzelMiktarAktif(false); }}
                            >
                                <Text style={[
                                    styles.miktarBtnText,
                                    { color: !ozelMiktarAktif && miktar === m ? '#FFF' : theme.text }
                                ]}>
                                    {m.toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[
                                styles.miktarBtn, styles.miktarBtnGenis,
                                { backgroundColor: theme.card, borderColor: theme.border },
                                ozelMiktarAktif && { backgroundColor: theme.active, borderColor: theme.active }
                            ]}
                            onPress={() => setOzelMiktarAktif(true)}
                        >
                            <Text style={[styles.miktarBtnText, { color: ozelMiktarAktif ? '#FFF' : theme.text }]}>
                                Özel
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {ozelMiktarAktif && (
                        <TextInput
                            style={[styles.ozelInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            value={ozelMiktar}
                            onChangeText={setOzelMiktar}
                            keyboardType="number-pad"
                            placeholder="Örn. 750"
                            placeholderTextColor={theme.subText}
                            autoFocus
                        />
                    )}

                    {/* Toplam bilgi */}
                    {tip === 'grup' && gercekMiktar > 0 && (
                        <View style={[styles.toplamBilgi, { backgroundColor: isDarkMode ? '#1B4332' : '#E9F5EE' }]}>
                            <MaterialCommunityIcons name="sigma" size={16} color={theme.active} />
                            <Text style={[styles.toplamText, { color: theme.active }]}>
                                Toplam: {toplamMiktar.toLocaleString()} zikir
                                ({kisiSayisi} × {gercekMiktar.toLocaleString()})
                            </Text>
                        </View>
                    )}

                    {/* SÜRE SEÇİMİ */}
                    <Text style={[styles.bolumBaslik, { color: theme.subText }]}>TAMAMLANMA SÜRESİ</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sureRow}>
                        {SURE_SECENEKLERI.map(s => (
                            <TouchableOpacity
                                key={String(s.value)}
                                style={[
                                    styles.sureBtn,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                    deadlineDays === s.value && { backgroundColor: theme.active, borderColor: theme.active }
                                ]}
                                onPress={() => setDeadlineDays(s.value)}
                            >
                                <Text style={[
                                    styles.sureBtnText,
                                    { color: deadlineDays === s.value ? '#FFF' : theme.text }
                                ]}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* OLUŞTUR BUTONU */}
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <TouchableOpacity
                            style={[styles.olusturBtn, { backgroundColor: theme.active }]}
                            onPress={olustur}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#FFF" />
                                : <>
                                    <MaterialCommunityIcons
                                        name={secilenArkadas ? 'send' : 'link-variant-plus'}
                                        size={22} color="#FFF"
                                    />
                                    <Text style={styles.olusturBtnText}>
                                        {secilenArkadas ? 'Arkadaşa Gönder' : 'Talep Oluştur ve Paylaş'}
                                    </Text>
                                </>
                            }
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ARKADAŞ SEÇİM MODAL */}
            <Modal
                visible={arkadasModalAcik}
                transparent
                animationType="slide"
                onRequestClose={() => setArkadasModalAcik(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Arkadaş Seç</Text>
                            <TouchableOpacity onPress={() => setArkadasModalAcik(false)}>
                                <MaterialCommunityIcons name="close" size={28} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={arkadaslar}
                            keyExtractor={a => a.id}
                            style={{ maxHeight: 320 }}
                            renderItem={({ item }) => {
                                const ls = arkadasLastSeen[item.id];
                                const aktif = ls && (Date.now() - ls.getTime() < 5 * 60 * 1000);
                                return (
                                    <TouchableOpacity
                                        style={[styles.arkadasSatir, {
                                            backgroundColor: secilenArkadas?.id === item.id
                                                ? (isDarkMode ? '#1B4332' : '#E9F5EE')
                                                : 'transparent',
                                            borderBottomColor: theme.border,
                                        }]}
                                        onPress={() => {
                                            setSecilenArkadas(item);
                                            setArkadasModalAcik(false);
                                        }}
                                    >
                                        <View>
                                            <View style={[styles.arkadasAvatar, { backgroundColor: theme.active }]}>
                                                <Text style={styles.arkadasAvatarText}>
                                                    {item.displayName?.charAt(0)?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                            {aktif && <View style={styles.aktifNokta} />}
                                        </View>
                                        <View style={styles.arkadasBilgiSatir}>
                                            <Text style={[styles.arkadasIsim, { color: theme.text }]}>
                                                {item.displayName}
                                            </Text>
                                            {aktif && (
                                                <Text style={styles.aktifLabel}>Aktif</Text>
                                            )}
                                        </View>
                                        {secilenArkadas?.id === item.id && (
                                            <MaterialCommunityIcons name="check-circle" size={22} color={theme.active} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scrollContent: { paddingHorizontal: 22, paddingBottom: 30 },
    baslik: { fontSize: 28, fontWeight: '900', marginTop: 16, marginBottom: 20 },
    bolumBaslik: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10, marginTop: 20 },

    arkadasSecBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14,
    },
    arkadasSecIc: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    arkadasSecText: { fontSize: 15, fontWeight: '700' },
    arkadasBilgi: { fontSize: 12, marginTop: 6, lineHeight: 16 },

    tipRow: { flexDirection: 'row', borderRadius: 14, padding: 4 },
    tipBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 10
    },
    tipBtnText: { fontWeight: '800', fontSize: 14 },

    sayacRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sayacBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    sayacGoster: {
        flex: 1, height: 56, borderRadius: 14, borderWidth: 1,
        justifyContent: 'center', alignItems: 'center'
    },
    sayacSayi: { fontSize: 26, fontWeight: '900' },
    sayacAlt: { fontSize: 11, fontWeight: '600', marginTop: -2 },

    miktarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    miktarBtn: {
        paddingHorizontal: 18, paddingVertical: 12,
        borderRadius: 14, borderWidth: 1, minWidth: (width - 60) / 3 - 8,
        alignItems: 'center'
    },
    miktarBtnGenis: { flex: 1 },
    miktarBtnText: { fontSize: 15, fontWeight: '800' },
    ozelInput: {
        height: 52, borderRadius: 14, borderWidth: 1,
        paddingHorizontal: 16, fontSize: 18, fontWeight: '700', marginTop: 8
    },
    toplamBilgi: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginTop: 10
    },
    toplamText: { fontSize: 13, fontWeight: '800' },

    sureRow: { marginBottom: 8 },
    sureBtn: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
        borderWidth: 1, marginRight: 8
    },
    sureBtnText: { fontSize: 13, fontWeight: '700' },

    olusturBtn: {
        height: 58, borderRadius: 18, flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', gap: 10, marginTop: 24,
        elevation: 5, shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8
    },
    olusturBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },

    // Başarı sayfası
    basariContent: { paddingHorizontal: 24, paddingTop: 30, alignItems: 'center', paddingBottom: 40 },
    basariIkon: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    basariBaslik: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
    basariAlt: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    kodKart: {
        width: '100%', borderRadius: 22, padding: 24, alignItems: 'center', marginBottom: 20
    },
    kodLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
    kodBuyuk: { color: '#FFF', fontSize: 40, fontWeight: '900', letterSpacing: 10 },
    kodSure: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 },
    ozet: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 20 },
    ozetSatir: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    ozetCizgi: { height: 1 },
    ozetLabel: { fontSize: 13 },
    ozetValue: { fontSize: 13, fontWeight: '700' },
    paylasBtn: {
        width: '100%', height: 56, backgroundColor: '#2D6A4F', borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
        elevation: 4, marginBottom: 12
    },
    paylasBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    geriBtn: { width: '100%', height: 50, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    geriBtnText: { fontSize: 15, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    arkadasSatir: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1
    },
    arkadasAvatar: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center'
    },
    arkadasAvatarText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
    aktifNokta: {
        position: 'absolute', bottom: 1, right: 1,
        width: 11, height: 11, borderRadius: 6,
        backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF'
    },
    arkadasBilgiSatir: { flex: 1 },
    arkadasIsim: { fontSize: 15, fontWeight: '700' },
    aktifLabel: { fontSize: 11, color: '#22C55E', fontWeight: '700', marginTop: 1 },
});
