import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();
const CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

function readProfile() {
  try { return typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('nexo.profile') || 'null') : null; } catch { return null; }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<{ name: string; email?: string } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const redirectUri = Platform.OS === 'web'
    ? AuthSession.makeRedirectUri({ path: 'nexomates' })
    : AuthSession.makeRedirectUri({ scheme: 'nexoestudio' });
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: CLIENT_ID || 'google-client-id-not-configured.apps.googleusercontent.com',
    responseType: AuthSession.ResponseType.Token,
    scopes: ['openid', 'email', 'profile'],
    redirectUri,
    extraParams: { prompt: 'select_account' },
  }, discovery);

  useEffect(() => { setProfile(readProfile()); }, []);
  useEffect(() => {
    if (response?.type !== 'success') return;
    const accessToken = response.authentication?.accessToken;
    if (!accessToken) { setError('Google no devolvió un token de acceso.'); return; }
    setBusy(true);
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => { if (!res.ok) throw new Error('Google no pudo confirmar tu perfil.'); return res.json(); })
      .then((user) => {
        const next = { name: user.name || user.email?.split('@')[0] || 'Estudiante', email: user.email };
        window.localStorage.setItem('nexo.profile', JSON.stringify(next));
        window.localStorage.setItem('nexo.name', next.name);
        window.localStorage.setItem('nexo.clientId', user.id || user.email);
        setProfile(next);
      }).catch((err) => setError(err.message || 'No se pudo iniciar sesión.')).finally(() => setBusy(false));
  }, [response]);

  if (profile) return <>{children}</>;

  const continueAsGuest = () => {
    const guest = { name: name.trim() || 'Estudiante' };
    window.localStorage.setItem('nexo.profile', JSON.stringify(guest));
    window.localStorage.setItem('nexo.name', guest.name);
    setProfile(guest);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.mark}>✳</Text>
        <Text style={styles.brand}>nexo</Text>
        <Text style={styles.title}>Aprender en compañía</Text>
        <Text style={styles.copy}>Entra para pedir apoyo, conversar y compartir recursos con otros estudiantes.</Text>
        <Pressable disabled={!CLIENT_ID || !request || busy} onPress={() => { setError(''); void promptAsync(); }} style={[styles.google, (!CLIENT_ID || !request || busy) && styles.disabled]}>
          {busy ? <ActivityIndicator color="#151A17" /> : <Text style={styles.googleText}>G  Continuar con Google</Text>}
        </Pressable>
        {!CLIENT_ID ? <Text style={styles.setup}>El acceso de Google quedará activo al configurar el client ID OAuth.</Text> : null}
        <View style={styles.divider}><View style={styles.rule} /><Text style={styles.or}>O entra con un apodo</Text><View style={styles.rule} /></View>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Tu nombre o apodo" placeholderTextColor="#87938C" maxLength={40} />
        <Pressable onPress={continueAsGuest} style={styles.guest}><Text style={styles.guestText}>Continuar sin cuenta  →</Text></Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.privacy}>Tu nombre aparecerá en tus solicitudes y mensajes.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D1112', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 390, alignSelf: 'center', backgroundColor: '#171F1D', borderColor: '#2C3833', borderWidth: 1, borderRadius: 26, padding: 24, alignItems: 'center' },
  mark: { color: '#C2B0FF', fontSize: 28 }, brand: { color: '#D2F0B1', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  title: { color: '#EEF3EF', fontSize: 21, fontWeight: '800', marginTop: 22 }, copy: { color: '#A3AEA7', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  google: { backgroundColor: '#D2F0B1', width: '100%', borderRadius: 13, padding: 14, alignItems: 'center' }, googleText: { color: '#172319', fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.55 },
  setup: { color: '#A3AEA7', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 9 }, divider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 21, width: '100%' }, rule: { height: 1, flex: 1, backgroundColor: '#2C3833' }, or: { color: '#A3AEA7', fontSize: 10 },
  input: { width: '100%', backgroundColor: '#101614', borderColor: '#2C3833', borderWidth: 1, borderRadius: 11, padding: 12, color: '#EEF3EF', fontSize: 13 }, guest: { padding: 13, marginTop: 6 }, guestText: { color: '#D2F0B1', fontSize: 13, fontWeight: '800' }, error: { color: '#F0B08A', fontSize: 12, marginTop: 8 }, privacy: { color: '#78847D', fontSize: 10, textAlign: 'center', marginTop: 14 },
});
