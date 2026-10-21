import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { CONFIG } from '../theme';

export default function usePedometer(active) {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!active) return;
    let timer;
    let cancelled = false;

    const read = async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0); 
        const r = await Pedometer.getStepCountAsync(start, new Date());
        if (!cancelled) setSteps(r.steps);
      } catch (e) {
      }
    };

    (async () => {
      const ok = await Pedometer.isAvailableAsync();
      if (!ok) return setAvailable(false);
      const p = await Pedometer.requestPermissionsAsync();
      if (p.status !== 'granted') return setAvailable(false);
      if (cancelled) return;
      read();
      timer = setInterval(read, CONFIG.stepPollMs);
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active]);

  return { steps, available };
}