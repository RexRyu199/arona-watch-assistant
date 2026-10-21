import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { transcribe } from '../services/transcribe';
import { CONFIG } from '../theme';

const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MARGIN_DB = CONFIG.voiceMarginDb ?? 10; // cuánto debe superar la voz al ruido de fondo
const MIN_TICKS = CONFIG.voiceMinTicks ?? 4; // "tics" de 100 ms con voz para no descartar (4 = 0.4 s)
const MAX_THRESHOLD_DB = -12; // tope para que un cuarto ruidoso aún permita detectar voz

// state: 'off' | 'live' (esperando voz) | 'hear' (detectó voz) | 'busy' (transcribiendo)
export default function useContinuousListening(enabled, onText, onStatus, onStopped) {
  const recorder = useAudioRecorder(OPTIONS);
  const [state, setState] = useState('off');

  const recorderRef = useRef(recorder);
  const onTextRef = useRef(onText);
  const onStatusRef = useRef(onStatus);
  const onStoppedRef = useRef(onStopped);
  const doneRef = useRef(Promise.resolve());
  recorderRef.current = recorder;
  onTextRef.current = onText;
  onStatusRef.current = onStatus;
  onStoppedRef.current = onStopped;

  useEffect(() => {
    if (!enabled) {
      setState('off');
      return;
    }

    let cancelled = false;

    const run = async () => {
      await doneRef.current;
      if (cancelled) return;

      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        onStatusRef.current('> SIN PERMISO DE MICROFONO');
        onStoppedRef.current();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      const rec = recorderRef.current;
      let lastActivity = Date.now();
      let meterSeen = false;
      let floor = null;

      while (!cancelled) {
        try {
          await rec.prepareToRecordAsync();
          rec.record();
        } catch (e) {
          onStatusRef.current(`> ERROR: ${e.message || 'MIC'}`);
          onStoppedRef.current();
          return;
        }
        setState('live');

        const segStart = Date.now();
        let speechStart = 0;
        let lastVoice = 0;
        let voiceTicks = 0;
        let consecutive = 0;
        let sumDb = 0;
        let idleOff = false;
        let noMeter = false;
        let hitMax = false;

        while (!cancelled) {
          await sleep(100);
          const now = Date.now();

          let m;
          try {
            m = rec.getStatus().metering;
          } catch (e) {
            m = undefined;
          }

          if (typeof m === 'number') {
            meterSeen = true;
            const threshold = Math.min(
              Math.max(CONFIG.voiceThresholdDb, (floor === null ? -160 : floor) + MARGIN_DB),
              MAX_THRESHOLD_DB
            );

            if (!speechStart && m > -100) {
              if (floor === null) floor = m;
              else if (m <= threshold) floor = floor * 0.9 + m * 0.1;
            }

            if (m > threshold) {
              voiceTicks += 1;
              consecutive += 1;
              lastVoice = now;
              sumDb += m;
              if (!speechStart && consecutive >= 2) {
                speechStart = now;
                setState('hear');
              }
            } else {
              consecutive = 0;
            }
          } else if (!meterSeen && now - segStart > 1500) {
            noMeter = true;
            break;
          }

          if (speechStart) {
            if (now - lastVoice > CONFIG.silenceEndMs) break;
            if (now - speechStart > CONFIG.listenMaxMs) {
              hitMax = true; 
              break;
            }
          } else {
            if (now - segStart > CONFIG.idleSegmentMs) break;
            if (now - lastActivity > CONFIG.continuousIdleOffMs) {
              idleOff = true;
              break;
            }
          }
        }

        try {
          await rec.stop();
        } catch (e) {}
        if (cancelled) break;

        if (noMeter) {
          onStatusRef.current('> SIN MEDIDOR DE AUDIO');
          onStoppedRef.current();
          break;
        }
        if (idleOff) {
          onStatusRef.current('> ESCUCHA APAGADA (INACTIVIDAD)');
          onStoppedRef.current();
          break;
        }

        if (hitMax) {
          if (voiceTicks) floor = sumDb / voiceTicks;
          continue;
        }

        if (speechStart && voiceTicks >= MIN_TICKS) {
          setState('busy');
          try {
            const text = await transcribe(rec.uri);
            if (!cancelled && text) {
              const ok = onTextRef.current(text);
              if (ok) lastActivity = Date.now();
            }
          } catch (e) {
            onStatusRef.current(`> ERROR: ${e.message || 'MIC'}`);
          }
          await sleep(CONFIG.listenCooldownMs); 
        }
      }
    };

    const p = run().catch(() => {});
    doneRef.current = p;

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { state };
}