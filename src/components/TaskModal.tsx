/* eslint-disable @typescript-eslint/no-explicit-any */
import { Modal, Form, Input, Select, Switch } from 'antd';
import { useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  initialValues?: any | null;
};

export function TaskModal({
  open,
  onClose,
  onSubmit,
  initialValues,
}: Props) {
  const [form] = Form.useForm();
  const { projects } = useProjects();

  /**
   * =========================
   * LOAD VALUES (EDIT)
   * =========================
   */
  useEffect(() => {
    if (!open) return;

    if (initialValues) {
      form.setFieldsValue({
        title: initialValues.title ?? '',
        project: initialValues.project ?? '',
        status: initialValues.status ?? 'backlog',
        billable: initialValues.billable ?? true,
        defaultDuration:
          initialValues.defaultDuration ??
          initialValues.default_duration ??
          '8h',
      });
    } else {
      // CREATE
      form.setFieldsValue({
        title: '',
        project: '',
        status: 'backlog',
        billable: true,
        defaultDuration: '8h',
      });
    }
  }, [open, initialValues, form]);

  return (
    <Modal
      title={initialValues ? 'Editar tarefa' : 'Nova tarefa'}
      open={open}
      destroyOnClose
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          onSubmit(values);
          form.resetFields();
        }}
      >
        {/* ===== TÍTULO ===== */}
        <Form.Item
          label="Título"
          name="title"
          rules={[
            { required: true, message: 'Informe o título' },
          ]}
        >
          <Input placeholder="Ex: Ajustar integração RM" />
        </Form.Item>

        {/* ===== PROJETO ===== */}
        <Form.Item label="Projeto" name="project">
          <Select
            showSearch
            allowClear
            placeholder="Selecione um projeto"
            options={projects.map((p) => ({
              value: p.id,
              label: p.label,
            }))}
            filterOption={(input, option) =>
              (option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>

        {/* ===== STATUS ===== */}
        <Form.Item label="Status" name="status">
          <Select
            options={[
              { value: 'backlog', label: 'Backlog' },
              { value: 'in_progress', label: 'Em andamento' },
              { value: 'done', label: 'Concluída' },
            ]}
          />
        </Form.Item>

        {/* ===== FATURÁVEL ===== */}
        <Form.Item
          label="Faturável"
          name="billable"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        {/* ===== DURAÇÃO ===== */}
        <Form.Item
          label="Duração padrão"
          name="defaultDuration"
          rules={[
            { required: true, message: 'Informe a duração' },
          ]}
        >
          <Select
            options={[
              { value: '30m', label: '30 minutos' },
              { value: '1h', label: '1 hora' },
              { value: '2h', label: '2 horas' },
              { value: '3h', label: '3 horas' },
              { value: '4h', label: '4 horas' },
              { value: '5h', label: '5 horas' },
              { value: '6h', label: '6 horas' },
              { value: '7h', label: '7 horas' },
              { value: '8h', label: '8 horas' },
              { value: '8h48m', label: '8h48min (jornada)' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
