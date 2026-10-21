import * as Location from 'expo-location';
import { CONFIG } from '../theme';

let cache = null;

export function describeWeather(code, isDay = 1) {
  const sun = isDay ? '[SOL]' : '[LUNA]';
  if (code === 0) return { icon: sun, text: 'DESPEJADO' };
  if (code === 1) return { icon: sun, text: 'POCAS NUBES' };
  if (code === 2) return { icon: '[NUBE]', text: 'PARCIAL NUBLADO' };
  if (code === 3) return { icon: '[NUBE]', text: 'NUBLADO' };
  if (code === 45 || code === 48) return { icon: '[NIEBLA]', text: 'NIEBLA' };
  if (code >= 51 && code <= 57) return { icon: '[LLOVIZNA]', text: 'LLOVIZNA' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icon: '[LLUVIA]', text: 'LLUVIA' };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { icon: '[NIEVE]', text: 'NIEVE' };
  }
  if (code >= 95) return { icon: '[TORMENTA]', text: 'TORMENTA' };
  return { icon: '[?]', text: 'SIN DATOS' };
}

const num = (v, fallback = null) => (typeof v === 'number' && !isNaN(v) ? Math.round(v) : fallback);

const isValid = (d) => d && typeof d.text === 'string' && typeof d.icon === 'string';

export async function getWeather(force = false) {
  if (
    !force &&
    cache &&
    isValid(cache.data) &&
    Date.now() - cache.timestamp < CONFIG.weatherCooldownMs
  ) {
    return cache.data;
  }

  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('NO_LOCATION');

  const pos =
    (await Location.getLastKnownPositionAsync()) ||
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  const { latitude, longitude } = pos.coords;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CLIMA HTTP ${res.status}`);
  const json = await res.json();

  const c = json.current || {};
  const d = json.daily || {};
  const desc = describeWeather(c.weather_code, c.is_day);

  const data = {
    temp: num(c.temperature_2m),
    feels: num(c.apparent_temperature),
    humidity: num(c.relative_humidity_2m),
    wind: num(c.wind_speed_10m), 
    code: c.weather_code,
    icon: desc.icon,
    text: desc.text,
    max: num(d.temperature_2m_max && d.temperature_2m_max[0]),
    min: num(d.temperature_2m_min && d.temperature_2m_min[0]),
    rain: num(d.precipitation_probability_max && d.precipitation_probability_max[0]),
  };

  cache = { data, timestamp: Date.now() };
  return data;
}