/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/api';

export type Report = {
  id: string;
  user_id: string;
  sender_email: string;
  destination_email: string;
  period_start: string;
  period_end: string;
  format: 'csv' | 'pdf' | 'pdf+csv';
  created_at: string;
};

export type SendReportPayload = {
  userId: string;
  senderEmail: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  format: 'csv' | 'pdf' | 'pdf+csv';
};

export type SendReportResponse = {
  id: string;
  message: string;
  destinationEmail: string;
  files: {
    csvBase64?: string | null;
    pdfBase64?: string | null;
  };
};

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] =
    useState<SendReportResponse | null>(null);

  /**
   * =========================
   * LISTA HISTÓRICO
   * =========================
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports');
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar reports', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * =========================
   * ENVIA REPORT
   * =========================
   */
  const send = useCallback(
    async (payload: SendReportPayload) => {
      setLoading(true);
      try {
        const { data } = await api.post<SendReportResponse>(
          '/reports/send',
          payload
        );

        setLastResult(data);

        // 🔁 atualiza histórico após envio
        await load();

        return data;
      } catch (err) {
        console.error('Erro ao enviar report', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  /**
   * =========================
   * LIMPA RESULTADO (🔥 CRÍTICO)
   * =========================
   */
  const clearLastResult = useCallback(() => {
    setLastResult(null);
  }, []);

  /**
   * =========================
   * INIT
   * =========================
   */
  useEffect(() => {
    load();
  }, [load]);

  return {
    reports,
    loading,
    lastResult,
    send,
    clearLastResult,
    reload: load,
  };
}
