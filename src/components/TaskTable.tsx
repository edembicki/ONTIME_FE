/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, Space, Table, Tag } from 'antd';

/**
 * Converte a duração para label amigável
 */
function renderDuration(duration?: string) {
  if (!duration) return '-';

  const map: Record<string, string> = {
    '30m': '30 min',
    '1h': '1h',
    '2h': '2h',
    '3h': '3h',
    '4h': '4h',
    '5h': '5h',
    '6h': '6h',
    '7h': '7h',
    '8h': '8h',
    '8h48m': '8h48',
  };

  return map[duration] ?? duration;
}

export function TaskTable(props: {
  tasks: any[];
  loading?: boolean;
  onEdit?: (task: any) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <Table
      rowKey="id"
      dataSource={Array.isArray(props.tasks) ? props.tasks : []}
      loading={props.loading}
      pagination={{ pageSize: 8 }}
      size="small"
      columns={[
        {
          title: 'Tarefa',
          key: 'title',
          ellipsis: true,
          render: (_, task) => (
            <strong>{task.title ?? '-'}</strong>
          ),
        },
        {
          title: 'Duração',
          key: 'duration',
          width: 120,
          render: (_, task) => {
            const duration =
              task.defaultDuration ??
              task.default_duration ??
              null;

            return (
              <Tag color="blue">
                {renderDuration(duration)}
              </Tag>
            );
          },
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 120,
          render: (s) => <Tag>{s}</Tag>,
        },
        {
          title: 'Ações',
          key: 'actions',
          width: 140,
          render: (_, task) => (
            <Space>
              {props.onEdit && (
                <Button
                  size="small"
                  onClick={() => props.onEdit!(task)}
                >
                  Editar
                </Button>
              )}
              {props.onDelete && (
                <Button
                  size="small"
                  danger
                  onClick={() => props.onDelete!(task.id)}
                >
                  Excluir
                </Button>
              )}
            </Space>
          ),
        },
      ]}
    />
  );
}
