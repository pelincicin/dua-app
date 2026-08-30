/**
 * Firestore koleksiyonları:
 *   users/{userId}               → kullanıcı profili
 *   davetKodlari/{kod}           → bekleyen davetler
 *   zikirRequests/{requestId}    → tekli veya grup içi istekler
 *   zikirGroups/{groupId}        → grup bilgisi
 *   zikirGroups/{groupId}/members/{userId}  → üye ilerleme
 */

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Yardımcı ────────────────────────────────────────────────────────────────

export function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function sendExpoPush(token, title, body, data = {}) {
    if (!token) return;
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
        });
    } catch (e) {
        console.log('Push hatası:', e);
    }
}

// ─── TEKLİ TALEP ────────────────────────────────────────────────────────────

/**
 * Yeni tekli zikir talebi oluşturur, davet kodu döner.
 */
export async function tekliTalepOlustur({ fromId, fromName, fromPushToken, amount, deadlineDays }) {
    const kod = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 gün geçerli
    const deadline = deadlineDays
        ? Timestamp.fromDate(new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000))
        : null;

    await setDoc(doc(db, 'davetKodlari', kod), {
        tip: 'tekli',
        gonderen: { id: fromId, isim: fromName, pushToken: fromPushToken || '' },
        miktar: amount,
        deadline,
        expiresAt: Timestamp.fromDate(expiresAt),
        kullanildi: false,
        createdAt: serverTimestamp(),
    });

    return kod;
}

/**
 * Gelen kodu doğrular. Obje döner ya da null.
 */
export async function davetKoduGetir(kod) {
    const snap = await getDoc(doc(db, 'davetKodlari', kod.toUpperCase().trim()));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.kullanildi && data.tip === 'tekli') return null;
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) return null;
    return { kod, ...data };
}

/**
 * Daveti kabul et → zikirRequest oluştur.
 */
export async function tekliDavetiKabul({ davet, toId, toName, toPushToken }) {
    const requestId = generateId();
    await setDoc(doc(db, 'zikirRequests', requestId), {
        tip: 'tekli',
        fromId: davet.gonderen.id,
        fromName: davet.gonderen.isim,
        fromPushToken: davet.gonderen.pushToken || '',
        toId,
        toName,
        toPushToken: toPushToken || '',
        miktar: davet.miktar,
        tamamlanan: 0,
        deadline: davet.deadline || null,
        durum: 'aktif',
        groupId: null,
        createdAt: serverTimestamp(),
        tamamlandiAt: null,
    });

    // Kodu kullanıldı olarak işaretle
    await updateDoc(doc(db, 'davetKodlari', davet.kod), { kullanildi: true });

    // Karşılıklı arkadaş ekle
    await arkadasEkle(
        toId,
        { displayName: toName, pushToken: toPushToken || '' },
        davet.gonderen.id,
        { displayName: davet.gonderen.isim, pushToken: davet.gonderen.pushToken || '' }
    );

    // İsteği gönderene bildirim
    await sendExpoPush(
        davet.gonderen.pushToken,
        'Zikir Zinciri Kabul Edildi',
        `${toName}, ${davet.miktar} zikirlik talebi kabul etti.`,
        { tip: 'davet_kabul', requestId }
    );

    return requestId;
}

// ─── GRUP TALEP ─────────────────────────────────────────────────────────────

/**
 * Grup talebi oluşturur. Kurucu da üye olarak eklenir.
 */
export async function grupTalepOlustur({ creatorId, creatorName, creatorPushToken, kisiSayisi, kisiBasinaMiktar, deadlineDays, grupAdi }) {
    const kod = generateInviteCode();
    const groupId = generateId();
    const deadline = deadlineDays
        ? Timestamp.fromDate(new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000))
        : null;
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // 14 gün

    // Grup dokümanı
    await setDoc(doc(db, 'zikirGroups', groupId), {
        baslik: (grupAdi && grupAdi.trim()) ? grupAdi.trim() : `${creatorName} Grubu`,
        kurucuId: creatorId,
        kurucuIsim: creatorName,
        toplamHedef: kisiSayisi * kisiBasinaMiktar,
        kisiBasinaMiktar,
        maxUye: kisiSayisi,
        mevcutUye: 1,
        deadline,
        durum: 'aktif',
        davetKodu: kod,
        createdAt: serverTimestamp(),
    });

    // Kurucu üye olarak ekle
    const kurucuRequestId = generateId();
    await setDoc(doc(db, 'zikirRequests', kurucuRequestId), {
        tip: 'grup',
        fromId: creatorId,
        fromName: 'Grup',
        fromPushToken: '',
        toId: creatorId,
        toName: creatorName,
        toPushToken: creatorPushToken || '',
        miktar: kisiBasinaMiktar,
        tamamlanan: 0,
        deadline,
        durum: 'aktif',
        groupId,
        createdAt: serverTimestamp(),
        tamamlandiAt: null,
    });

    await setDoc(doc(db, 'zikirGroups', groupId, 'members', creatorId), {
        userId: creatorId,
        displayName: creatorName,
        pushToken: creatorPushToken || '',
        miktar: kisiBasinaMiktar,
        tamamlanan: 0,
        requestId: kurucuRequestId,
        isCreator: true,
        joinedAt: serverTimestamp(),
    });

    // Davet kodu kaydet
    await setDoc(doc(db, 'davetKodlari', kod), {
        tip: 'grup',
        groupId,
        gonderen: { id: creatorId, isim: creatorName, pushToken: creatorPushToken || '' },
        miktar: kisiBasinaMiktar,
        deadline,
        expiresAt,
        kullanildi: false,
        createdAt: serverTimestamp(),
    });

    return { groupId, kod };
}

/**
 * Grup davetini kabul et.
 */
export async function grupDavetiKabul({ davet, toId, toName, toPushToken }) {
    const groupId = davet.groupId;
    const groupRef = doc(db, 'zikirGroups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Grup bulunamadı.');
    const group = groupSnap.data();

    if (group.mevcutUye >= group.maxUye) throw new Error('Grup dolu.');

    // Kullanıcı zaten üye mi?
    const memberSnap = await getDoc(doc(db, 'zikirGroups', groupId, 'members', toId));
    if (memberSnap.exists()) throw new Error('Bu gruba zaten katıldınız.');

    const requestId = generateId();
    await setDoc(doc(db, 'zikirRequests', requestId), {
        tip: 'grup',
        fromId: group.kurucuId,
        fromName: 'Grup',
        fromPushToken: group.kurucuPushToken || '',
        toId,
        toName,
        toPushToken: toPushToken || '',
        miktar: group.kisiBasinaMiktar,
        tamamlanan: 0,
        deadline: group.deadline || null,
        durum: 'aktif',
        groupId,
        createdAt: serverTimestamp(),
        tamamlandiAt: null,
    });

    await setDoc(doc(db, 'zikirGroups', groupId, 'members', toId), {
        userId: toId,
        displayName: toName,
        pushToken: toPushToken || '',
        miktar: group.kisiBasinaMiktar,
        tamamlanan: 0,
        requestId,
        isCreator: false,
        joinedAt: serverTimestamp(),
    });

    await updateDoc(groupRef, { mevcutUye: increment(1) });

    // Karşılıklı arkadaş ekle
    await arkadasEkle(
        toId,
        { displayName: toName, pushToken: toPushToken || '' },
        group.kurucuId,
        { displayName: group.kurucuIsim, pushToken: group.kurucuPushToken || '' }
    );

    // Kurucuya bildirim
    await sendExpoPush(
        davet.gonderen.pushToken,
        'Gruba Katılım',
        `${toName} grubuna katıldı!`
    );

    return requestId;
}

// ─── ZİKİR İLERLEMESİ ───────────────────────────────────────────────────────

/**
 * Zikir sayısını artır. Tamamlandıysa bildirim gönder, durumu güncelle.
 */
export async function zikirIlerlemesiArttir(requestId) {
    const ref = doc(db, 'zikirRequests', requestId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();

    const yeniTamamlanan = (data.tamamlanan || 0) + 1;
    const tamamlandi = yeniTamamlanan >= data.miktar;

    await updateDoc(ref, {
        tamamlanan: increment(1),
        ...(tamamlandi ? { durum: 'tamamlandi', tamamlandiAt: serverTimestamp() } : {}),
    });

    // Grup ise grup üye kaydını da güncelle
    if (data.groupId) {
        await updateDoc(doc(db, 'zikirGroups', data.groupId, 'members', data.toId), {
            tamamlanan: increment(1),
        });
        // Grup tamamen bitti mi?
        await kontrolGrupTamamlandi(data.groupId);
    }

    // Tamamlandıysa bildirimler
    if (tamamlandi) {
        await sendExpoPush(
            data.fromPushToken,
            'Zikir Zinciri Tamamlandı',
            `${data.toName}, ${data.miktar} zikirini tamamladı! Allah kabul etsin.`,
            { tip: 'zikir_tamamlandi', requestId }
        );
    }

    return { tamamlandi, yeniTamamlanan };
}

async function kontrolGrupTamamlandi(groupId) {
    const membersSnap = await getDocs(collection(db, 'zikirGroups', groupId, 'members'));
    const members = membersSnap.docs.map(d => d.data());
    const hepsiBitti = members.every(m => m.tamamlanan >= m.miktar);
    if (hepsiBitti) {
        await updateDoc(doc(db, 'zikirGroups', groupId), { durum: 'tamamlandi' });
        // Tüm üyelere bildirim gönder
        for (const m of members) {
            await sendExpoPush(
                m.pushToken,
                'Grup Zikiri Tamamlandı!',
                'Grubunuz hedef zikrini tamamladı! Allah hepinizden kabul etsin.'
            );
        }
    }
}

// ─── GERÇEk ZAMANLI LİSTENERS ───────────────────────────────────────────────

/** Kullanıcının aldığı aktif + beklemede istekler */
export function gelenIstekleriDinle(userId, callback) {
    const q = query(
        collection(db, 'zikirRequests'),
        where('toId', '==', userId)
    );
    return onSnapshot(q, snap => {
        const data = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(r => r.durum === 'aktif' || r.durum === 'beklemede');
        callback(data);
    });
}

/** Kullanıcının gönderdiği aktif/bekleyen istekler */
export function gonderdiginIstekleriDinle(userId, callback) {
    // orderBy + where kombinasyonu composite index gerektirdiğinden client-side sırala
    const q = query(
        collection(db, 'zikirRequests'),
        where('fromId', '==', userId)
    );
    return onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(data);
    });
}

/** Gönderdiğin + aldığın TÜM istekler (geçmiş dahil) */
export function tumIstekleriDinle(userId, callback) {
    const q = query(
        collection(db, 'zikirRequests'),
        where('toId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

/** Grup üye ilerlemelerini gerçek zamanlı dinle */
export function grupUyeleriniDinle(groupId, callback) {
    return onSnapshot(collection(db, 'zikirGroups', groupId, 'members'), snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

/** Kullanıcının dahil olduğu grupları dinle */
export function gruplarıDinle(userId, callback) {
    const q = query(
        collection(db, 'zikirRequests'),
        where('toId', '==', userId),
        where('tip', '==', 'grup')
    );
    return onSnapshot(q, async snap => {
        // aktif + tamamlandi her ikisini de göster
        const ilgiliDocs = snap.docs.filter(d => {
            const s = d.data().durum;
            return s === 'aktif' || s === 'tamamlandi';
        });
        const groupIds = [...new Set(ilgiliDocs.map(d => d.data().groupId).filter(Boolean))];
        const groups = [];
        for (const gId of groupIds) {
            const gSnap = await getDoc(doc(db, 'zikirGroups', gId));
            if (gSnap.exists()) groups.push({ id: gSnap.id, ...gSnap.data() });
        }
        callback(groups);
    });
}

/** Davet kodunu sil (isteği iptal et) */
export async function davetIptalEt(kod) {
    await deleteDoc(doc(db, 'davetKodlari', kod));
}

/** Grubu tamamen sil — sadece kurucu çağırabilir. Tüm üye ve requestleri temizler. */
export async function grupSil(groupId) {
    const groupRef = doc(db, 'zikirGroups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return;
    const group = groupSnap.data();

    // Tüm üyeleri ve request'lerini al
    const membersSnap = await getDocs(collection(db, 'zikirGroups', groupId, 'members'));
    const members = membersSnap.docs.map(d => d.data());

    // Her üyenin request'ini sil
    for (const m of members) {
        if (m.requestId) {
            try { await deleteDoc(doc(db, 'zikirRequests', m.requestId)); } catch {}
        }
        try { await deleteDoc(doc(db, 'zikirGroups', groupId, 'members', m.userId)); } catch {}
    }

    // Davet kodunu sil
    if (group.davetKodu) {
        try { await deleteDoc(doc(db, 'davetKodlari', group.davetKodu)); } catch {}
    }

    // Grup dokümanını sil
    await deleteDoc(groupRef);

    // Diğer üyelere bildirim gönder
    for (const m of members) {
        if (m.userId !== group.kurucuId && m.pushToken) {
            await sendExpoPush(
                m.pushToken,
                'Grup Silindi',
                `${group.kurucuIsim} grubu sildi.`
            );
        }
    }
}

/** Gruptan çık — üye kendi isteğiyle ayrılır (kurucu kullanamazken tercih edilmez ama engel yok) */
export async function gruptenCik(groupId, userId) {
    const groupRef = doc(db, 'zikirGroups', groupId);
    const memberRef = doc(db, 'zikirGroups', groupId, 'members', userId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) return;

    const memberData = memberSnap.data();

    // Üye dokümanını sil
    await deleteDoc(memberRef);

    // Request'i sil
    if (memberData.requestId) {
        try { await deleteDoc(doc(db, 'zikirRequests', memberData.requestId)); } catch {}
    }

    // Grup üye sayısını düşür
    try {
        await updateDoc(groupRef, { mevcutUye: increment(-1) });
    } catch {}
}

/** Yeni tur başlat — tüm üyeler tamamladıktan sonra kurucu yeni miktar belirleyebilir */
export async function yeniTurBaslat(groupId, yeniMiktar) {
    const groupRef = doc(db, 'zikirGroups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Grup bulunamadı.');
    const group = groupSnap.data();

    // Tüm üyeleri al
    const membersSnap = await getDocs(collection(db, 'zikirGroups', groupId, 'members'));
    const members = membersSnap.docs.map(d => ({ docId: d.id, ...d.data() }));

    const uyeSayisi = members.length;
    const deadline = null; // yeni turda deadline yok (opsiyonel olarak eklenebilir)

    // Her üyenin member doc ve request'ini sıfırla
    for (const m of members) {
        await updateDoc(doc(db, 'zikirGroups', groupId, 'members', m.docId), {
            tamamlanan: 0,
            miktar: yeniMiktar,
        });
        if (m.requestId) {
            try {
                await updateDoc(doc(db, 'zikirRequests', m.requestId), {
                    tamamlanan: 0,
                    miktar: yeniMiktar,
                    durum: 'aktif',
                    tamamlandiAt: null,
                    deadline,
                });
            } catch {}
        }
    }

    // Grup dokümanını güncelle
    await updateDoc(groupRef, {
        durum: 'aktif',
        kisiBasinaMiktar: yeniMiktar,
        toplamHedef: uyeSayisi * yeniMiktar,
    });

    // Tüm üyelere bildirim
    for (const m of members) {
        if (m.pushToken) {
            await sendExpoPush(
                m.pushToken,
                'Yeni Zikir Turu Başladı! 🤲',
                `${group.baslik} grubunda yeni tur: ${yeniMiktar.toLocaleString('tr-TR')} zikir.`
            );
        }
    }
}

// ─── ARKADAŞ SİSTEMİ ────────────────────────────────────────────────────────

/** Karşılıklı arkadaş ekle — talep kabul edildiğinde çağrılır */
export async function arkadasEkle(userId, myInfo, friendId, friendInfo) {
    try {
        await setDoc(doc(db, 'users', userId, 'arkadaslar', friendId), {
            displayName: friendInfo.displayName || 'Bilinmiyor',
            pushToken: friendInfo.pushToken || '',
            eklemeZamani: serverTimestamp(),
        }, { merge: true });
        await setDoc(doc(db, 'users', friendId, 'arkadaslar', userId), {
            displayName: myInfo.displayName || 'Bilinmiyor',
            pushToken: myInfo.pushToken || '',
            eklemeZamani: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.log('Arkadaş ekleme hatası:', e);
    }
}

/** Verilen kullanıcı ID'leri için lastSeen zamanlarını toplu çeker */
export async function arkadasLastSeenGetir(friendIds) {
    const result = {};
    await Promise.all(
        friendIds.map(async id => {
            try {
                const snap = await getDoc(doc(db, 'users', id));
                if (snap.exists()) {
                    const ls = snap.data().lastSeen;
                    result[id] = ls ? ls.toDate() : null;
                }
            } catch {}
        })
    );
    return result;
}

/** Arkadaş listesini gerçek zamanlı dinle */
export function arkadaslariDinle(userId, callback) {
    return onSnapshot(collection(db, 'users', userId, 'arkadaslar'), snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

/** Arkadaşa kod olmadan doğrudan talep gönder */
export async function dogrudanTalepOlustur({ fromId, fromName, fromPushToken, toId, toName, toPushToken, amount, deadlineDays }) {
    const requestId = generateId();
    const deadline = deadlineDays
        ? Timestamp.fromDate(new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000))
        : null;

    await setDoc(doc(db, 'zikirRequests', requestId), {
        tip: 'tekli',
        fromId,
        fromName,
        fromPushToken: fromPushToken || '',
        toId,
        toName,
        toPushToken: toPushToken || '',
        miktar: amount,
        tamamlanan: 0,
        deadline,
        durum: 'beklemede',
        groupId: null,
        dogrudan: true,
        createdAt: serverTimestamp(),
        tamamlandiAt: null,
    });

    await sendExpoPush(
        toPushToken,
        '🤲 Zikir Talebi',
        `${fromName} senden ${amount.toLocaleString('tr-TR')} zikir talep ediyor.`,
        { tip: 'dogrudan_talep', requestId, screen: 'Zincir' }
    );

    return requestId;
}

/** Bekleyen doğrudan talebi kabul et */
export async function bekleyenTalebiKabul(requestId) {
    await updateDoc(doc(db, 'zikirRequests', requestId), { durum: 'aktif' });
    const snap = await getDoc(doc(db, 'zikirRequests', requestId));
    if (!snap.exists()) return;
    const data = snap.data();
    await sendExpoPush(
        data.fromPushToken,
        'Zikir Talebi Kabul Edildi ✅',
        `${data.toName}, ${data.miktar.toLocaleString('tr-TR')} zikirlik talebi kabul etti.`,
        { tip: 'talep_kabul', requestId }
    );
}

/** Bekleyen doğrudan talebi reddet */
export async function bekleyenTalebiReddet(requestId) {
    const snap = await getDoc(doc(db, 'zikirRequests', requestId));
    if (!snap.exists()) return;
    const data = snap.data();
    await deleteDoc(doc(db, 'zikirRequests', requestId));
    await sendExpoPush(
        data.fromPushToken,
        'Zikir Talebi',
        `${data.toName} şu an bu talebi kabul edemedi.`,
        { tip: 'talep_ret' }
    );
}

/** Gönderilen bir talebi iptal et / sil */
export async function istekSil(requestId) {
    const snap = await getDoc(doc(db, 'zikirRequests', requestId));
    if (!snap.exists()) return;
    const data = snap.data();

    await deleteDoc(doc(db, 'zikirRequests', requestId));

    if (data.durum === 'beklemede' && data.toPushToken) {
        await sendExpoPush(
            data.toPushToken,
            'Zikir Talebi İptal Edildi',
            `${data.fromName} talebini iptal etti.`
        );
    }
}
