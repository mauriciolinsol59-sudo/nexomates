import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  ink: '#EEF3EF',
  muted: '#A3AEA7',
  paper: '#0D1112',
  white: '#171F1D',
  green: '#20392F',
  greenInk: '#B6E2C4',
  lilac: '#29243B',
  line: '#2C3833',
  orange: '#F3A55D',
};

export default function HomeScreen() {
  const [selectedAnswer, setSelectedAnswer] = useState<'outer' | 'inner' | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topLine}>
          <View>
            <Text style={styles.eyebrow}>NEXO · TU ESPACIO DE ESTUDIO</Text>
            <Text style={styles.greeting}>Hola, estudiante</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>N</Text></View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.pill}><Text style={styles.pillText}>UN PASO A LA VEZ</Text></View>
            <Text style={styles.spark}>✳</Text>
          </View>
          <Text style={styles.heroTitle}>Un error puede ser el inicio de entenderlo.</Text>
          <Text style={styles.heroCopy}>Guarda dónde te atoras. Nexo te ayuda a practicarlo o encontrar a alguien que lo explique en 15 minutos.</Text>
          <Link href="/explore" asChild>
            <Pressable style={styles.heroButton}><Text style={styles.heroButtonText}>Pedir una mano <Text>↗</Text></Text></Pressable>
          </Link>
          <Text style={styles.heroFoot}>AYUDA ENTRE ESTUDIANTES · SESIONES BREVES</Text>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.kicker}>TU RASTRO DE APRENDIZAJE</Text><Text style={styles.sectionTitle}>Lo que estás destrabando</Text></View>
          <Text style={styles.count}>01</Text>
        </View>

        <View style={styles.errorCard}>
          <View style={styles.cardMeta}><Text style={styles.subject}>CÁLCULO I</Text><Text style={styles.openTag}>● POR REVISAR</Text></View>
          <Text style={styles.errorTitle}>Regla de la cadena</Text>
          <Text style={styles.errorCopy}>“Me confundo al derivar una función que está dentro de otra.”</Text>
          <View style={styles.cardDivider} />
          <View style={styles.patternRow}><View style={styles.patternIcon}><Text>↗</Text></View><Text style={styles.patternText}>Ya apareció 2 veces. Practicarlo ahora puede ayudarte con límites.</Text></View>
          <Link href="/explore" asChild>
            <Pressable style={styles.matchButton}><Text style={styles.matchButtonText}>Buscar alguien que lo domine <Text>→</Text></Text></Pressable>
          </Link>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.kicker}>REPASO INTELIGENTE</Text><Text style={styles.sectionTitle}>Una pregunta para ti</Text></View>
          <View style={styles.reviewBadge}><Text style={styles.reviewBadgeText}>2 min</Text></View>
        </View>

        <View style={styles.reviewCard}>
          <View style={styles.reviewTop}><View style={styles.reviewDot} /><Text style={styles.reviewSubject}>BASADO EN TU ERROR DE CÁLCULO</Text></View>
          <Text style={styles.question}>Si f(x) = (3x + 1)², ¿qué función debes derivar primero?</Text>
          <View style={styles.answerRow}>
            <Pressable style={[styles.answer, selectedAnswer === 'outer' && styles.answerSelected]} onPress={() => setSelectedAnswer('outer')}><Text style={[styles.answerText, selectedAnswer === 'outer' && styles.answerSelectedText]}>La función exterior</Text></Pressable>
            <Pressable style={[styles.answer, selectedAnswer === 'inner' && styles.answerIncorrect]} onPress={() => setSelectedAnswer('inner')}><Text style={[styles.answerText, selectedAnswer === 'inner' && styles.answerIncorrectText]}>La función interior</Text></Pressable>
          </View>
          {selectedAnswer === 'outer' ? <Text style={styles.feedback}>¡Eso! Primero identificas la función exterior; después multiplicas por la derivada de la interior.</Text> : selectedAnswer === 'inner' ? <Text style={styles.reviewHint}>Casi: primero deriva la función exterior y luego multiplica por la derivada de la interior.</Text> : <Text style={styles.reviewHint}>Una respuesta rápida sirve para detectar qué paso te falta.</Text>}
        </View>

        <View style={styles.footerNote}><Text style={styles.footerMark}>✳</Text><Text style={styles.footerText}>Aprender juntos, sin tener que saberlo todo.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 100, gap: 20, maxWidth: 620, width: '100%', alignSelf: 'center' },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
  greeting: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: 6, letterSpacing: -0.7 },
  avatar: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#C2B0FF', fontSize: 16, fontWeight: '800' },
  hero: { backgroundColor: '#182824', borderRadius: 24, padding: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#2C4037' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { borderRadius: 20, backgroundColor: '#FFFFFF1C', paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { color: '#DAF1E2', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  spark: { color: '#D1EE9A', fontSize: 24 },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: '800', lineHeight: 33, letterSpacing: -0.8, marginTop: 18, maxWidth: 350 },
  heroCopy: { color: '#D2DDD5', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 390 },
  heroButton: { backgroundColor: '#D7EDAA', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 18 },
  heroButtonText: { color: '#23352D', fontSize: 14, fontWeight: '800' },
  heroFoot: { color: '#AABCB2', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 18 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  kicker: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.15 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, marginTop: 4 },
  count: { color: '#8B9990', fontSize: 12, fontWeight: '800', paddingBottom: 3 },
  errorCard: { backgroundColor: colors.white, borderRadius: 21, padding: 17, borderWidth: 1, borderColor: colors.line },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { color: '#C2B0FF', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  openTag: { color: '#E3B86D', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  errorTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 12 },
  errorCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  cardDivider: { height: 1, backgroundColor: colors.line, marginVertical: 13 },
  patternRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  patternIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  patternText: { color: colors.greenInk, fontSize: 11, lineHeight: 16, fontWeight: '600', flex: 1 },
  matchButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, marginTop: 14, alignItems: 'center' },
  matchButtonText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  reviewBadge: { borderRadius: 20, backgroundColor: colors.lilac, paddingHorizontal: 10, paddingVertical: 6 },
  reviewBadgeText: { color: '#C2B0FF', fontSize: 10, fontWeight: '800' },
  reviewCard: { borderRadius: 21, backgroundColor: '#191A18', borderWidth: 1, borderColor: '#39372E', padding: 17 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reviewDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  reviewSubject: { color: '#E0B879', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  question: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: 12 },
  answerRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  answer: { flex: 1, borderWidth: 1, borderColor: '#3C443F', borderRadius: 11, padding: 11, alignItems: 'center' },
  answerSelected: { backgroundColor: colors.green, borderColor: '#426B54' },
  answerText: { color: '#BBC5BE', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  answerSelectedText: { color: colors.greenInk },
  answerIncorrect: { backgroundColor: '#392822', borderColor: '#7B4A35' },
  answerIncorrectText: { color: '#F0B08A' },
  reviewHint: { color: '#AEB6B0', fontSize: 10, marginTop: 10 },
  feedback: { color: colors.greenInk, fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 11 },
  footerNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingTop: 1 },
  footerMark: { color: '#77946C', fontSize: 15 },
  footerText: { color: colors.muted, fontSize: 11 },
});

