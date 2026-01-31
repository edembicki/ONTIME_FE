/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/api';

export type Sheet = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function useSheets() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * =========================
   * LOAD
   * =========================
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sheets');
      setSheets(data);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * =========================
   * CREATE
   * =========================
   */
  const create = useCallback(
    async (payload: {
      name: string;
      description?: string;
      color?: string;
    }) => {
      await api.post('/sheets', payload);
      await load();
    },
    [load]
  );

  /**
   * =========================
   * UPDATE
   * =========================
   */
  const update = useCallback(
    async (
      id: string,
      payload: {
        name?: string;
        description?: string;
        color?: string;
      }
    ) => {
      await api.put(`/sheets/${id}`, payload);
      await load();
    },
    [load]
  );

  /**
   * =========================
   * REMOVE
   * =========================
   */
  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/sheets/${id}`);
      await load();
    },
    [load]
  );

  /**
   * =========================
   * INIT
   * =========================
   */
  useEffect(() => {
    load();
  }, [load]);

  return {
    sheets,
    loading,
    create,
    update,
    remove,
    reload: load,
  };
}
