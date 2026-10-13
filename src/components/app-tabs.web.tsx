import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={styles.tabBar}>
          <TabTrigger name="home" href="/" asChild><TabButton icon="⌂">Inicio</TabButton></TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild><TabButton icon="↗">Ayuda</TabButton></TabTrigger>
          <TabTrigger name="activities" href="/activities" asChild><TabButton icon="▧">Actividades</TabButton></TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: string }) {
  return (
    <Pressable {...props} style={[styles.tab, isFocused && styles.selectedTab]}>
      <Text style={[styles.tabIcon, isFocused && styles.selectedText]}>{icon}</Text>
      <Text style={[styles.tabLabel, isFocused && styles.selectedText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#111716',
    borderTopWidth: 1,
    borderTopColor: '#27332E',
    paddingTop: 8,
    paddingBottom: 15,
    paddingHorizontal: 12,
  },
  tab: { minWidth: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10, gap: 2 },
  selectedTab: { backgroundColor: '#25332C' },
  tabIcon: { color: '#9BA9A0', fontSize: 17, lineHeight: 19 },
  tabLabel: { color: '#AAB5AE', fontSize: 10, fontWeight: '700' },
  selectedText: { color: '#D2F0B1' },
});
