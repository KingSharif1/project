import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapViewComponent({ style }) {
  return (
    <View style={[style, styles.webMapPlaceholder]}>
      <Text style={styles.webMapText}>📍</Text>
      <Text style={styles.webMapTitle}>Map View</Text>
      <Text style={styles.webMapSubtext}>Available on mobile device</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webMapPlaceholder: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapText: {
    fontSize: 48,
    marginBottom: 8,
  },
  webMapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  webMapSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
});
