/* eslint-disable @typescript-eslint/no-explicit-any */
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useEffect, useMemo, useRef } from 'react';
import { Button, Space, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

type Task = {
  id: string;
  title: string;
  project?: string | null;
  status: string;
  defaultDuration?: string;
};

type TimeEntry = {
  id: string;
  taskId: string;
  task_title: string;
  start: string;
  end: string;
};

type Props = {
  tasks: Task[];
  entries: TimeEntry[];
  activeUser: string;

  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;

  onTaskScheduled: (args: { task: Task; entry: any }) => Promise<void>;
  onTaskUnscheduled: (args: { taskId: string; entryId: string }) => Promise<void>;
};

function durationToMinutes(d?: string): number {
  const map: Record<string, number> = {
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '3h': 180,
    '4h': 240,
    '5h': 300,
    '6h': 360,
    '7h': 420,
    '8h': 480,
    '8h48m': 528,
  };
  return map[d ?? ''] ?? 60;
}

/**
 * Soma horas por dia (YYYY-MM-DD)
 */
function getHoursByDay(entries: TimeEntry[]) {
  const map: Record<string, number> = {};

  for (const e of entries) {
    if (!e.start || !e.end) continue;

    const day = e.start.slice(0, 10);
    const start = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();

    const hours = (end - start) / 1000 / 60 / 60;
    map[day] = (map[day] ?? 0) + hours;
  }

  return map;
}

export function TimesheetCalendar({
  tasks,
  entries,
  onEditTask,
  onDeleteTask,
  onTaskScheduled,
  onTaskUnscheduled,
}: Props) {
  const externalRef = useRef<HTMLDivElement | null>(null);
  const draggableRef = useRef<Draggable | null>(null);

  /**
   * DRAG DA LISTA → CALENDÁRIO
   */
  useEffect(() => {
    if (!externalRef.current || draggableRef.current) return;

    draggableRef.current = new Draggable(externalRef.current, {
      itemSelector: '.external-task',
      eventData: (el) => {
        const taskId = el.getAttribute('data-task-id')!;
        const title = el.getAttribute('data-title')!;
        const duration = el.getAttribute('data-duration') ?? '1h';
        const project = el.getAttribute('data-project') ?? '';

        return {
          title,
          duration: { minutes: durationToMinutes(duration) },
          extendedProps: {
            taskId,
            project,
            defaultDuration: duration,
            source: 'backlog',
          },
        };
      },
    });
  }, []);

  /**
   * EVENTOS DO CALENDÁRIO
   */
  const calendarEvents = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        title: e.task_title,
        start: e.start,
        end: e.end,
        extendedProps: {
          taskId: e.taskId,
          source: 'calendar',
        },
      })),
    [entries]
  );

  /**
   * HORAS AGRUPADAS POR DIA
   */
  const hoursByDay = useMemo(
    () => getHoursByDay(entries),
    [entries]
  );

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ===== BACKLOG ===== */}
      <div
        ref={externalRef}
        style={{
          width: 300,
          borderRight: '1px solid #f0f0f0',
          padding: 12,
          background: '#fafafa',
          overflowY: 'auto',
        }}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            className="external-task"
            data-task-id={task.id}
            data-title={task.title}
            data-duration={task.defaultDuration ?? '1h'}
            data-project={task.project ?? ''}
            style={{
              marginTop: 8,
              padding: 8,
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              background: '#fff',
              cursor: 'grab',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{task.title}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Projeto: {task.project ?? '-'}
                </div>
                <div style={{ fontSize: 12 }}>
                  Duração: {task.defaultDuration ?? '1h'}
                </div>
              </div>

              <Space size={4}>
                <Tooltip title="Editar">
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                  />
                </Tooltip>

                <Popconfirm title="Excluir task?" onConfirm={() => onDeleteTask(task.id)}>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </Space>
            </div>
          </div>
        ))}
      </div>

      {/* ===== CALENDÁRIO ===== */}
      <div style={{ flex: 1, padding: 16 }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          height="100%"
          editable
          droppable
          events={calendarEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}

          /**
           * MOSTRA TOTAL DE HORAS NO CANTO DO DIA
           */
          dayCellDidMount={(info) => {
            const dateStr = info.date.toISOString().slice(0, 10);
            const hours = hoursByDay[dateStr];
            if (!hours) return;

            const el = document.createElement('div');
            el.innerText = `${hours.toFixed(1)}h`;
            el.style.position = 'absolute';
            el.style.top = '4px';
            el.style.right = '6px';
            el.style.fontSize = '11px';
            el.style.fontWeight = '600';
            el.style.color = hours >= 8 ? '#d4380d' : '#1677ff';

            info.el.style.position = 'relative';
            info.el.appendChild(el);
          }}

          /** BACKLOG → CALENDÁRIO */
          eventReceive={async (info) => {
            const taskId = info.event.extendedProps.taskId as string;
            const task = tasks.find((t) => t.id === taskId);
            if (!task) return;

            await onTaskScheduled({
              task,
              entry: {
                taskId,
                start: info.event.start?.toISOString(),
                end: info.event.end?.toISOString(),
              },
            });
          }}

          /** CALENDÁRIO → BACKLOG */
          eventDragStop={async (info) => {
            const calendarEl = document.querySelector('.fc-view-harness');
            if (!calendarEl) return;

            const rect = calendarEl.getBoundingClientRect();
            const { clientX, clientY } = info.jsEvent;

            const droppedOutside =
              clientX < rect.left ||
              clientX > rect.right ||
              clientY < rect.top ||
              clientY > rect.bottom;

            if (!droppedOutside) return;

            const entryId = info.event.id;
            const taskId = info.event.extendedProps.taskId as string;

            info.event.remove();
            await onTaskUnscheduled({ taskId, entryId });
          }}
        />
      </div>
    </div>
  );
}
