import { PressStart2P_400Regular, useFonts } from '@expo-google-fonts/press-start-2p';
import { setAudioModeAsync } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import FadeIn from './components/FadeIn';
import useBattery from './hooks/useBattery';
import useClock from './hooks/useClock';
import useContinuousListening from './hooks/useContinuousListening';
import usePedometer from './hooks/usePedometer';
import useStopwatch from './hooks/useStopwatch';
import useVoiceCommands from './hooks/useVoiceCommands';
import useWeather from './hooks/useWeather';
import { getWeather } from './services/weatherCache';
import { COLORS, CONFIG, FONT } from './theme';

const SHAPE = 'round'; // 'round' o 'square'

const WAKE = ['arona', 'arrona', 'harona', 'aurona', 'orona', 'aurora', 'arora'];
const FOLLOW_UP_MS = 14000; 

const { width: SCREEN_W } = Dimensions.get('window');
const SIZE = Math.min(SCREEN_W - 28, 400); 
const BEZEL = SIZE + 22; 
const RADIUS = SHAPE === 'round' ? SIZE / 2 : 40;
const UNDER_H = 84;
const TEXT_W = SCREEN_W - 40;
const fs = (n) => Math.max(6, Math.round(SIZE * n));

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DAYS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const DAYS_FULL = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const HELP_LINES = ['HORA  FECHA  PASOS', 'TEMP  PWR  CLIMA', 'CRONO  INICIAR', 'PAUSA  REINICIAR', 'VOLVER'];
const CARD_MS = { crono: 10000, weather: 9000, help: 12000, listening: FOLLOW_UP_MS };
const STATE_LABEL = {
  idle: 'MIC APAGADO',
  live: 'ESCUCHANDO',
  hear: 'OYENDO',
  busy: 'PROCESANDO',
  talk: 'HABLANDO',
};

const pad = (n) => String(n).padStart(2, '0');

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\ba rona\b/g, 'arona')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatStopwatch(ms) {
  const total = Math.floor(ms / 100);
  const tenths = total % 10;
  const secs = Math.floor(total / 10) % 60;
  const mins = Math.floor(total / 600);
  return `${pad(mins)}:${pad(secs)}.${tenths}`;
}

function timeSentence(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 || 12;
  const period = h < 12 ? 'de la mañana' : h < 19 ? 'de la tarde' : 'de la noche';
  const head = h12 === 1 ? 'Es la una' : `Son las ${h12}`;
  return `${head}${m === 0 ? ' en punto' : ` con ${m}`} ${period}`;
}

function weatherSentence(d) {
  let s = `Hay ${d.temp} grados, ${String(d.text).toLowerCase()}.`;
  if (d.max !== null && d.min !== null) s += ` Máxima de ${d.max} y mínima de ${d.min}.`;
  if (d.rain !== null) s += ` Probabilidad de lluvia de ${d.rain} por ciento.`;
  return s;
}

function StateLabel({ state }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const pulsing = state === 'live' || state === 'hear' || state === 'talk';

  useEffect(() => {
    if (!pulsing) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, opacity]);

  const hot = state === 'hear' || state === 'talk';
  return (
    <Animated.Text
      style={[
        styles.stateLabel,
        { fontSize: fs(0.03), color: hot ? COLORS.warn : COLORS.dim, opacity },
      ]}
    >
      {`(o) ${STATE_LABEL[state] || ''}`}
    </Animated.Text>
  );
}

export default function AssistantApp() {
  useKeepAwake();
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  const [card, setCard] = useState(null); 
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [feedback, setFeedback] = useState('> DI: OYE ARONA, DAME LA HORA');
  const [heard, setHeard] = useState('');
  const [wantListen, setWantListen] = useState(true); 
  const [speaking, setSpeaking] = useState(false);
  const [appActive, setAppActive] = useState(true);

  const cardTimer = useRef(null);
  const speakGuard = useRef(null);
  const followUntil = useRef(0);

  const now = useClock(card ? 1000 : 60000);
  const battery = useBattery();
  const { steps, available } = usePedometer(appActive);
  const weather = useWeather();
  const stopwatch = useStopwatch();

  const pct = Math.min(steps / CONFIG.stepGoal, 1);

  const showCard = (kind) => {
    clearTimeout(cardTimer.current);
    setCard({ kind, id: Date.now() });
    cardTimer.current = setTimeout(() => setCard(null), CARD_MS[kind] || 7000);
  };

  const clearCard = () => {
    clearTimeout(cardTimer.current);
    setCard(null);
  };

  const say = async (text) => {
    if (!text) return;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch (e) {}
    Speech.stop();
    setSpeaking(true);
    clearTimeout(speakGuard.current);
    const done = () => {
      clearTimeout(speakGuard.current);
      setSpeaking(false);
    };
    speakGuard.current = setTimeout(done, Math.min(3000 + text.length * 90, 12000));
    Speech.speak(text, { language: 'es-MX', rate: 0.95, onDone: done, onStopped: done, onError: done });
  };

  const sentenceFor = (key) => {
    const d = new Date();
    switch (key) {
      case 'time':
        return timeSentence(d);
      case 'date':
        return `Hoy es ${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
      case 'steps':
        return available
          ? `Llevas ${steps} pasos, el ${Math.round(pct * 100)} por ciento de tu meta`
          : 'No tengo acceso al podómetro';
      case 'temp':
        return weather.temp !== null ? `Hay ${weather.temp} grados` : 'Aún no tengo la temperatura';
      case 'battery':
        return battery !== null ? `Tu batería está al ${battery} por ciento` : 'No pude leer la batería';
      case 'help':
        return 'Puedes pedirme la hora, la fecha, tus pasos, el clima, la batería o el cronómetro';
      default:
        return '';
    }
  };

  const handleTranscript = useVoiceCommands({
    weather: async () => {
      try {
        const d = await getWeather(true); // ignora la cache
        weather.refresh(false);
        showCard('weather');
        say(weatherSentence(d));
      } catch (e) {
        showCard('unknown');
        say('No pude obtener el clima');
      }
    },
    startStopwatch: () => {
      stopwatch.start();
      showCard('crono');
      say('Cronómetro iniciado');
    },
    stopStopwatch: () => {
      stopwatch.stop();
      showCard('crono');
      say('Cronómetro detenido');
    },
    resetStopwatch: () => {
      stopwatch.reset();
      showCard('crono');
      say('Cronómetro en cero');
    },
    toggleStopwatch: () => {
      if (stopwatch.running) {
        stopwatch.stop();
        say('Cronómetro detenido');
      } else {
        stopwatch.start();
        say('Cronómetro iniciado');
      }
      showCard('crono');
    },
    focus: (key) => {
      showCard(key);
      say(sentenceFor(key));
    },
    clearFocus: () => {
      Speech.stop();
      setSpeaking(false);
      clearCard();
    },
    ambient: () => {
      clearCard();
      say('Entendido');
    },
  });

  const processVoice = (text) => {
    setHeard(text);
    const words = normalize(text).split(' ').filter(Boolean);
    const idx = words.findIndex((w) => WAKE.includes(w));
    const follow = Date.now() < followUntil.current;
    if (idx < 0 && !follow) return false; 

    followUntil.current = 0;
    const rest = (idx >= 0 ? words.slice(idx + 1) : words).join(' ');

    if (!rest) {
      followUntil.current = Date.now() + FOLLOW_UP_MS;
      showCard('listening');
      setFeedback('> DIME...');
      say('Dime');
      return true;
    }

    const res = handleTranscript(rest);
    if (res.includes('DESCONOCIDO')) {
      showCard('unknown');
      setFeedback('> NO ENTENDI');
      say('No te entendí');
    } else {
      setFeedback(res);
    }
    return true;
  };

  const continuous = useContinuousListening(
    wantListen && appActive && !speaking,
    processVoice,
    setFeedback,
    () => setWantListen(false)
  );

  const listening = wantListen && appActive;
  const micState = speaking
    ? 'talk'
    : listening
    ? continuous.state === 'off'
      ? 'live'
      : continuous.state
    : 'idle';

  // Mantener presionado el circulo: enciende o apaga la escucha
  const toggleListen = () => {
    Speech.stop();
    setSpeaking(false);
    const next = !wantListen;
    setWantListen(next);
    setFeedback(next ? '> ESCUCHA ON: DI "OYE ARONA"' : '> ESCUCHA OFF');
  };

  const submitTyped = () => {
    const res = handleTranscript(input);
    setFeedback(res);
    if (res.includes('DESCONOCIDO')) showCard('unknown');
    setInput('');
    setTyping(false);
  };

  // Al salir de la app se detiene la escucha y la voz
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      const active = s === 'active';
      setAppActive(active);
      if (!active) {
        Speech.stop();
        setSpeaking(false);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(
    () => () => {
      clearTimeout(cardTimer.current);
      clearTimeout(speakGuard.current);
      Speech.stop();
    },
    []
  );

  if (!fontsLoaded) return <View style={styles.root} />;

  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const dateStr = `${DAYS[now.getDay()]} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
  const w = weather.data;
  const barW = SIZE * 0.5;

  const views = {
    time: { tag: 'HORA', big: `${hh}:${mm}`, size: 0.14, lines: [dateStr] },
    date: {
      tag: 'FECHA',
      big: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`,
      size: 0.14,
      lines: [DAYS_FULL[now.getDay()], String(now.getFullYear())],
    },
    steps: {
      tag: 'MISION',
      big: available ? String(steps) : 'N/A',
      size: 0.13,
      progress: pct,
      lines: [`XP ${Math.round(pct * 100)}% / ${CONFIG.stepGoal}`],
    },
    temp: { tag: 'TEMP', big: weather.temp !== null ? `${weather.temp}C` : '--', size: 0.15, lines: ['EXTERIOR'] },
    weather: w
      ? {
          tag: 'CLIMA',
          big: `${w.temp}C`,
          size: 0.14,
          lines: [
            `${w.icon} ${w.text}`,
            `MAX ${w.max ?? '--'} MIN ${w.min ?? '--'}`,
            `HUM ${w.humidity ?? '--'}% LLUV ${w.rain ?? '--'}%`,
          ],
        }
      : {
          tag: 'CLIMA',
          big: '--',
          size: 0.14,
          lines: [weather.error === 'NO_LOCATION' ? 'SIN UBICACION' : 'SIN DATOS'],
        },
    battery: {
      tag: 'ENERGIA',
      big: battery !== null ? `${battery}%` : '--',
      size: 0.15,
      progress: battery !== null ? battery / 100 : 0,
      lines: [],
    },
    crono: {
      tag: 'CRONO',
      big: formatStopwatch(stopwatch.elapsed),
      size: 0.09,
      lines: [stopwatch.running ? '>> EN CURSO' : '|| DETENIDO'],
    },
    help: { tag: 'ARONA PUEDE', big: null, lines: HELP_LINES },
    listening: { tag: 'ARONA', big: 'DIME...', size: 0.08, lines: [] },
    unknown: { tag: 'ARONA', big: '?', size: 0.15, lines: ['NO ENTENDI'] },
  };
  const v = card ? views[card.kind] || views.unknown : null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.stage}>
          <View style={styles.group}>
            <Pressable onLongPress={toggleListen} delayLongPress={700} style={{ marginTop: UNDER_H }}>
              <View style={[styles.bezel, { borderRadius: RADIUS + 10 }]}>
                <View style={[styles.screen, { borderRadius: RADIUS }]}>
                  {!v && (
                    <View style={styles.idle}>
                      <Text style={[styles.idleName, { fontSize: fs(0.08) }]}>ARONA</Text>
                      <View style={{ marginTop: SIZE * 0.04 }}>
                        <StateLabel state={micState} />
                      </View>
                    </View>
                  )}

                  {v && (
                    <FadeIn key={card.id} duration={150}>
                      <View style={styles.card}>
                        <Text style={[styles.tag, { fontSize: fs(0.03) }]}>{v.tag}</Text>
                        {v.big ? (
                          <Text style={[styles.green, { fontSize: fs(v.size) }]}>{v.big}</Text>
                        ) : null}
                        {v.progress != null && (
                          <View style={[styles.track, { width: barW, marginTop: SIZE * 0.04 }]}>
                            <View
                              style={[styles.fill, { width: `${Math.min(Math.max(v.progress, 0), 1) * 100}%` }]}
                            />
                          </View>
                        )}
                        {v.lines.map((l, i) => (
                          <Text
                            key={i}
                            style={[v.big ? styles.dim : styles.green, { fontSize: fs(0.032), marginTop: SIZE * 0.025 }]}
                          >
                            {l}
                          </Text>
                        ))}
                      </View>
                    </FadeIn>
                  )}

                  <View style={[styles.typeWrap, { bottom: SIZE * 0.08 }]}>
                    <Pressable
                      onPress={() => setTyping(true)}
                      hitSlop={14}
                      style={({ pressed }) => [styles.typeBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.typeText}>[_]</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>

            <View style={styles.under}>
              {typing ? (
                <>
                  <Text style={styles.heard}>{'> ESCRIBE UN COMANDO'}</Text>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={submitTyped}
                    onBlur={() => setTyping(false)}
                    autoFocus
                    placeholder="ej: hora"
                    placeholderTextColor={COLORS.dim}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.feedback} numberOfLines={2}>
                    {feedback}
                  </Text>
                  {heard ? (
                    <Text style={styles.heard} numberOfLines={2}>
                      {`OIDO: "${heard}"`}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  group: { width: BEZEL, height: BEZEL + UNDER_H * 2, alignItems: 'center' },
  bezel: {
    padding: 8,
    borderWidth: 3,
    borderColor: '#0F3F0F',
    backgroundColor: '#050505',
  },
  screen: {
    width: SIZE,
    height: SIZE,
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.dim,
  },
  idle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleName: { fontFamily: FONT, color: '#1F9F1F' },
  stateLabel: { fontFamily: FONT },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SIZE * 0.08,
    paddingHorizontal: SIZE * 0.12,
  },
  tag: { fontFamily: FONT, color: COLORS.dim, marginBottom: SIZE * 0.04 },
  green: { fontFamily: FONT, color: COLORS.green, textAlign: 'center' },
  dim: { fontFamily: FONT, color: COLORS.dim, textAlign: 'center' },
  track: { height: 10, borderWidth: 1, borderColor: COLORS.green },
  fill: { height: '100%', backgroundColor: COLORS.green },
  pressed: { backgroundColor: '#0B2B0B' },
  typeWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  typeBtn: { borderWidth: 1, borderColor: '#0F4F0F', paddingVertical: 5, paddingHorizontal: 14 },
  typeText: { fontFamily: FONT, fontSize: 8, color: COLORS.dim },
  under: { width: TEXT_W, marginTop: 14, alignItems: 'center' },
  feedback: { fontFamily: FONT, fontSize: 7, color: COLORS.warn, lineHeight: 12, textAlign: 'center' },
  heard: { fontFamily: FONT, fontSize: 6, color: COLORS.dim, lineHeight: 11, marginTop: 6, textAlign: 'center' },
  input: {
    alignSelf: 'stretch',
    fontFamily: FONT,
    fontSize: 9,
    color: COLORS.green,
    paddingVertical: 10,
    marginTop: 4,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dim,
  },
});