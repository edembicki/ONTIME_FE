/* eslint-disable @typescript-eslint/no-explicit-any */
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useEffect, useMemo, useRef } from 'react';
import { Button, Space, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTimeEntries } from '../hooks/useTimeEntries';

type Task = {
  id: string;
  title: string;
  project: string;
  status: string;
  default_duration: string;
  user_id: string;
};

type Props = {
  tasks: Task[];
  activeUser: string;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
};

function durationToMinutes(d: string): number {
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
  return map[d] ?? 60;
}

function safeText(value: any, fallback: string) {
  const v = (value ?? '').toString().trim();
  return v.length ? v : fallback;
}

export function TimesheetCalendar({
  tasks,
  activeUser,
  onEditTask,
  onDeleteTask,
}: Props) {
  const externalRef = useRef<HTMLDivElement | null>(null);
  const draggableRef = useRef<Draggable | null>(null);

  // 🔥 AGORA CORRETO: hook recebe userId
  const { entries, create } = useTimeEntries(activeUser);

  /**
   * ===== DRAG EXTERNO (CRIADO UMA VEZ) =====
   */
  useEffect(() => {
    if (!externalRef.current || draggableRef.current) return;

    draggableRef.current = new Draggable(externalRef.current, {
      itemSelector: '.external-task',
      eventData: (el) => {
        const durationMinutes = durationToMinutes(
          el.getAttribute('data-duration')!
        );

        return {
          title: el.getAttribute('data-title')!,
          duration: { minutes: durationMinutes },
          extendedProps: {
            taskId: el.getAttribute('data-task-id'),
            project: el.getAttribute('data-project') ?? '',
            status: el.getAttribute('data-status') ?? 'backlog',
          },
        };
      },
    });
  }, []);

  /**
   * ===== EVENTOS DO BANCO (JÁ FILTRADOS POR PERFIL) =====
   */
  const calendarEvents = useMemo(() => {
    return entries.map((e) => ({
      id: e.id,
      title: e.task_title,
      start: e.start,
      end: e.end,
    }));
  }, [entries]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ===== LISTA DE TASKS (DRAG) ===== */}
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
        {tasks.map((task) => {
          const projectLabel = safeText(task.project, 'Sem projeto');

          return (
            <div
              key={task.id}
              className="external-task"
              data-task-id={task.id}
              data-title={task.title}
              data-duration={task.default_duration}
              data-project={task.project ?? ''}
              data-status={task.status}
              style={{
                marginTop: 8,
                padding: 8,
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                cursor: 'grab',
                background: '#fff',
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    Projeto: {projectLabel}
                  </div>
                </div>

                {/* ACTIONS */}
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
                    title="Excluir tarefa?"
                    okText="Sim"
                    cancelText="Cancelar"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      onDeleteTask(task.id);
                    }}
                  >
                    <Tooltip title="Excluir">
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </div>

              {/* FOOTER */}
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Duração: {task.default_duration}
              </div>

              <div
                style={{
                  marginTop: 4,
                  display: 'inline-block',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 11,
                  background: '#f0f0f0',
                }}
              >
                {task.status}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== CALENDÁRIO ===== */}
      <div style={{ flex: 1, minWidth: 0, padding: '50px' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={ptBrLocale}
          height="100%"
          editable
          droppable
          selectable
          events={calendarEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          eventReceive={(info) => {
            const start = info.event.start!;
            const end = info.event.end!;

            create({
              taskId: info.event.extendedProps.taskId,
              date: start.toISOString().slice(0, 10),
              start: start.toISOString(),
              end: end.toISOString(),
              hours:
                (end.getTime() - start.getTime()) / 36e5,
            });
          }}
        />
      </div>
    </div>
  );
}
