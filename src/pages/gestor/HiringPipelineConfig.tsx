import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, RotateCcw, Save, Settings2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { HiringPipelineColumn } from '@/types';
import { normalizeHiringPipelineColumns } from '@/lib/hiringPipeline';

const colorOptions: HiringPipelineColumn['color'][] = ['gray', 'blue', 'purple', 'yellow', 'green', 'red', 'orange'];

const stageDescriptions: Record<string, string> = {
  candidatos: 'Entrada inicial dos candidatos.',
  contatados: 'Candidato recebeu o primeiro contato.',
  respondeu: 'Candidato respondeu e segue no fluxo.',
  'entrevista-agendada': 'Entrevista marcada com data definida.',
  'compareceu-entrevista': 'Candidato compareceu para entrevista.',
  'faltou-entrevista': 'Candidato não compareceu para entrevista.',
  'aprovado-gestor': 'Gestor aprovou o avanço do candidato.',
  'reprovado-gestor': 'Gestor reprovou o candidato.',
  'aprovacao-d1': 'Candidato entrou na validação D+1.',
  'documentacao-enviada': 'Documentação recebida pelo time.',
  'documentacao-nao-enviada': 'Documentação pendente ou não recebida.',
  'previa-cadastrada': 'Prévia já cadastrada no processo.',
  'onboarding-liberado': 'Onboarding liberado para execução.',
  'onboarding-finalizado': 'Onboarding concluído com sucesso.',
  'onboarding-nao-finalizado': 'Onboarding não concluído.',
  'integracao-agendada': 'Integração presencial já agendada.',
  'integracao-nao-compareceu': 'Candidato faltou à integração.',
  'integracao-compareceu': 'Candidato compareceu à integração.',
  'integracao-finalizada': 'Integração concluída.',
  'candidato-em-previa': 'Candidato movido para a etapa final de prévia.',
  autorizado: 'Candidato autorizado na etapa final do processo.',
};

const HiringPipelineConfig = () => {
  const {
    hiringPipelineColumns,
    updateHiringPipelineColumn,
    moveHiringPipelineColumn,
    resetHiringPipelineColumnsToDefault,
  } = useApp();

  const sortedColumns = useMemo(() => normalizeHiringPipelineColumns(hiringPipelineColumns), [hiringPipelineColumns]);

  return (
    <div className="min-h-screen max-w-6xl bg-gray-50 p-4 dark:bg-slate-900 sm:mx-auto sm:p-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            <Settings2 className="mr-3 h-8 w-8 text-brand-500" />
            Editar Pipeline de Contratação
          </h1>
          <p className="font-medium text-gray-500 dark:text-gray-400">
            O pipeline foi redefinido com as novas etapas fixas. Aqui você ajusta nomes visuais, cores, responsáveis e ordem.
          </p>
        </div>

        <button
          onClick={() => {
            resetHiringPipelineColumnsToDefault();
            toast.success('Pipeline restaurado para o padrão novo.');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar padrão
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-3">
          <Save className="mt-0.5 h-5 w-5 text-green-600" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Regras do novo fluxo</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              As etapas agora seguem um fluxo fixo do começo ao fim. A movimentação dos cards atualiza automaticamente o estágio atual do candidato e registra as datas principais de cada avanço.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedColumns.map((column, index) => (
          <div
            key={column.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Nome da etapa</label>
                  <input
                    type="text"
                    value={column.title}
                    onChange={(event) => updateHiringPipelineColumn(column.id, { title: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Regra da etapa</label>
                  <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-slate-600 dark:text-gray-300">
                    {stageDescriptions[column.stageKey]}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Responsável</label>
                <select
                  value={column.ownerRole}
                  onChange={(event) =>
                    updateHiringPipelineColumn(column.id, {
                      ownerRole: event.target.value as HiringPipelineColumn['ownerRole'],
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="SECRETARIA">Secretaria</option>
                  <option value="GESTOR">Gestor</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-400">Cor</label>
                <select
                  value={column.color}
                  onChange={(event) =>
                    updateHiringPipelineColumn(column.id, {
                      color: event.target.value as HiringPipelineColumn['color'],
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  {colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 xl:justify-end">
                <button
                  onClick={() => moveHiringPipelineColumn(column.id, 'left')}
                  disabled={index === 0}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-gray-700 disabled:opacity-40 dark:border-slate-600 dark:text-gray-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveHiringPipelineColumn(column.id, 'right')}
                  disabled={index === sortedColumns.length - 1}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-gray-700 disabled:opacity-40 dark:border-slate-600 dark:text-gray-200"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HiringPipelineConfig;
