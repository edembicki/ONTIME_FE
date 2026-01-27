import { Card, List } from 'antd';

type Props = {
  data?: { title: string; hours: number }[];
};

export function WeeklyReport({ data = [] }: Props) {
  return (
    <Card title="Relatório semanal">
      <List
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <strong>{item.title}</strong> — {item.hours}h
          </List.Item>
        )}
      />
    </Card>
  );
}
