import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function MapViewComponent({ 
  mapRef, 
  mapRegion, 
  location, 
  style,
  children 
}) {
  return (
    <MapView
      ref={mapRef}
      style={style}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={mapRegion}
      showsUserLocation={true}
      showsMyLocationButton={false}
      showsCompass={false}
    >
      {location && (
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="Your Location"
        >
          <View style={styles.driverMarker}>
            <Text style={styles.driverMarkerText}>🚐</Text>
          </View>
        </Marker>
      )}
      {children}
    </MapView>
  );
}

const styles = StyleSheet.create({
  driverMarker: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarkerText: {
    fontSize: 24,
  },
});
