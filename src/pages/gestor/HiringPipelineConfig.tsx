import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { HiringPipelineColumn, CandidateStatus } from '@/types';
import { ArrowLeft, ArrowRight, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const colorOptions: HiringPipelineColumn['color'][] = ['gray', 'blue', 'purple', 'yellow', 'green', 'red', 'orange'];

const statusOptions: CandidateStatus[] = [
  'Triagem',
  'Entrevista',
  'Aguardando Prévia',
  'Autorizado',
  'Reprovado',
  'Desqualificado',
  'Faltou',
  'Onboarding Online',
  'Integração Presencial',
  'Acompanhamento 90 Dias',
];

const emptyColumn = {
  title: '',
  color: 'gray' as HiringPipelineColumn['color'],
  ownerRole: 'SECRETARIA' as HiringPipelineColumn['ownerRole'],
  candidateStatus: 'Triagem' as CandidateStatus,
  screeningStatus: undefined as HiringPipelineColumn['screeningStatus'],
  interviewConducted: undefined as HiringPipelineColumn['interviewConducted'],
};

const HiringPipelineConfig = () => {
  const {
    hiringPipelineColumns,
    addHiringPipelineColumn,
    updateHiringPipelineColumn,
    deleteHiringPipelineColumn,
    moveHiringPipelineColumn,
  } = useApp();

  const [newColumn, setNewColumn] = useState(emptyColumn);

  const sortedColumns = useMemo(() => hiringPipelineColumns, [hiringPipelineColumns]);

  const handleAddColumn = () => {
    if (!newColumn.title.trim()) {
      toast.error('Digite um nome para a coluna.');
      return;
    }

    addHiringPipelineColumn({
      title: newColumn.title.trim(),
      color: newColumn.color,
      ownerRole: newColumn.ownerRole,
      candidateStatus: newColumn.candidateStatus,
      screeningStatus: newColumn.candidateStatus === 'Triagem' ? newColumn.screeningStatus : undefined,
      interviewConducted: newColumn.candidateStatus === 'Entrevista' ? newColumn.interviewConducted : undefined,
    });

    setNewColumn(emptyColumn);
    toast.success('Nova coluna adicionada.');
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
          <Settings2 className="w-8 h-8 mr-3 text-brand-500" />
          Editar Pipeline de Contratação
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Crie novas colunas, defina o responsável e reorganize a ordem do fluxo.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Adicionar nova coluna</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <input
            type="text"
            value={newColumn.title}
            onChange={(e) => setNewColumn((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Nome da coluna"
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />

          <select
            value={newColumn.ownerRole}
            onChange={(e) => setNewColumn((prev) => ({ ...prev, ownerRole: e.target.value as HiringPipelineColumn['ownerRole'] }))}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="SECRETARIA">Secretaria</option>
            <option value="GESTOR">Gestor</option>
          </select>

          <select
            value={newColumn.color}
            onChange={(e) => setNewColumn((prev) => ({ ...prev, color: e.target.value as HiringPipelineColumn['color'] }))}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            {colorOptions.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>

          <select
            value={newColumn.candidateStatus}
            onChange={(e) =>
              setNewColumn((prev) => ({
                ...prev,
                candidateStatus: e.target.value as CandidateStatus,
                screeningStatus: e.target.value === 'Triagem' ? 'Pending Contact' : undefined,
                interviewConducted: e.target.value === 'Entrevista' ? false : undefined,
              }))
            }
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {newColumn.candidateStatus === 'Triagem' ? (
            <select
              value={newColumn.screeningStatus || 'Pending Contact'}
              onChange={(e) =>
                setNewColumn((prev) => ({
                  ...prev,
                  screeningStatus: e.target.value as HiringPipelineColumn['screeningStatus'],
                }))
              }
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="Pending Contact">Pending Contact</option>
              <option value="Contacted">Contacted</option>
              <option value="No Response">No Response</option>
            </select>
          ) : newColumn.candidateStatus === 'Entrevista' ? (
            <select
              value={String(newColumn.interviewConducted ?? false)}
              onChange={(e) =>
                setNewColumn((prev) => ({
                  ...prev,
                  interviewConducted: e.target.value === 'true',
                }))
              }
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="false">Entrevista agendada</option>
              <option value="true">Entrevista realizada</option>
            </select>
          ) : (
            <div className="w-full rounded-lg border border-dashed border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-400 flex items-center">
              Sem regra extra
            </div>
          )}

          <button
            onClick={handleAddColumn}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedColumns.map((column, index) => (
          <div
            key={column.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={column.title}
                  onChange={(e) => updateHiringPipelineColumn(column.id, { title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Responsável</label>
                <select
                  value={column.ownerRole}
                  onChange={(e) =>
                    updateHiringPipelineColumn(column.id, {
                      ownerRole: e.target.value as HiringPipelineColumn['ownerRole'],
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="SECRETARIA">Secretaria</option>
                  <option value="GESTOR">Gestor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Cor</label>
                <select
                  value={column.color}
                  onChange={(e) =>
                    updateHiringPipelineColumn(column.id, {
                      color: e.target.value as HiringPipelineColumn['color'],
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Status</label>
                <select
                  value={column.candidateStatus}
                  onChange={(e) =>
                    updateHiringPipelineColumn(column.id, {
                      candidateStatus: e.target.value as CandidateStatus,
                      screeningStatus: e.target.value === 'Triagem' ? 'Pending Contact' : undefined,
                      interviewConducted: e.target.value === 'Entrevista' ? false : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Regra extra</label>
                {column.candidateStatus === 'Triagem' ? (
                  <select
                    value={column.screeningStatus || 'Pending Contact'}
                    onChange={(e) =>
                      updateHiringPipelineColumn(column.id, {
                        screeningStatus: e.target.value as HiringPipelineColumn['screeningStatus'],
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="Pending Contact">Pending Contact</option>
                    <option value="Contacted">Contacted</option>
                    <option value="No Response">No Response</option>
                  </select>
                ) : column.candidateStatus === 'Entrevista' ? (
                  <select
                    value={String(column.interviewConducted ?? false)}
                    onChange={(e) =>
                      updateHiringPipelineColumn(column.id, {
                        interviewConducted: e.target.value === 'true',
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="false">Entrevista agendada</option>
                    <option value="true">Entrevista realizada</option>
                  </select>
                ) : (
                  <div className="w-full rounded-lg border border-dashed border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-400">
                    Sem regra extra
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveHiringPipelineColumn(column.id, 'left')}
                  disabled={index === 0}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-700 dark:text-gray-200 disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => moveHiringPipelineColumn(column.id, 'right')}
                  disabled={index === sortedColumns.length - 1}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-gray-700 dark:text-gray-200 disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    deleteHiringPipelineColumn(column.id);
                    toast.success('Coluna removida.');
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end">
                <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  <Save className="w-4 h-4" />
                  Salva automaticamente
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HiringPipelineConfig;