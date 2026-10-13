import { useCallback, useEffect, useState } from 'react';
import { createElement } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API = '/api';
const colors = { ink: '#EEF3EF', muted: '#A3AEA7', paper: '#0D1112', card: '#171F1D', green: '#20392F', greenInk: '#B6E2C4', lilac: '#29243B', line: '#2C3833', accent: '#D2F0B1' };

type ActivityPost = {
  id: string;
  type: 'photo' | 'video';
  mimeType: string;
  mediaUrl: string;
  uploadedBy: string;
  caption: string;
  createdAt: string;
};

function getSavedName() {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem('nexo.name') || '' : '';
  } catch {
    return '';
  }
}

export default function ActivitiesScreen() {
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [activities, setActivities] = useState<ActivityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => setName(getSavedName()), []);

  const refreshActivities = useCallback(async () => {
    try {
      const response = await fetch(API + '/activities');
      if (!response.ok) throw new Error('No se pudieron cargar las actividades.');
      const data = await response.json();
      setActivities(data.activities);
    } catch {
      setNotice('No se pudo conectar con la computadora que aloja Nexo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshActivities();
    const interval = setInterval(() => void refreshActivities(), 8000);
    return () => clearInterval(interval);
  }, [refreshActivities]);

  const uploadActivity = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setNotice('Elige una foto o un video.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setNotice('El archivo debe pesar menos de 100 MB.');
      return;
    }
    setUploading(true);
    setNotice('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('uploadedBy', name.trim() || 'Estudiante');
      form.append('caption', caption);
      const response = await fetch(API + '/activities', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo compartir el archivo.');
      setCaption('');
      setNotice('Actividad compartida con los dispositivos de esta Wi‑Fi.');
      await refreshActivities();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo compartir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const chooseMedia = () => {
    if (typeof document === 'undefined') {
      setNotice('Abre Nexo en el navegador del teléfono para elegir una foto o un video.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void uploadActivity(file);
    };
    input.click();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>APRENDER TAMBIÉN SE COMPARTE</Text>
        <Text style={styles.title}>Actividades</Text>
        <Text style={styles.intro}>Sube fotos y videos de experimentos, apuntes o proyectos para que el grupo los vea.</Text>

        <View style={styles.shareCard}>
          <View style={styles.shareIcon}><Text style={styles.shareIconText}>＋</Text></View>
          <View style={styles.shareCopy}><Text style={styles.shareTitle}>Comparte un momento de estudio</Text><Text style={styles.shareHint}>Desde tu galería o cámara · hasta 100 MB</Text></View>
          <TextInput value={caption} onChangeText={setCaption} style={styles.captionInput} placeholder="Añade una nota (opcional)" placeholderTextColor="#85938A" maxLength={300} />
          <Pressable disabled={uploading} onPress={chooseMedia} style={[styles.shareButton, uploading && styles.disabled]}>
            {uploading ? <ActivityIndicator color="#172319" /> : <Text style={styles.shareButtonText}>Elegir foto o video</Text>}
          </Pressable>
        </View>

        <View style={styles.feedHeading}><View><Text style={styles.sectionLabel}>DE TU GRUPO</Text><Text style={styles.sectionTitle}>Muro de actividades</Text></View><Text style={styles.feedCount}>{activities.length}</Text></View>
        {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}
        {loading ? <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.loadingText}>Cargando actividades…</Text></View> : activities.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyIcon}>▧</Text><Text style={styles.emptyTitle}>Todavía no hay publicaciones</Text><Text style={styles.emptyCopy}>Comparte la primera foto o video de una actividad.</Text></View>
        ) : activities.map((activity) => (
          <View key={activity.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{activity.uploadedBy.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.postBy}><Text style={styles.postName}>{activity.uploadedBy}</Text><Text style={styles.postDate}>{new Date(activity.createdAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</Text></View>
              <View style={styles.typeTag}><Text style={styles.typeTagText}>{activity.type === 'photo' ? 'FOTO' : 'VIDEO'}</Text></View>
            </View>
            {activity.type === 'photo'
              ? createElement('img', { src: activity.mediaUrl, alt: activity.caption || 'Foto de una actividad', style: { width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 14, backgroundColor: '#080B0A', marginTop: 12 } })
              : createElement('video', { src: activity.mediaUrl, controls: true, playsInline: true, preload: 'metadata', style: { width: '100%', maxHeight: 420, borderRadius: 14, backgroundColor: '#080B0A', marginTop: 12 } })}
            {activity.caption ? <Text style={styles.caption}>{activity.caption}</Text> : null}
          </View>
        ))}
        <View style={styles.localNote}><Text style={styles.localNoteText}>El muro se comparte solo dentro de esta Wi‑Fi. Los archivos quedan guardados en la computadora anfitriona.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 19, paddingTop: 22, paddingBottom: 100, gap: 15, maxWidth: 680, width: '100%', alignSelf: 'center' },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.25 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, marginTop: -9 },
  intro: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: -8, maxWidth: 450 },
  shareCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 15, gap: 11, marginTop: 3 },
  shareIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  shareIconText: { color: colors.greenInk, fontSize: 21, lineHeight: 23 },
  shareCopy: { gap: 3 },
  shareTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  shareHint: { color: colors.muted, fontSize: 10 },
  captionInput: { backgroundColor: '#101614', borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10, color: colors.ink, fontSize: 11 },
  shareButton: { minHeight: 43, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  shareButtonText: { color: '#172319', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  feedHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 5 },
  sectionLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1.2, fontWeight: '800' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 4 },
  feedCount: { color: '#8B9990', fontSize: 11, fontWeight: '800', paddingBottom: 2 },
  notice: { backgroundColor: colors.green, borderRadius: 11, padding: 10 },
  noticeText: { color: colors.greenInk, fontSize: 10, lineHeight: 15 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 18 },
  loadingText: { color: colors.muted, fontSize: 11 },
  emptyCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 25, alignItems: 'center' },
  emptyIcon: { color: '#C2B0FF', fontSize: 25 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyCopy: { color: colors.muted, fontSize: 11, marginTop: 5, textAlign: 'center' },
  postCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 13 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#C2B0FF', fontSize: 12, fontWeight: '800' },
  postBy: { flex: 1 },
  postName: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  postDate: { color: colors.muted, fontSize: 9, marginTop: 2 },
  typeTag: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  typeTagText: { color: colors.greenInk, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  caption: { color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: 10 },
  localNote: { backgroundColor: '#1B2822', borderRadius: 12, padding: 10 },
  localNoteText: { color: '#B4C3B8', fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
