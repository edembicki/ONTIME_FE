/* eslint-disable @typescript-eslint/no-explicit-any */
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useEffect, useMemo, useRef } from 'react';
import { Button, Space, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

/* ================= TYPES ================= */

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

/* ================= STYLES ================= */

const STATUS_STYLES: Record<string, { bg: string }> = {
  backlog: { bg: 'rgb(255 247 174 / 31%)' }, // bege
  scheduled: { bg: 'rgb(7 96 166)' },             // azul
  done: { bg: '#f6ffed' },                  // verde
  blocked: { bg: '#fff1f0' },               // vermelho
};

const SHADOW = '4px 4px 17px -7px rgba(0,0,0,0.75)';

/* ================= HELPERS ================= */

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

function getHoursByDay(entries: TimeEntry[]) {
  const map: Record<string, number> = {};

  for (const e of entries) {
    if (!e.start || !e.end) continue;
    const day = e.start.slice(0, 10);
    const hours =
      (new Date(e.end).getTime() - new Date(e.start).getTime()) / 36e5;
    map[day] = (map[day] ?? 0) + hours;
  }

  return map;
}

/* ================= COMPONENT ================= */

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

  /* ===== DRAG BACKLOG → CALENDAR ===== */
  useEffect(() => {
    if (!externalRef.current || draggableRef.current) return;

    draggableRef.current = new Draggable(externalRef.current, {
      itemSelector: '.external-task',
      eventData: (el) => ({
        title: el.getAttribute('data-title')!,
        duration: {
          minutes: durationToMinutes(el.getAttribute('data-duration') ?? '1h'),
        },
        extendedProps: {
          taskId: el.getAttribute('data-task-id')!,
        },
      }),
    });
  }, []);

  /* ===== EVENTS ===== */
  const calendarEvents = useMemo(
    () =>
      entries.map((e) => {
        const task = tasks.find((t) => t.id === e.taskId);
        const status = task?.status ?? 'scheduled';
        const style = STATUS_STYLES[status] ?? STATUS_STYLES.backlog;

        return {
          id: e.id,
          title: e.task_title,
          start: e.start,
          end: e.end,
          backgroundColor: style.bg,
          borderColor: 'transparent',
          extendedProps: {
            taskId: e.taskId,
            status,
          },
        };
      }),
    [entries, tasks]
  );

  const hoursByDay = useMemo(() => getHoursByDay(entries), [entries]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ================= BACKLOG ================= */}
      <div
        ref={externalRef}
        style={{
          width: 300,
          borderRight: '1px solid #f0f0f0',
          padding: '1%',
          background: '#fafafa',
          overflowY: 'auto',
        }}
      >
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8c8c8c', marginTop: 24 }}>
            Nenhuma tarefa disponível para uso.
          </div>
        ) : (
          tasks.map((task) => {
            const style = STATUS_STYLES[task.status] ?? STATUS_STYLES.backlog;

            return (
              <div
                key={task.id}
                className="external-task"
                data-task-id={task.id}
                data-title={task.title}
                data-duration={task.defaultDuration ?? '1h'}
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 8,
                  background: style.bg,
                  cursor: 'grab',
                  boxShadow: SHADOW,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
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

                    <Popconfirm
                      title="Excluir task?"
                      onConfirm={() => onDeleteTask(task.id)}
                    >
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
            );
          })
        )}
      </div>

      {/* ================= CALENDAR ================= */}
      <div style={{ flex: 1, padding: 16 }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
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

          /* SHADOW NO EVENTO */
          eventDidMount={(info) => {
            info.el.style.boxShadow = SHADOW;
            info.el.style.borderRadius = '6px';
          }}

          dayCellDidMount={(info) => {
            const h = hoursByDay[info.date.toISOString().slice(0, 10)];
            if (!h) return;
            const el = document.createElement('div');
            el.innerText = `${h.toFixed(1)}h`;
            el.style.position = 'absolute';
            el.style.top = '4px';
            el.style.right = '6px';
            el.style.fontSize = '11px';
            el.style.fontWeight = '600';
            info.el.style.position = 'relative';
            info.el.appendChild(el);
          }}

          eventReceive={async (info) => {
            const task = tasks.find(
              (t) => t.id === info.event.extendedProps.taskId
            );
            if (!task) return;

            await onTaskScheduled({
              task,
              entry: {
                taskId: task.id,
                start: info.event.start?.toISOString(),
                end: info.event.end?.toISOString(),
              },
            });
          }}

          eventDragStop={async (info) => {
            const rect = document
              .querySelector('.fc-view-harness')
              ?.getBoundingClientRect();
            if (!rect) return;

            const { clientX, clientY } = info.jsEvent;
            if (
              clientX >= rect.left &&
              clientX <= rect.right &&
              clientY >= rect.top &&
              clientY <= rect.bottom
            )
              return;

            info.event.remove();
            await onTaskUnscheduled({
              taskId: info.event.extendedProps.taskId,
              entryId: info.event.id,
            });
          }}
        />
      </div>
    </div>
  );
}
