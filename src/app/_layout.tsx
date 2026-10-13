import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import AuthGate from '@/components/auth-gate';

export default function TabLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <AuthGate><AppTabs /></AuthGate>
    </ThemeProvider>
  );
}
