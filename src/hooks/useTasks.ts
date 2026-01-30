/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/api';

type UseTasksOptions = {
  userId?: string | null;
};

function normalizeTask(t: any) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    project: t.project ?? null,
    billable: !!t.billable,

    // 🔥 ISSO AQUI É O BUG
    status: t.status ?? 'backlog',

    defaultDuration:
      t.default_duration ?? t.defaultDuration ?? '8h',

    userId: t.user_id ?? t.userId,

    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

export function useTasks(options?: UseTasksOptions) {
  const userId = options?.userId ?? null;

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 🔄 Load
   */
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await api.get('/tasks', {
        params: userId ? { userId } : undefined,
      });

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
        ? data.rows
        : [];

      setTasks(rows.map(normalizeTask));
    } catch (e) {
      console.error('Erro ao carregar tasks', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * ➕ Create
   */
  const create = useCallback(
    async (task: any) => {
      if (!userId) {
        console.warn('create abortado: userId ausente');
        return;
      }

      await api.post('/tasks', {
        ...task,
        userId, // ✅ O BACKEND ESPERA ISSO
      });

      await load();
    },
    [load, userId]
  );

  /**
   * ✏️ Update
   */
  const update = useCallback(
    async (id: string, task: any) => {
      if (!id || !userId) return;

      await api.put(`/tasks/${id}`, {
        ...task,
        userId, // ✅ O BACKEND ESPERA ISSO
      });

      await load();
    },
    [load, userId]
  );

  /**
   * 🗑️ Remove
   */
  const remove = useCallback(
    async (id: string) => {
      if (!id) return;

      setTasks((prev) => prev.filter((t) => t.id !== id));

      try {
        await api.delete(`/tasks/${id}`);
      } catch (e) {
        console.error('Erro ao deletar task', e);
        await load();
      }
    },
    [load]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    tasks,
    loading,
    create,
    update,
    remove,
    reload: load,
  };
}
