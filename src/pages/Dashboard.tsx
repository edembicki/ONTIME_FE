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

/**
 * =========================
 * Helper: download base64
 * =========================
 */
function downloadBase64(
  base64: string,
  mime: string,
  filename: string
) {
  const link = document.createElement('a');
  link.href = `data:${mime};base64,${base64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Dashboard() {
  const { tasks, create, update, remove } = useTasks();

  const {
    send: sendReport,
    loading: sendingReport,
    lastResult,
    clearLastResult, // 🔥 NOVO
  } = useReports();

  const [activeUser, setActiveUser] = useState('eduardo');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] =
    useState(false);
  const [reportForm] = Form.useForm();

  /**
   * =========================
   * TASKS DO PERFIL
   * =========================
   */
  const userTasks = useMemo(
    () => tasks.filter((t) => t.user_id === activeUser),
    [tasks, activeUser]
  );

  /**
   * =========================
   * DOWNLOAD AUTOMÁTICO (APENAS APÓS ENVIO)
   * =========================
   */
  useEffect(() => {
    if (!lastResult) return;

    if (lastResult.files?.pdfBase64) {
      downloadBase64(
        lastResult.files.pdfBase64,
        'application/pdf',
        `timesheet-${lastResult.id}.pdf`
      );
    }

    if (lastResult.files?.csvBase64) {
      downloadBase64(
        lastResult.files.csvBase64,
        'text/csv',
        `timesheet-${lastResult.id}.csv`
      );
    }

    message.success(
      `Relatório enviado para ${lastResult.destinationEmail}`
    );

    // 🔥 LIMPA RESULTADO PARA NÃO REEXECUTAR
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
                  <Button
                    onClick={() => setIsReportModalOpen(true)}
                  >
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
                tasks={userTasks}
                activeUser={activeUser}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setIsTaskModalOpen(true);
                }}
                onDeleteTask={(id) => remove(id)}
              />
            </Card>
          </Col>
        </Row>
      </Layout>

      {/* =========================
          MODAL TASK
         ========================= */}
      <TaskModal
        open={isTaskModalOpen}
        initialValues={editingTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={(values) => {
          const payload = {
            ...values,
            user_id: activeUser,
          };

          if (editingTask) {
            update(editingTask.id, payload);
          } else {
            create(payload);
          }

          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
      />

      {/* =========================
          MODAL REPORT
         ========================= */}
      <Modal
        title="Enviar relatório para SevenSys"
        open={isReportModalOpen}
        confirmLoading={sendingReport}
        onCancel={() => setIsReportModalOpen(false)}
        onOk={() => reportForm.submit()}
        destroyOnClose
      >
        <Form
          form={reportForm}
          layout="vertical"
          initialValues={{
            format: 'pdf+csv',
          }}
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
            label="Email remetente"
            name="senderEmail"
            rules={[
              { required: true, message: 'Informe o email' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input placeholder="seu@email.com" />
          </Form.Item>

          <Form.Item
            label="Período"
            name="period"
            rules={[
              { required: true, message: 'Informe o período' },
            ]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Formato"
            name="format"
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
