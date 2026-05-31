import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, ClipboardList, Loader2, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { GestorTask } from '@/types';

const SecretariaTasksConfig = () => {
  const { teamMembers, gestorTasks, addGestorTask, updateGestorTask, deleteGestorTask, isDataLoading } = useApp();

  const secretarias = useMemo(
    () =>
      teamMembers
        .filter((member) => member.isActive && member.roles.includes('SECRETARIA') && member.authUserId)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [teamMembers],
  );

  const [selectedSecretariaId, setSelectedSecretariaId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'every_x_days'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState('2');
  const [isSaving, setIsSaving] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const effectiveSecretariaId = selectedSecretariaId || secretarias[0]?.authUserId || '';

  const secretariaTasks = useMemo(() => {
    if (!effectiveSecretariaId) return [];

    return gestorTasks
      .filter((task) => task.user_id === effectiveSecretariaId)
      .sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [effectiveSecretariaId, gestorTasks]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setRecurrenceType('none');
    setRecurrenceInterval('2');
    setEditingTaskId(null);
  };

  const handleStartEdit = (task: GestorTask) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
    setRecurrenceType(task.recurrence_pattern?.type || 'none');
    setRecurrenceInterval(String(task.recurrence_pattern?.interval || 2));
  };

  const handleDelete = async (task: GestorTask) => {
    if (!window.confirm(`Deseja excluir a atividade "${task.title}"?`)) return;

    try {
      await deleteGestorTask(task.id);
      toast.success('Atividade removida.');

      if (editingTaskId === task.id) {
        resetForm();
      }
    } catch {
      toast.error('Erro ao remover atividade.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!effectiveSecretariaId) {
      toast.error('Selecione uma secretaria válida.');
      return;
    }

    if (!title.trim()) {
      toast.error('Informe o título da atividade.');
      return;
    }

    if (recurrenceType === 'every_x_days' && Number(recurrenceInterval) < 2) {
      toast.error('No modo a cada X dias, o intervalo deve ser 2 ou mais.');
      return;
    }

    const recurrence_pattern =
      recurrenceType === 'none'
        ? { type: 'none' as const }
        : {
            type: recurrenceType,
            interval: recurrenceType === 'every_x_days' ? Number(recurrenceInterval) : undefined,
          };

    setIsSaving(true);

    try {
      if (editingTaskId) {
        await updateGestorTask(editingTaskId, {
          user_id: effectiveSecretariaId,
          title: title.trim(),
          description: description.trim() || undefined,
          due_date: dueDate || undefined,
          recurrence_pattern,
        });
        toast.success('Atividade da secretaria atualizada.');
      } else {
        await addGestorTask(
          {
            title: title.trim(),
            description: description.trim() || undefined,
            due_date: dueDate || undefined,
            recurrence_pattern,
          },
          effectiveSecretariaId,
        );
        toast.success('Atividade enviada para o dashboard da secretaria.');
      }

      resetForm();
    } catch {
      toast.error('Erro ao salvar atividade da secretaria.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-20 sm:p-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
            <ClipboardList className="h-7 w-7 text-brand-500" />
            Atividades da Secretaria
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Cadastre atividades avulsas ou recorrentes para aparecerem no dashboard da secretaria selecionada.
          </p>
        </div>
      </div>

      {secretarias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400">
          Nenhuma secretaria ativa com login foi encontrada para receber atividades.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova atividade</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Secretaria</label>
                <select
                  value={effectiveSecretariaId}
                  onChange={(event) => setSelectedSecretariaId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  {secretarias.map((member) => (
                    <option key={member.id} value={member.authUserId || ''}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Título</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex: Confirmar documentos pendentes"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Descrição</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Detalhes da atividade que vai aparecer no dashboard da secretaria"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Data</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Recorrência</label>
                  <select
                    value={recurrenceType}
                    onChange={(event) => setRecurrenceType(event.target.value as 'none' | 'daily' | 'every_x_days')}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="none">Sem recorrência</option>
                    <option value="daily">Diária</option>
                    <option value="every_x_days">A cada X dias</option>
                  </select>
                </div>
              </div>

              {recurrenceType === 'every_x_days' && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Intervalo em dias</label>
                  <input
                    type="number"
                    min={2}
                    value={recurrenceInterval}
                    onChange={(event) => setRecurrenceInterval(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingTaskId ? 'Salvar alterações' : 'Criar atividade'}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Atividades cadastradas</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tudo que estiver aqui aparece no dashboard da secretaria selecionada.
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                {secretariaTasks.length} atividades
              </span>
            </div>

            <div className="space-y-3">
              {secretariaTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
                  Nenhuma atividade cadastrada para essa secretaria.
                </div>
              ) : (
                secretariaTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-gray-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white">{task.title}</h3>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                            {task.recurrence_pattern?.type === 'daily'
                              ? 'Diária'
                              : task.recurrence_pattern?.type === 'every_x_days'
                                ? `A cada ${task.recurrence_pattern.interval} dias`
                                : 'Pontual'}
                          </span>
                        </div>

                        {task.description && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{task.description}</p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(task)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SecretariaTasksConfig;
