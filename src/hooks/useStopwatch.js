import { useCallback, useEffect, useRef, useState } from 'react';

export default function useStopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const runningRef = useRef(false);
  const startRef = useRef(0);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(baseRef.current + (Date.now() - startRef.current));
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    startRef.current = Date.now();
    runningRef.current = true;
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    if (!runningRef.current) return;
    baseRef.current = baseRef.current + (Date.now() - startRef.current);
    runningRef.current = false;
    setElapsed(baseRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    baseRef.current = 0;
    runningRef.current = false;
    setElapsed(0);
    setRunning(false);
  }, []);

  return { running, elapsed, start, stop, reset };
}