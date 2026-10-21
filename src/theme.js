export const COLORS = {
  bg: '#000000',
  green: '#33FF33',
  dim: '#1A8A1A',
  ambient: '#555555',
  warn: '#FFB000',
};

export const FONT = 'PressStart2P_400Regular';

export const CONFIG = {
  stepGoal: 10000,
  weatherCooldownMs: 30 * 60 * 1000, // cache del clima: 30 min
  focusMs: 5000,                     // cuanto dura el "foco" de un comando
  stepPollMs: 15000,                 // el podometro se lee por rafagas
  ambientClockMs: 60000,             // en ambient el reloj se actualiza cada minuto
  listenMaxMs: 6000,                 // maximo de grabación por frase

  // ---- Ambient automatico y levantar para despertar ----
  ambientAfterMs: 30000,             // inactividad antes de entrar a ambient
  wakeSampleMs: 200,                 // el acelerometro se lee 5 veces por segundo, solo en ambient
  wakeWindowMs: 1000,                // se compara la posicion actual contra hace 1 s
  wakeAngleDeg: 35,                  // giro minimo para considerar "levanto la muñeca"
  wakeMinFacing: 0.4,                // la pantalla debe quedar inclinada hacia ti (0 a 1)
  wakeCooldownMs: 2500,              // tiempo minimo entre despertares

  // ---- Escucha continua ----
  voiceThresholdDb: -35,             // volumen minimo que cuenta como "voz" (-160 a 0). Sube a -30 si hay ruido, baja a -42 si no te detecta
  voiceMarginDb: 13,                 // cuanto debe superar la voz al ruido de fondo. Sube a 16 si aun se activa con ruido, baja a 8 si no te detecta
  voiceMinTicks: 6,                  // decimas de segundo con voz para enviar a transcribir (6 = 0.6 s). Baja a 4 si se pierde un "Arona" dicho rapido
  silenceEndMs: 900,                 // silencio que cierra la frase
  idleSegmentMs: 3000,               // si nadie habla, se reinicia el segmento cada 3 s
  listenCooldownMs: 600,             // pausa tras cada frase (rafagas, termico)
  continuousIdleOffMs: 10 * 60 * 1000, // se apaga sola tras 10 min sin que se diga "Arona"
  continuousMaxWords: 4,             // en modo continuo solo frases cortas

  sttUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',
  sttModel: 'whisper-large-v3-turbo',
  sttPrompt:
    'Oye Arona, dame la hora. Arona: hora, fecha, pasos, temperatura, batería, clima, cronómetro, iniciar, pausa, detener, reiniciar, volver, ayuda',
};