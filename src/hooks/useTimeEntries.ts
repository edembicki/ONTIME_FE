/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/api';

export function useTimeEntries(userId: string) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data } = await api.get('/time-entries', {
        params: { userId },
      });
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const create = useCallback(
    async (entry: any) => {
      if (!userId) {
        console.error('create time-entry sem userId');
        return;
      }

      await api.post('/time-entries', {
        ...entry,
        userId,
      });

      await load();
    },
    [userId, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { entries, loading, create, reload: load };
}
