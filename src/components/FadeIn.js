import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function FadeIn({ children, style, duration = 180 }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [opacity, duration]);

  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
}