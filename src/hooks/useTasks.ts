/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/api';

type UseTasksOptions = {
  userId?: string | null;
};

export function useTasks(options?: UseTasksOptions) {
  const userId = options?.userId ?? null;

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 🔄 Carrega tasks do backend (filtrando por perfil)
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

      // ✅ normaliza campos vindos do backend
      const normalized = rows.map((t: any) => ({
        ...t,
        userId: t.userId ?? t.user_id,
        defaultDuration: t.defaultDuration ?? t.default_duration,
      }));

      setTasks(normalized);
    } catch (e) {
      console.error('Erro ao carregar tasks', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * ➕ Cria task (sempre vinculada ao perfil ativo)
   */
  const create = useCallback(
    async (task: any) => {
      if (!userId) {
        console.warn('create task sem userId');
        return;
      }

      await api.post('/tasks', {
        ...task,
        userId,
      });

      await load();
    },
    [load, userId]
  );

  /**
   * ✏️ Atualiza task (mantém o perfil)
   */
  const update = useCallback(
    async (id: string, task: any) => {
      if (!userId) {
        console.warn('update task sem userId');
        return;
      }

      await api.put(`/tasks/${id}`, {
        ...task,
        userId,
      });

      await load();
    },
    [load, userId]
  );

  /**
   * 🗑️ Remove task
   */
  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/tasks/${id}`);
      await load();
    },
    [load]
  );

  /**
   * 🔁 Recarrega quando:
   * - perfil muda
   * - hook monta
   */
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
