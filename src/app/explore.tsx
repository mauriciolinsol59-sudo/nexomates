import { useCallback, useEffect, useState } from 'react';
import { createElement } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = { ink: '#EEF3EF', muted: '#A3AEA7', paper: '#0D1112', white: '#171F1D', green: '#20392F', greenInk: '#B6E2C4', lilac: '#29243B', line: '#2C3833', forest: '#D2F0B1' };
const API = '/api';

type HelpRequest = {
  id: string;
  clientId: string;
  name: string;
  topic: string;
  doubt: string;
  status: 'open' | 'claimed';
  helperName: string | null;
  helperId: string | null;
  createdAt: string;
};

type HelpMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  audioUrl?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  createdAt: string;
};

function getClientId() {
  try {
    if (typeof window !== 'undefined') {
      const key = 'nexo.clientId';
      const saved = window.localStorage.getItem(key);
      if (saved) return saved;
      const created = Math.random().toString(36).slice(2);
      window.localStorage.setItem(key, created);
      return created;
    }
  } catch {
    // Use a session-only id if browser storage is unavailable.
  }
  return Math.random().toString(36).slice(2);
}

function getSavedName() {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem('nexo.name') || '' : '';
  } catch {
    return '';
  }
}

function ChatThread({ requestId, clientId, name }: { requestId: string; clientId: string; name: string }) {
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);
  const [chatError, setChatError] = useState('');

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(API + '/requests/' + requestId + '/messages?clientId=' + encodeURIComponent(clientId));
      if (!response.ok) throw new Error('No se pudieron cargar los mensajes.');
      const data = await response.json();
      setMessages(data.messages);
      setChatError('');
    } catch {
      setChatError('No se pudo actualizar el chat.');
    }
  }, [clientId, requestId]);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(), 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const response = await fetch(API + '/requests/' + requestId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: clientId, senderName: name.trim() || 'Estudiante', text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo enviar el mensaje.');
      setDraft('');
      await loadMessages();
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const sendVoiceNote = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setChatError('Selecciona un archivo de audio.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setChatError('La nota de voz debe pesar menos de 20 MB.');
      return;
    }
    setSendingVoice(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('senderId', clientId);
      form.append('senderName', name.trim() || 'Estudiante');
      const response = await fetch(API + '/requests/' + requestId + '/voice-notes', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo enviar la nota de voz.');
      setChatError('');
      await loadMessages();
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No se pudo enviar la nota de voz.');
    } finally {
      setSendingVoice(false);
    }
  };

  const chooseVoiceNote = () => {
    if (typeof document === 'undefined') {
      setChatError('Abre Nexo en el navegador del teléfono para grabar o adjuntar audio.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.capture = 'user';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void sendVoiceNote(file);
    };
    input.click();
  };

  const sendAttachment = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) { setChatError('El archivo debe pesar menos de 50 MB.'); return; }
    setSendingFile(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('senderId', clientId);
      form.append('senderName', name.trim() || 'Estudiante');
      form.append('originalName', file.name);
      const response = await fetch(API + '/requests/' + requestId + '/attachments', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo enviar el archivo.');
      setChatError('');
      await loadMessages();
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'No se pudo enviar el archivo.');
    } finally { setSendingFile(false); }
  };

  const chooseAttachment = () => {
    if (typeof document === 'undefined') { setChatError('Abre Nexo en el navegador del teléfono para adjuntar un archivo.'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,.pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
    input.onchange = () => { const file = input.files?.[0]; if (file) void sendAttachment(file); };
    input.click();
  };

  return (
    <View style={styles.chat}>
      <Text style={styles.chatTitle}>CHAT PARA COORDINAR</Text>
      <Text style={styles.chatHint}>Pueden escribir aquí si no logran reunirse en persona.</Text>
      {messages.length === 0 ? <Text style={styles.firstMessage}>Saluda y acuerden cómo repasar juntos.</Text> : messages.slice(-12).map((message) => (
        <View key={message.id} style={[styles.messageBubble, message.senderId === clientId ? styles.myMessage : styles.theirMessage]}>
          <Text style={styles.messageAuthor}>{message.senderId === clientId ? 'Tú' : message.senderName}</Text>
          {message.audioUrl ? createElement('audio', { src: message.audioUrl, controls: true, style: { width: 220, height: 34 } }) : message.fileUrl ? <Pressable onPress={() => { if (typeof window !== 'undefined') window.open(message.fileUrl, '_blank'); }}><Text style={styles.fileLink}>📎 {message.fileName || 'Descargar archivo'}</Text></Pressable> : <Text style={styles.messageText}>{message.text}</Text>}
        </View>
      ))}
      {chatError ? <Text style={styles.chatError}>{chatError}</Text> : null}
      <View style={styles.composer}>
        <TextInput value={draft} onChangeText={setDraft} style={styles.messageInput} placeholder="Escribe un mensaje…" placeholderTextColor="#85938A" maxLength={1000} multiline />
        <Pressable disabled={!draft.trim() || sending} onPress={() => void sendMessage()} style={[styles.sendButton, (!draft.trim() || sending) && styles.disabledButton]}>
          <Text style={styles.sendButtonText}>{sending ? '…' : 'Enviar'}</Text>
        </Pressable>
      </View>
      <Pressable disabled={sendingVoice} onPress={chooseVoiceNote} style={[styles.voiceButton, sendingVoice && styles.disabledButton]}>
        <Text style={styles.voiceButtonText}>{sendingVoice ? 'Enviando audio…' : '🎙 Grabar o adjuntar nota de voz'}</Text>
      </Pressable>
      <Pressable disabled={sendingFile} onPress={chooseAttachment} style={[styles.voiceButton, sendingFile && styles.disabledButton]}>
        <Text style={styles.voiceButtonText}>{sendingFile ? 'Subiendo archivo…' : '📎 Adjuntar foto, video o archivo'}</Text>
      </Pressable>
    </View>
  );
}

export default function HelpScreen() {
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [doubt, setDoubt] = useState('');
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setClientId(getClientId());
    setName(getSavedName());
  }, []);

  useEffect(() => {
    if (!clientId) return;
    try {
      window.localStorage.setItem('nexo.name', name);
    } catch {
      // Name stays in memory if browser storage is unavailable.
    }
  }, [clientId, name]);

  const refreshRequests = useCallback(async () => {
    try {
      const response = await fetch(API + '/requests');
      if (!response.ok) throw new Error('No se pudo actualizar la lista.');
      const data = await response.json();
      setRequests(data.requests);
      setConnected(true);
      setNotice('');
    } catch {
      setConnected(false);
      setNotice('No pudimos conectar con la computadora que aloja Nexo. Confirma que siga encendida y conectada a esta Wi‑Fi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRequests();
    const interval = setInterval(() => void refreshRequests(), 5000);
    return () => clearInterval(interval);
  }, [refreshRequests]);

  const publishRequest = async () => {
    if (!name.trim() || !topic.trim() || !doubt.trim()) {
      setNotice('Completa tu nombre, la materia y tu duda.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch(API + '/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, name, topic, doubt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo publicar la duda.');
      setTopic('');
      setDoubt('');
      setNotice('Tu duda ya está disponible para otros estudiantes de esta Wi‑Fi.');
      await refreshRequests();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo publicar la duda.');
    } finally {
      setSending(false);
    }
  };

  const offerHelp = async (requestId: string) => {
    try {
      const response = await fetch(API + '/requests/' + requestId + '/claim', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helperId: clientId, helperName: name.trim() || 'Estudiante' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo responder a la solicitud.');
      setNotice('Te pusiste en contacto para ayudar. Coordinen su sesión de 15 minutos.');
      await refreshRequests();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo responder a la solicitud.');
      await refreshRequests();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View><Text style={styles.eyebrow}>APOYO ENTRE PARES</Text><Text style={styles.title}>{'Una duda concreta.\nQuince minutos.'}</Text></View>
          <View style={[styles.networkPill, connected ? styles.onlinePill : styles.offlinePill]}><View style={[styles.networkDot, connected ? styles.onlineDot : styles.offlineDot]} /><Text style={[styles.networkText, connected ? styles.onlineText : styles.offlineText]}>{connected ? 'EN RED' : 'CONECTANDO'}</Text></View>
        </View>
        <Text style={styles.intro}>Comparte justo dónde te atoras. La solicitud aparecerá en los otros teléfonos conectados a esta misma Wi‑Fi.</Text>

        <View style={styles.formCard}>
          <View style={styles.stepLine}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View><Text style={styles.stepTitle}>Pide apoyo o presenta tu tropiezo</Text></View>
          <Text style={styles.label}>TU NOMBRE O APODO</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Cómo te reconocerán" placeholderTextColor="#929AA4" maxLength={40} />
          <Text style={styles.label}>MATERIA O TEMA</Text>
          <TextInput value={topic} onChangeText={setTopic} style={styles.input} placeholder="Ej. Cálculo I" placeholderTextColor="#929AA4" maxLength={80} />
          <Text style={styles.label}>¿EN QUÉ PASO TE ATORASTE?</Text>
          <TextInput value={doubt} onChangeText={setDoubt} style={[styles.input, styles.multiline]} multiline textAlignVertical="top" placeholder="Describe el punto exacto de tu duda" placeholderTextColor="#929AA4" maxLength={500} />
          <View style={styles.contextNote}><Text style={styles.contextIcon}>✳</Text><Text style={styles.contextText}>Este error también alimentará un repaso breve para que puedas volver a practicarlo.</Text></View>
          <Pressable disabled={sending || !connected} onPress={() => void publishRequest()} style={[styles.publishButton, (sending || !connected) && styles.disabledButton]}>
            {sending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.publishButtonText}>Publicar mi duda  →</Text>}
          </Pressable>
        </View>

        <View style={styles.listHeading}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
          <View style={styles.listTitleWrap}><Text style={styles.stepTitle}>Dudas de esta Wi‑Fi</Text><Text style={styles.stepSub}>Se actualiza automáticamente cada 5 segundos</Text></View>
          <Text style={styles.requestCount}>{requests.length}</Text>
        </View>

        {notice ? <View style={[styles.notice, connected ? styles.noticeGood : styles.noticeWarn]}><Text style={styles.noticeText}>{notice}</Text></View> : null}
        {loading ? <View style={styles.loading}><ActivityIndicator color={colors.greenInk} /><Text style={styles.loadingText}>Buscando solicitudes cercanas…</Text></View> : requests.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>Todavía no hay dudas en la red</Text><Text style={styles.emptyText}>Cuando alguien publique una, aparecerá aquí. También puedes empezar compartiendo la tuya.</Text></View>
        ) : requests.map((request) => {
          const isMine = request.clientId === clientId;
          return (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestTop}><View style={styles.topicPill}><Text style={styles.topicText}>{request.topic}</Text></View><Text style={[styles.statusTag, request.status === 'claimed' ? styles.claimedTag : styles.openTag]}>{request.status === 'claimed' ? '● CON RESPUESTA' : '● BUSCA APOYO'}</Text></View>
              <Text style={styles.requestBy}>{isMine ? 'Tu solicitud' : 'Duda de ' + request.name}</Text>
              <Text style={styles.requestDoubt}>{request.doubt}</Text>
              {request.status === 'claimed' && (isMine || request.helperId === clientId) ? (
                <>
                  <View style={styles.claimedNote}><Text style={styles.claimedNoteText}>{request.helperId === clientId ? 'Estás ayudando a ' + request.name : request.helperName + ' ofreció ayuda'} · acuerden cómo reunirse durante 15 minutos.</Text></View>
                  <ChatThread requestId={request.id} clientId={clientId} name={name} />
                </>
              ) : request.status === 'claimed' ? (
                <View style={styles.claimedNote}><Text style={styles.claimedNoteText}>{request.helperName} ofreció ayuda. El chat es privado para las dos personas de la solicitud.</Text></View>
              ) : isMine ? (
                <View style={styles.waitingNote}><Text style={styles.waitingText}>Visible para estudiantes conectados. Esperando a alguien que pueda ayudarte.</Text></View>
              ) : (
                <Pressable onPress={() => void offerHelp(request.id)} style={styles.offerButton}><Text style={styles.offerButtonText}>Puedo ayudar  →</Text></Pressable>
              )}
            </View>
          );
        })}

        <View style={styles.privacyNote}><Text style={styles.lock}>⌑</Text><Text style={styles.privacyText}>Las dudas de esta red son visibles para cualquier persona en la misma Wi‑Fi. No incluyas información privada.</Text></View>
        <Text style={styles.hostNote}>La computadora que aloja Nexo debe permanecer encendida y conectada.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 100, gap: 16, maxWidth: 620, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 },
  intro: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: -7, maxWidth: 440 },
  networkPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 7, marginTop: 1 },
  onlinePill: { backgroundColor: colors.green },
  offlinePill: { backgroundColor: '#392822' },
  networkDot: { width: 6, height: 6, borderRadius: 3 },
  onlineDot: { backgroundColor: '#57C887' },
  offlineDot: { backgroundColor: '#E39964' },
  networkText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  onlineText: { color: colors.greenInk },
  offlineText: { color: '#F0B08A' },
  formCard: { backgroundColor: colors.white, borderRadius: 21, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 9 },
  stepLine: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 1 },
  stepNumber: { width: 25, height: 25, borderRadius: 9, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#C2B0FF', fontSize: 11, fontWeight: '800' },
  stepTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  label: { color: '#9CA9A1', fontSize: 9, letterSpacing: 0.8, fontWeight: '800', marginTop: 4 },
  input: { backgroundColor: '#101614', borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 12 },
  multiline: { minHeight: 67, lineHeight: 18 },
  contextNote: { flexDirection: 'row', gap: 8, backgroundColor: '#29243B', padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 1 },
  contextIcon: { color: '#C2B0FF', fontSize: 13 },
  contextText: { color: '#D1C7F5', fontSize: 10, lineHeight: 15, flex: 1 },
  publishButton: { backgroundColor: colors.forest, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 2, minHeight: 42 },
  disabledButton: { opacity: 0.48 },
  publishButtonText: { color: '#172319', fontSize: 12, fontWeight: '800' },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 2 },
  listTitleWrap: { flex: 1 },
  stepSub: { color: colors.muted, fontSize: 9, marginTop: 3 },
  requestCount: { color: '#8B9990', fontSize: 12, fontWeight: '800' },
  notice: { borderRadius: 11, padding: 10 },
  noticeGood: { backgroundColor: colors.green },
  noticeWarn: { backgroundColor: '#392822' },
  noticeText: { color: colors.ink, fontSize: 10, lineHeight: 15 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 16 },
  loadingText: { color: colors.muted, fontSize: 11 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.line, padding: 22, alignItems: 'center' },
  emptyMark: { color: '#C2B0FF', fontSize: 21 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 9 },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5, maxWidth: 300 },
  requestCard: { backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.line, padding: 15 },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  topicPill: { backgroundColor: colors.lilac, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  topicText: { color: '#C2B0FF', fontSize: 9, fontWeight: '800' },
  statusTag: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  openTag: { color: '#E3B86D' },
  claimedTag: { color: colors.greenInk },
  requestBy: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 11 },
  requestDoubt: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  offerButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 11, padding: 10, alignItems: 'center', marginTop: 12 },
  offerButtonText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  waitingNote: { backgroundColor: '#202824', padding: 9, borderRadius: 9, marginTop: 11 },
  waitingText: { color: '#B7C3BA', fontSize: 10, lineHeight: 15 },
  claimedNote: { backgroundColor: colors.green, padding: 9, borderRadius: 9, marginTop: 11 },
  claimedNoteText: { color: colors.greenInk, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  chat: { backgroundColor: '#101614', borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 11, marginTop: 9, gap: 7 },
  chatTitle: { color: '#C9ECA9', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  chatHint: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  firstMessage: { color: '#9AA69E', fontSize: 10, fontStyle: 'italic', paddingVertical: 5 },
  messageBubble: { maxWidth: '88%', borderRadius: 11, paddingVertical: 7, paddingHorizontal: 9 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#244333' },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  messageAuthor: { color: '#A5B1A9', fontSize: 8, fontWeight: '800', marginBottom: 2 },
  messageText: { color: colors.ink, fontSize: 11, lineHeight: 16 },
  fileLink: { color: '#D2F0B1', fontSize: 11, lineHeight: 17, textDecorationLine: 'underline' },
  chatError: { color: '#F0B08A', fontSize: 9 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 3 },
  messageInput: { flex: 1, minHeight: 38, maxHeight: 90, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8, color: colors.ink, fontSize: 11 },
  sendButton: { backgroundColor: colors.forest, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  sendButtonText: { color: '#172319', fontSize: 10, fontWeight: '800' },
  voiceButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  voiceButtonText: { color: '#CDD8D0', fontSize: 10, fontWeight: '700' },
  privacyNote: { backgroundColor: '#1B2822', borderRadius: 13, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 },
  lock: { color: '#B6E2C4', fontSize: 16, fontWeight: '800' },
  privacyText: { color: '#B4C3B8', fontSize: 9, lineHeight: 14, flex: 1 },
  hostNote: { color: '#9AA69E', fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: 12 },
});

