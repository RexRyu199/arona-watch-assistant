import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { STT_API_KEY } from '../secrets';
import { CONFIG } from '../theme';

export async function transcribe(uri) {
  if (!STT_API_KEY || STT_API_KEY.startsWith('PEGA')) {
    throw new Error('FALTA API KEY');
  }

  const form = new FormData();
  form.append('file', new File(uri));
  form.append('model', CONFIG.sttModel);
  form.append('language', 'es');
  form.append('temperature', '0');
  form.append('response_format', 'json');
  form.append('prompt', CONFIG.sttPrompt);

  const res = await fetch(CONFIG.sttUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STT_API_KEY}` },
    body: form,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.text || '').trim();
}