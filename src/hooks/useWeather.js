import { useCallback, useEffect, useState } from 'react';
import { getWeather } from '../services/weatherCache';
import { CONFIG } from '../theme';

export default function useWeather() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (force = false) => {
    try {
      const d = await getWeather(force);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh(false);
    const id = setInterval(() => refresh(false), CONFIG.weatherCooldownMs);
    return () => clearInterval(id);
  }, [refresh]);

  return { temp: data ? data.temp : null, data, error, refresh };
}