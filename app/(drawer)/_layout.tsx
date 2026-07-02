// app/(drawer)/_layout.tsx
// Swipe-from-left drawer navigation. The bottom tab bar is gone; every
// destination is reached from Home or by pulling the drawer out.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CopticCross from '../../src/components/CopticCross';
import { Colors, Spacing } from '../../src/constants/theme';

function DrawerHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.brand, { paddingTop: insets.top + Spacing.lg }]}>
      <CopticCross size={40} color={Colors.gold} />
      <Text style={styles.brandName}>Nepsis</Text>
      <Text style={styles.brandSub}>watchfulness of the heart</Text>
    </View>
  );
}

function CustomDrawerContent(props: any) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }}>
      <DrawerHeader />
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 8 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={CustomDrawerContent}
      screenOptions={{
        headerShown: false,
        swipeEnabled: true,
        swipeEdgeWidth: 60,
        drawerActiveTintColor: Colors.gold,
        drawerInactiveTintColor: Colors.goldMuted,
        drawerActiveBackgroundColor: 'rgba(232,199,106,0.12)',
        drawerLabelStyle: { fontSize: 15, marginLeft: -8 },
      }}
    >
      <Drawer.Screen name="index"      options={{ title: 'Home' }} />
      <Drawer.Screen name="stillness"  options={{ title: 'Watchfulness' }} />
      <Drawer.Screen name="psalms"     options={{ title: 'Psalms' }} />
      <Drawer.Screen name="scripture"  options={{ title: 'Reading Plans' }} />
      <Drawer.Screen name="rule"       options={{ title: 'Canon' }} />
      <Drawer.Screen name="confession" options={{ title: 'Confession' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  brand:     { alignItems: 'center', paddingBottom: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: 'rgba(232,199,106,0.2)' },
  brandName: { color: Colors.gold, fontSize: 22, fontWeight: '500', letterSpacing: 2, marginTop: 10 },
  brandSub:  { color: Colors.goldMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
});
