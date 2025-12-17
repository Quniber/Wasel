import { Platform, View, Text, StyleProp, ViewStyle } from 'react-native';
import React, { forwardRef } from 'react';

// Platform-specific map imports
let NativeMapView: any = null;
let PROVIDER_GOOGLE: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
  } catch (error) {
    console.warn('react-native-maps failed to load:', error);
  }
}

// Web placeholder component - don't render children to avoid text node issues
const WebMapPlaceholder = forwardRef(({ style, children, ...props }: any, ref) => (
  <View
    style={[
      {
        backgroundColor: '#E8E8E8',
        justifyContent: 'center',
        alignItems: 'center',
      },
      style,
    ]}
  >
    <Text style={{ color: '#666', fontSize: 14 }}>
      Map view (available on mobile)
    </Text>
  </View>
));

// Web-safe marker - ignore all props that might cause issues
const WebMarker = ({ children, ...props }: any) => null;

// Web-safe polyline - just return null
const WebPolyline = (props: any) => null;

// Export platform-specific components with fallbacks
export const MapView = Platform.OS === 'web' || !NativeMapView ? WebMapPlaceholder : NativeMapView;
export const MapMarker = Platform.OS === 'web' || !Marker ? WebMarker : Marker;
export const MapPolyline = Platform.OS === 'web' || !Polyline ? WebPolyline : Polyline;
export const MAP_PROVIDER_GOOGLE = PROVIDER_GOOGLE;

export default MapView;
