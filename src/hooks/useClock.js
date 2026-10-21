import { useEffect, useState } from 'react';

export default function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}