# Arona: asistente de voz para reloj (simulado en iPhone)

App hecha con React Native y Expo (SDK 57) que simula un reloj inteligente con un asistente de voz. La pantalla está vacía hasta que se le pide algo: se dice "Oye Arona" seguido de un comando, y el reloj responde mostrando la información y diciéndola en voz alta.

## Funciones

- Palabra de activación "Arona" con escucha continua
- Respuesta en pantalla y por voz (`expo-speech`)
- Hora, fecha, pasos (podómetro), temperatura y clima completo (Open-Meteo, caché de 30 min), batería y cronómetro
- Filtro de ruido de fondo para no activarse con sonidos ambientales
- Campo de texto como respaldo para escribir comandos

## Comandos de ejemplo

- "Oye Arona, dame la hora"
- "Arona, pasos" / "Arona, clima" / "Arona, batería" / "Arona, fecha"
- "Arona, inicia el cronómetro" / "pausa" / "reinicia"
- Solo "Oye Arona" y esperar el "Dime"
- Mantener presionado el círculo: enciende o apaga la escucha

## Requisitos

- Node.js y npm
- App Expo Go en el iPhone (versión compatible con SDK 57)
- Cuenta gratuita de Expo, con sesión iniciada en la terminal (`npx expo login`) y en Expo Go
- API key de Groq para la transcripción de voz (Whisper)

## Instalación

```bash
git clone https://github.com/RexRyu199/arona-watch-assistant.git
cd arona-watch-assistant
npm install
```

Crea `src/secrets.js` copiando `src/secrets.example.js` y pega tu API key:

```js
export const STT_API_KEY = 'tu_api_key';
```

Inicia el proyecto y escanea el QR con la cámara del iPhone:

```bash
npx expo start -c
```

## Limitaciones

- Corre en Expo Go, simulando el reloj dentro del teléfono. No es una app nativa de Wear OS.
- La palabra de activación se detecta transcribiendo el audio en la nube, por lo que necesita internet y tarda 1 a 3 segundos. Una versión nativa podría hacerlo de forma local.
- Solo funciona con la app abierta y la pantalla encendida.