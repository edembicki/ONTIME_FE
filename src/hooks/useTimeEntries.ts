/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/api';

function normalizeEntry(e: any) {
  return {
    id: e.id,
    taskId: e.taskId ?? e.task_id, // ✅ NORMALIZA
    userId: e.userId ?? e.user_id,
    date: e.date ?? null,
    start: e.start ?? null,
    end: e.end ?? null,
    hours: e.hours ?? null,
    notes: e.notes ?? null,
    task_title: e.task_title ?? e.title ?? '',
  };
}

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

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
        ? data.rows
        : [];

      setEntries(rows.map(normalizeEntry));
    } catch (e) {
      console.error('Erro ao carregar time entries', e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const create = useCallback(
    async (entry: any) => {
      if (!userId) return;

      await api.post('/time-entries', {
        ...entry,
        userId,
      });

      await load();
    },
    [userId, load]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!id) return;

      // optimistic
      setEntries((prev) => prev.filter((e) => e.id !== id));

      try {
        await api.delete(`/time-entries/${id}`);
      } catch (e) {
        console.error('Erro ao remover time entry', e);
        await load(); // rollback
      }
    },
    [load]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { entries, loading, create, remove, reload: load };
}
