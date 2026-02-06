/* eslint-disable @typescript-eslint/no-explicit-any */
import { Modal, Form, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { Editor } from '@tinymce/tinymce-react';

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

  // 🔒 ÚNICA fonte da verdade do título
  const [htmlTitle, setHtmlTitle] = useState<string>('');

  /**
   * =========================
   * INIT (APENAS AO ABRIR)
   * =========================
   */
  useEffect(() => {
    if (!open) return;

    const title = String(initialValues?.title ?? '');
    setHtmlTitle(title);

    form.setFieldsValue({
      project: initialValues?.project ?? '',
      status: initialValues?.status ?? 'backlog',
      billable: initialValues?.billable ?? true,
      defaultDuration:
        initialValues?.defaultDuration ??
        initialValues?.default_duration ??
        '8h',
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      title={initialValues ? 'Editar tarefa' : 'Nova tarefa'}
      open={open}
      destroyOnHidden
      width={700}
      onCancel={() => {
        form.resetFields();
        setHtmlTitle('');
        onClose();
      }}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          onSubmit({
            ...values,
            title: htmlTitle, // 🔥 SEMPRE string HTML
          });

          form.resetFields();
          setHtmlTitle('');
        }}
      >
        {/* ================= TÍTULO (FORA DO FORM) ================= */}
        <Form.Item
          label="Descrição"
          validateStatus={!htmlTitle ? 'error' : ''}
        >
          <Editor
            apiKey="tfh65musru6n0ndx9t3v7i8u0jy9znwc9zeumjst03w34t1m"
            value={htmlTitle}
            onEditorChange={(content) => setHtmlTitle(content)}
            init={{
              height: 200,
              menubar: false,
              plugins: ['lists', 'link'],
              toolbar:
                'bold italic | bullist numlist | removeformat',
              content_style:
                'body { font-family: Arial, sans-serif; font-size:14px }',
            }}
          />
        </Form.Item>

        {/* ================= PROJETO ================= */}
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

        {/* ================= DURAÇÃO ================= */}
        <Form.Item
          label="Duração padrão"
          name="defaultDuration"
          rules={[{ required: true, message: 'Informe a duração' }]}
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
