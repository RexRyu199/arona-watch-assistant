function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matches(text, key) {
  if (key.endsWith('*')) {
    const stem = key.slice(0, -1);
    return text.split(' ').some((w) => w.startsWith(stem));
  }
  return ` ${text} `.includes(` ${key} `);
}

export default function useVoiceCommands(actions) {
  const table = [
    // ---- cronometro ----
    [['reinici*', 'resete*', 'reset', 'limpi*', 'borr*', 'cero', 'pon en cero'], 'CRONO RST', actions.resetStopwatch],
    [['iniciar', 'inicia', 'inicie', 'empezar', 'empieza', 'empiece', 'comenzar', 'comienza', 'arrancar', 'arranca', 'arranque', 'start'], 'CRONO ON', actions.startStopwatch],
    [['detener', 'detente', 'detenlo', 'deten', 'parar', 'pare', 'pausa', 'pausar', 'pausalo', 'stop', 'alto', 'frenar', 'frena', 'freno'], 'CRONO OFF', actions.stopStopwatch],
    [['ver cronometro', 'mostrar cronometro', 'ver crono', 'mostrar crono'], 'CRONO', () => actions.focus('crono')],
    [['cronometro', 'crono', 'timer', 'temporizador'], 'CRONO', actions.toggleStopwatch],

    // ---- clima completo ----
    [
      ['reporte del clima', 'reporte clima', 'actualizar clima', 'actualizar', 'clima', 'weather', 'pronostico', 'lluvia', 'llueve', 'viento', 'humedad', 'sensacion'],
      'CLIMA',
      actions.weather,
    ],

    // ---- temperatura ----
    [['temperatura', 'temp', 'tmp', 'grados', 'calor', 'frio'], 'TEMP', () => actions.focus('temp')],

    // ---- pasos ----
    [['pasos', 'paso', 'contador', 'caminar', 'caminata', 'mision', 'xp', 'meta', 'steps'], 'PASOS', () => actions.focus('steps')],

    // ---- bateria ----
    [['bateria', 'energia', 'bat', 'carga', 'pila', 'pwr', 'power'], 'PWR', () => actions.focus('battery')],

    // ---- fecha y hora ----
    [['fecha', 'dia', 'hoy', 'date', 'calendario'], 'FECHA', () => actions.focus('date')],
    [['hora', 'tiempo', 'reloj', 'time'], 'HORA', () => actions.focus('time')],

    // ---- sistema ----
    [['ambient', 'ambiente', 'dormir', 'descansar', 'suspender', 'apagar', 'negro', 'ahorro'], 'AMBIENT', actions.ambient],
    [['inicio', 'volver', 'salir', 'regresar', 'cerrar', 'cancelar', 'normal', 'todo', 'menu', 'home'], 'INICIO', actions.clearFocus],
    [['ayuda', 'comandos', 'help', 'lista', 'opciones'], 'AYUDA', () => actions.focus('help')],
  ];

  return function handleTranscript(text) {
    const t = normalize(text || '');
    if (!t) return '';
    for (const [keys, label, fn] of table) {
      if (keys.some((k) => matches(t, k))) {
        fn();
        return `> OK: ${label}`;
      }
    }
    return '> CMD DESCONOCIDO (di AYUDA)';
  };
}