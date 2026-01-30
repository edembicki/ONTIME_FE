/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Layout,
  Row,
  Col,
  Card,
  Tabs,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Space,
  message,
} from 'antd';
import { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';

import { useTasks } from '../hooks/useTasks';
import { useReports } from '../hooks/useReports';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { TimesheetCalendar } from '../components/TimesheetCalendar';
import { TaskModal } from '../components/TaskModal';

const { RangePicker } = DatePicker;

const PROFILES = [
  { id: 'augusto', label: 'Augusto' },
  { id: 'davi', label: 'Davi' },
  { id: 'kelwin', label: 'Kelwin' },
  { id: 'bruno', label: 'Bruno' },
  { id: 'eduardo', label: 'Eduardo' },
];

export default function Dashboard() {
  const [activeUser, setActiveUser] = useState('eduardo');

  /* ================= TASKS ================= */
  const {
    tasks,
    create,
    update,
    remove,
    reload: reloadTasks,
  } = useTasks({ userId: activeUser });

  /* =============== TIME ENTRIES ============== */
  const {
    entries,
    create: createEntry,
    remove: removeEntry,
    reload: reloadEntries,
  } = useTimeEntries(activeUser);

  /* ================= REPORTS ================= */
  const {
    send: sendReport,
    loading: sendingReport,
    lastResult,
    clearLastResult,
  } = useReports();

  /* ================= UI ================= */
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm] = Form.useForm();

  /* ============== BACKLOG TASKS ============== */
  const backlogTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.userId === activeUser && t.status === 'backlog'
      ),
    [tasks, activeUser]
  );

  /* =========== AUTO DOWNLOAD REPORT =========== */
  useEffect(() => {
    if (!lastResult) return;

    if (lastResult.files?.pdfBase64) {
      const a = document.createElement('a');
      a.href = `data:application/pdf;base64,${lastResult.files.pdfBase64}`;
      a.download = `timesheet-${lastResult.id}.pdf`;
      a.click();
    }

    if (lastResult.files?.csvBase64) {
      const a = document.createElement('a');
      a.href = `data:text/csv;base64,${lastResult.files.csvBase64}`;
      a.download = `timesheet-${lastResult.id}.csv`;
      a.click();
    }

    message.success('Relatório enviado');
    clearLastResult();
  }, [lastResult, clearLastResult]);

  return (
    <>
      <Layout style={{ height: '100vh', padding: 16 }}>
        <Row gutter={16} style={{ height: '100%' }}>
          <Col flex="auto" style={{ height: '100%' }}>
            <Card
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              title={
                <Tabs
                  activeKey={activeUser}
                  onChange={setActiveUser}
                  items={PROFILES.map((p) => ({
                    key: p.id,
                    label: p.label,
                  }))}
                />
              }
              extra={
                <Space>
                  <Button onClick={() => setIsReportModalOpen(true)}>
                    Enviar para SevenSys
                  </Button>
                  <Button
                    type="primary"
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
              <TimesheetCalendar
                tasks={backlogTasks}
                entries={entries}
                activeUser={activeUser}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setIsTaskModalOpen(true);
                }}
                onDeleteTask={(id) => remove(id)}

                /* ===== BACKLOG → CALENDÁRIO ===== */
                onTaskScheduled={async ({ task, entry }) => {
                  await createEntry({
                    ...entry,
                    userId: activeUser,
                  });

                  await update(task.id, {
                    status: 'scheduled',
                    userId: activeUser,
                  });

                  await Promise.all([
                    reloadEntries(),
                    reloadTasks(),
                  ]);
                }}

                /* ===== CALENDÁRIO → BACKLOG ===== */
                onTaskUnscheduled={async ({ taskId, entryId }) => {
                  // 1) OPTIMISTIC UPDATE — task volta IMEDIATAMENTE
                  await update(taskId, {
                    status: 'backlog',
                    userId: activeUser,
                  });

                  // 2) backend em paralelo
                  await removeEntry(entryId);

                  // 3) sincroniza depois (segurança)
                  await Promise.all([reloadEntries(), reloadTasks()]);
                }}

              />
            </Card>
          </Col>
        </Row>
      </Layout>

      {/* ================= MODAL TASK ================= */}
      <TaskModal
        open={isTaskModalOpen}
        initialValues={editingTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={async (values) => {
          const payload = {
            ...values,
            userId: activeUser,
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
        <Form
          form={reportForm}
          layout="vertical"
          onFinish={async (values) => {
            const [start, end] = values.period;

            await sendReport({
              userId: activeUser,
              senderEmail: values.senderEmail,
              periodStart: dayjs(start).format('YYYY-MM-DD'),
              periodEnd: dayjs(end).format('YYYY-MM-DD'),
              format: values.format,
            });

            setIsReportModalOpen(false);
            reportForm.resetFields();
          }}
        >
          <Form.Item
            name="senderEmail"
            label="Email"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="period"
            label="Período"
            rules={[{ required: true }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="format"
            label="Formato"
            rules={[{ required: true }]}
          >
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
