import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, minTouch, serif, space } from '@/lib/theme';
import { Icon } from './ui';

// Every screen: a plain title (with a back arrow on pushed screens), then content.
// No status pill or avatar in the header (design review, D15).
export function Screen({
  title,
  back,
  right,
  children,
  padded = true,
}: {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  children?: ReactNode;
  padded?: boolean;
}) {
  return (
    // Pushed screens (with a back arrow) have no tab bar, so they also pad for the gesture bar.
    <SafeAreaView style={styles.safe} edges={back ? ['top', 'bottom'] : ['top']}>
      {title ? (
        <View style={styles.header}>
          {back ? (
            <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back" hitSlop={8}>
              <Icon name="arrow-back" size={26} />
            </Pressable>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {right ? <View>{right}</View> : null}
        </View>
      ) : null}
      <View style={[styles.body, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    minHeight: 64,
  },
  back: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center', marginLeft: -space.sm },
  title: { flex: 1, fontFamily: serif, fontSize: font.heading, fontWeight: '700', color: colors.primary },
  body: { flex: 1 },
  padded: { paddingHorizontal: space.md },
});
