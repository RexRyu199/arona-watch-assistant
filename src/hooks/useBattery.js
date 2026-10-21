import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';

export default function useBattery() {
  const [level, setLevel] = useState(null);

  useEffect(() => {
    let sub;
    Battery.getBatteryLevelAsync().then((l) => {
      if (l >= 0) setLevel(Math.round(l * 100));
    });
    sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      if (batteryLevel >= 0) setLevel(Math.round(batteryLevel * 100));
    });
    return () => sub && sub.remove();
  }, []);

  return level;
}