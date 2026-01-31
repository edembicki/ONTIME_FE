/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Layout,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Space,
  message,
} from 'antd';
import { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';

import { useTasks } from '../hooks/useTasks';
import { useReports } from '../hooks/useReports';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useSheets } from '../hooks/useSheets';
import { TimesheetCalendar } from '../components/TimesheetCalendar';
import { TaskModal } from '../components/TaskModal';

const { RangePicker } = DatePicker;

function downloadBase64File(base64: string, mime: string, filename: string) {
  const a = document.createElement('a');
  a.href = `data:${mime};base64,${base64}`;
  a.download = filename;
  a.click();
}

export default function Dashboard() {
  /* ================= SHEETS ================= */
  const { sheets, create: createSheet, reload: reloadSheets } = useSheets();

  // ✅ sem null pra evitar TS chato
  const [activeSheetId, setActiveSheetId] = useState<string | undefined>(undefined);

  // ✅ resolve sheet ativa sem useEffect (evita cascading renders)
  const resolvedSheetId = useMemo(() => {
    return activeSheetId ?? sheets[0]?.id;
  }, [activeSheetId, sheets]);

  const hasActiveSheet = !!resolvedSheetId;

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetForm] = Form.useForm();

  /* ================= TASKS ================= */
  const {
    tasks,
    create,
    update,
    remove,
    reload: reloadTasks,
  } = useTasks({
    userId: resolvedSheetId, // ✅ undefined quando não tem sheet
  });

  /* =============== TIME ENTRIES ============== */
  const {
    entries,
    create: createEntry,
    remove: removeEntry,
    reload: reloadEntries,
  } = useTimeEntries(resolvedSheetId);

  /* ================= REPORTS ================= */
  const { send: sendReport, loading: sendingReport } = useReports();

  /* ================= UI ================= */
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm] = Form.useForm();

  /* ============== BACKLOG TASKS ============== */
  const backlogTasks = useMemo(() => {
    if (!resolvedSheetId) return [];
    return tasks.filter((t) => t.userId === resolvedSheetId && t.status === 'backlog');
  }, [tasks, resolvedSheetId]);

  /* ================= ACTIONS ================= */

  const handleCreateSheet = useCallback(
    async (values: any) => {
      await createSheet(values);
      await reloadSheets();

      // ✅ seleciona imediatamente a sheet nova (sem effect)
      // se seu backend retornar { id }, isso já funciona:
      // const created = await createSheet(values);
      // setActiveSheetId(created?.id);

      setIsSheetModalOpen(false);
      sheetForm.resetFields();
      message.success('Sheet criada');
    },
    [createSheet, reloadSheets, sheetForm]
  );

  const handleOpenReportModal = useCallback(() => {
    if (!resolvedSheetId) {
      message.warning('Selecione ou crie uma sheet primeiro.');
      return;
    }
    setIsReportModalOpen(true);
  }, [resolvedSheetId]);

  const handleSendReport = useCallback(
    async (values: any) => {
      if (!resolvedSheetId) {
        message.warning('Selecione ou crie uma sheet primeiro.');
        return;
      }

      const [start, end] = values.period;

      const result = await sendReport({
        userId: resolvedSheetId, // ✅ string garantido
        senderEmail: values.senderEmail,
        periodStart: dayjs(start).format('YYYY-MM-DD'),
        periodEnd: dayjs(end).format('YYYY-MM-DD'),
        format: values.format,
      });

      // ✅ Auto-download sem useEffect
      if (result?.files?.pdfBase64) {
        downloadBase64File(
          result.files.pdfBase64,
          'application/pdf',
          `timesheet-${result.id}.pdf`
        );
      }

      if (result?.files?.csvBase64) {
        downloadBase64File(
          result.files.csvBase64,
          'text/csv',
          `timesheet-${result.id}.csv`
        );
      }

      message.success('Relatório enviado');
      setIsReportModalOpen(false);
      reportForm.resetFields();
    },
    [resolvedSheetId, sendReport, reportForm]
  );

  return (
    <>
      <Layout style={{ height: '100vh', padding: 16, background: '#e6e6f0' }}>
        <img src="/logo.svg" width={360} style={{ marginBottom: 8 }} />

        <Row gutter={16} style={{ height: '100%', padding: '1%' }}>
          <Col flex="auto" style={{ height: '100%' }}>
            <Card
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              title={
                <Space>
                  <Select
                    style={{ minWidth: 280 }}
                    placeholder="Selecione uma sheet"
                    value={resolvedSheetId}
                    onChange={(v) => setActiveSheetId(v)}
                    options={sheets.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    allowClear
                    onClear={() => setActiveSheetId(undefined)}
                  />

                  <Button type="primary" onClick={() => setIsSheetModalOpen(true)}>
                    Nova Sheet
                  </Button>
                </Space>
              }
              extra={
                <Space>
                  <Button disabled={!hasActiveSheet} onClick={handleOpenReportModal}>
                    Enviar para SevenSys
                  </Button>

                  <Button
                    type="primary"
                    disabled={!hasActiveSheet}
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                  >
                    Nova Task
                  </Button>
                </Space>
              }
              bodyStyle={{
                flex: 1,
                minHeight: 0,
                padding: 0,
                overflow: 'hidden',
              }}
            >
              {hasActiveSheet ? (
                <TimesheetCalendar
                  tasks={backlogTasks}
                  entries={entries}
                  activeUser={resolvedSheetId} // ✅ string garantido
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                  onDeleteTask={(id) => remove(id)}
                  /* ===== BACKLOG → CALENDÁRIO ===== */
                  onTaskScheduled={async ({ task, entry }) => {
                    if (!resolvedSheetId) return;

                    await createEntry({
                      ...entry,
                      userId: resolvedSheetId,
                    });

                    await update(task.id, {
                      status: 'scheduled',
                      userId: resolvedSheetId,
                    });

                    await Promise.all([reloadEntries(), reloadTasks()]);
                  }}
                  /* ===== CALENDÁRIO → BACKLOG ===== */
                  onTaskUnscheduled={async ({ taskId, entryId }) => {
                    if (!resolvedSheetId) return;

                    await update(taskId, {
                      status: 'backlog',
                      userId: resolvedSheetId,
                    });

                    await removeEntry(entryId);

                    await Promise.all([reloadEntries(), reloadTasks()]);
                  }}
                />
              ) : (
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    Nenhuma sheet selecionada
                  </div>
                  <div style={{ color: '#666' }}>
                    Crie uma nova sheet ou selecione uma existente.
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Layout>

      {/* ================= MODAL SHEET ================= */}
      <Modal
        title="Nova Sheet"
        open={isSheetModalOpen}
        onCancel={() => setIsSheetModalOpen(false)}
        onOk={() => sheetForm.submit()}
        destroyOnClose
      >
        <Form form={sheetForm} layout="vertical" onFinish={handleCreateSheet}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Descrição">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ================= MODAL TASK ================= */}
      <TaskModal
        open={isTaskModalOpen}
        initialValues={editingTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={async (values) => {
          if (!resolvedSheetId) {
            message.warning('Selecione ou crie uma sheet primeiro.');
            return;
          }

          const payload = {
            ...values,
            userId: resolvedSheetId,
            status: 'backlog',
          };

          if (editingTask) {
            await update(editingTask.id, payload);
          } else {
            await create(payload);
          }

          await reloadTasks();

          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
      />

      {/* ================= MODAL REPORT ================= */}
      <Modal
        title="Enviar relatório"
        open={isReportModalOpen}
        confirmLoading={sendingReport}
        onCancel={() => setIsReportModalOpen(false)}
        onOk={() => reportForm.submit()}
        destroyOnClose
      >
        <Form form={reportForm} layout="vertical" onFinish={handleSendReport}>
          <Form.Item name="senderEmail" label="Email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="period" label="Período" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="format" label="Formato" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'csv', label: 'CSV' },
                { value: 'pdf', label: 'PDF' },
                { value: 'pdf+csv', label: 'PDF + CSV' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
