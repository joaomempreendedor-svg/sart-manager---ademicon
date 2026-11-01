import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Plus, Trash2, UploadCloud, FileDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Commission, InstallmentInfo } from '@/types';
import toast from 'react-hot-toast';

const TAX_RATE = 20;

const DEFAULT_RULES = {
  consultant: { p1_10: 0.001288, p11_13: 0.002374, p15: 0.003 },
  manager: {
    noAngel: { p1_10: 0.000322, p11_13: 0.000593 },
    withAngel: { p1_10: 0.000194, p11_13: 0.000356 },
  },
  angel: { p1_10: 0.0001288, p11_13: 0.0002374 },
};

type ImportRow = {
  id: string;
  clientName: string;
  date: string;
  type: 'Imóvel' | 'Veículo';
  group: string;
  quota: string;
  pv: string;
  value: string;
  consultant: string;
  manager: string;
  hasAngel: boolean;
  angel: string;
};

interface ImportCommissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (commissions: Omit<Commission, 'id' | 'db_id' | 'criado_em'>[]) => Promise<unknown>;
  consultants: string[];
  managers: string[];
  angels: string[];
  pvs: string[];
}

const normalizeKey = (value: string) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const COLUMN_SYNONYMS: Record<string, string[]> = {
  clientName: ['cliente', 'nome do cliente', 'nome cliente', 'nome', 'clientes', 'nome completo', 'titular'],
  date: ['data', 'data da venda', 'data venda', 'data de venda', 'data do cadastro', 'data cadastro', 'dt venda', 'data do contrato'],
  type: ['tipo', 'tipo de bem', 'tipo bem', 'bem', 'modalidade', 'segmento'],
  group: ['grupo', 'numero do grupo', 'n do grupo', 'codigo do grupo', 'grupo cota'],
  quota: ['cota', 'cota controle', 'controle', 'numero da cota', 'n da cota', 'codigo da cota'],
  pv: ['pv', 'ponto de venda', 'ponto venda', 'pdv', 'loja', 'unidade'],
  value: ['valor', 'valor do credito', 'valor credito', 'credito', 'valor da venda', 'valor venda', 'valor total', 'capital', 'valor do bem'],
  consultant: ['consultor', 'consultora', 'previa', 'autorizado', 'previa autorizado', 'vendedor', 'corretor', 'corretora'],
  manager: ['gestor', 'gestora', 'gerente', 'supervisor'],
  angel: ['anjo', 'nome do anjo', 'anjo nome'],
  hasAngel: ['tem anjo', 'possui anjo', 'anjo sim nao'],
  angelFlag: ['tem anjo', 'possui anjo', 'anjo sim nao'],
};

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDate = (raw: unknown): string => {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return toIsoDate(raw);
  if (typeof raw === 'number' && raw > 0) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${m}-${d}`;
    }
  }
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (brMatch) {
    const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
    return `${year}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? '' : toIsoDate(fallback);
};

const parseMoney = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let text = String(raw ?? '').replace(/[R$\s]/gi, '').trim();
  if (!text) return 0;
  const negative = text.startsWith('-');
  text = text.replace(/-/g, '');
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > lastDot) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    if (lastComma >= 0) {
      text = text.replace(/,/g, '');
    } else {
      const parts = text.split('.');
      if (parts.length > 1 && parts.slice(1).every(part => part.length === 3)) {
        text = parts.join('');
      }
    }
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
};

const parseType = (raw: unknown): 'Imóvel' | 'Veículo' => {
  const normalized = normalizeKey(String(raw ?? ''));
  if (normalized.includes('veic') || normalized.includes('carro') || normalized.includes('moto') || normalized.includes('auto')) return 'Veículo';
  return 'Imóvel';
};

const parseAngelFlag = (raw: unknown): boolean => {
  const normalized = normalizeKey(String(raw ?? ''));
  if (!normalized) return false;
  if (['nao', 'n', '0', 'false', 'sem anjo', 'nao tem'].includes(normalized)) return false;
  return true;
};

const findHeader = (headers: string[], aliases: string[]): string | undefined =>
  headers.find(header => aliases.includes(normalizeKey(header)));

const createRowId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `row-${Math.random().toString(36).slice(2)}`);

const ImportCommissionsModal = ({
  isOpen,
  onClose,
  onImport,
  consultants,
  managers,
  angels,
  pvs,
}: ImportCommissionsModalProps) => {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [bulk, setBulk] = useState({ consultant: '', manager: '', pv: '', angel: '', hasAngel: false });

  const updateRow = (id: string, patch: Partial<ImportRow>) => {
    setRows(prev => prev.map(row => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addEmptyRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: createRowId(),
        clientName: '',
        date: '',
        type: 'Imóvel',
        group: '',
        quota: '',
        pv: '',
        value: '',
        consultant: '',
        manager: '',
        hasAngel: false,
        angel: '',
      },
    ]);
  };

  const rowIssues = (row: ImportRow): string[] => {
    const issues: string[] = [];
    if (!row.clientName.trim()) issues.push('Cliente');
    if (!row.date) issues.push('Data');
    if (!(parseMoney(row.value) > 0)) issues.push('Valor');
    if (!row.consultant.trim()) issues.push('Consultor');
    if (!row.manager.trim()) issues.push('Gestor');
    if (row.hasAngel && !row.angel.trim()) issues.push('Anjo');
    return issues;
  };

  const pendingRows = useMemo(() => rows.filter(row => rowIssues(row).length > 0).length, [rows]);

  const parseWorkbook = (workbook: XLSX.WorkBook) => {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [] as ImportRow[];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
    if (!json.length) return [] as ImportRow[];
    const headers = Object.keys(json[0] || {});
    const map = {
      clientName: findHeader(headers, COLUMN_SYNONYMS.clientName),
      date: findHeader(headers, COLUMN_SYNONYMS.date),
      type: findHeader(headers, COLUMN_SYNONYMS.type),
      group: findHeader(headers, COLUMN_SYNONYMS.group),
      quota: findHeader(headers, COLUMN_SYNONYMS.quota),
      pv: findHeader(headers, COLUMN_SYNONYMS.pv),
      value: findHeader(headers, COLUMN_SYNONYMS.value),
      consultant: findHeader(headers, COLUMN_SYNONYMS.consultant),
      manager: findHeader(headers, COLUMN_SYNONYMS.manager),
      angel: findHeader(headers, COLUMN_SYNONYMS.angel),
      angelFlag: findHeader(headers, COLUMN_SYNONYMS.angelFlag),
    };

    return json
      .map(rawRow => {
        const angelValue = map.angel ? String(rawRow[map.angel] ?? '').trim() : '';
        const flagValue = map.angelFlag ? String(rawRow[map.angelFlag] ?? '').trim() : '';
        const hasAngel = angelValue
          ? parseAngelFlag(angelValue) || Boolean(angelValue) && !['nao', 'não', 'n', '0'].includes(normalizeKey(angelValue))
          : parseAngelFlag(flagValue);
        const row: ImportRow = {
          id: createRowId(),
          clientName: map.clientName ? String(rawRow[map.clientName] ?? '').trim() : '',
          date: map.date ? parseDate(rawRow[map.date]) : '',
          type: parseType(map.type ? rawRow[map.type] : ''),
          group: map.group ? String(rawRow[map.group] ?? '').trim() : '',
          quota: map.quota ? String(rawRow[map.quota] ?? '').trim() : '',
          pv: map.pv ? String(rawRow[map.pv] ?? '').trim() : '',
          value: map.value ? String(rawRow[map.value] ?? '').trim() : '',
          consultant: map.consultant ? String(rawRow[map.consultant] ?? '').trim() : '',
          manager: map.manager ? String(rawRow[map.manager] ?? '').trim() : '',
          hasAngel,
          angel: hasAngel ? (angelValue && !['sim', 's', '1', 'true'].includes(normalizeKey(angelValue)) ? angelValue : '') : '',
        };
        return row;
      })
      .filter(row => Object.entries(row).some(([key, value]) => key !== 'id' && key !== 'type' && key !== 'hasAngel' && String(value).trim() !== ''));
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const parsed = parseWorkbook(workbook);
      if (!parsed.length) {
        toast.error('Nenhuma linha encontrada na planilha. Verifique se a primeira linha é o cabeçalho.');
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      toast.success(`${parsed.length} linha(s) carregada(s). Revise e complete as informações pendentes.`);
    } catch (error: any) {
      toast.error(`Falha ao ler o arquivo: ${error?.message || error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePastedData = () => {
    if (!pastedData.trim()) {
      toast.error('Cole os dados da planilha antes de processar.');
      return;
    }
    try {
      const workbook = XLSX.read(pastedData, { type: 'string' });
      const parsed = parseWorkbook(workbook);
      if (!parsed.length) {
        toast.error('Nenhuma linha encontrada nos dados colados.');
        return;
      }
      setRows(parsed);
      setFileName('Dados colados');
      setShowPaste(false);
      toast.success(`${parsed.length} linha(s) carregada(s). Revise e complete as informações pendentes.`);
    } catch (error: any) {
      toast.error(`Falha ao processar os dados: ${error?.message || error}`);
    }
  };

  const applyBulk = () => {
    if (!rows.length) return;
    setRows(prev =>
      prev.map(row => ({
        ...row,
        consultant: bulk.consultant.trim() || row.consultant,
        manager: bulk.manager.trim() || row.manager,
        pv: bulk.pv.trim() || row.pv,
        hasAngel: bulk.hasAngel,
        angel: bulk.hasAngel ? bulk.angel.trim() || row.angel : '',
      })),
    );
    toast.success('Informações aplicadas a todas as linhas.');
  };

  const buildPayload = (row: ImportRow): Omit<Commission, 'id' | 'db_id' | 'criado_em'> => {
    const credit = parseMoney(row.value);
    const angel = row.hasAngel && row.angel.trim() ? row.angel.trim() : undefined;
    const taxMultiplier = 1 - TAX_RATE / 100;
    const manRules = angel ? DEFAULT_RULES.manager.withAngel : DEFAULT_RULES.manager.noAngel;

    const consultantGross = credit * (DEFAULT_RULES.consultant.p1_10 * 10 + DEFAULT_RULES.consultant.p11_13 * 3 + DEFAULT_RULES.consultant.p15);
    const managerGross = credit * (manRules.p1_10 * 10 + manRules.p11_13 * 3);
    const angelGross = angel ? credit * (DEFAULT_RULES.angel.p1_10 * 10 + DEFAULT_RULES.angel.p11_13 * 3) : 0;

    const installmentDetails: Record<string, InstallmentInfo> = {};
    for (let i = 1; i <= 15; i += 1) installmentDetails[i] = { status: 'Pendente' };

    return {
      date: row.date,
      clientName: row.clientName.trim(),
      type: row.type,
      group: row.group.trim(),
      quota: row.quota.trim(),
      consultant: row.consultant.trim(),
      managerName: row.manager.trim() || 'N/A',
      angelName: angel,
      pv: row.pv.trim() || 'Não informado',
      value: credit,
      taxRate: TAX_RATE,
      netValue: (consultantGross + managerGross + angelGross) * taxMultiplier,
      installments: 15,
      status: 'Em Andamento',
      installmentDetails,
      consultantValue: consultantGross,
      managerValue: managerGross,
      angelValue: angelGross,
      receivedValue: 0,
    };
  };

  const handleImport = async () => {
    if (!rows.length) {
      toast.error('Carregue uma planilha antes de importar.');
      return;
    }
    if (pendingRows > 0) {
      toast.error(`Existem ${pendingRows} linha(s) com informações faltando. Preencha os campos destacados em amarelo.`);
      return;
    }
    setIsImporting(true);
    try {
      const payloads = rows.map(buildPayload);
      await onImport(payloads);
      toast.success(`${payloads.length} comissão(ões) importada(s) com sucesso!`);
      handleClose();
    } catch (error: any) {
      toast.error(`Erro ao importar as comissões: ${error?.message || error}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        Cliente: 'João da Silva',
        Data: '01/11/2026',
        Tipo: 'Imóvel',
        Grupo: '5025',
        Cota: '150',
        PV: pvs[0] || 'Matriz',
        Valor: '120.000,00',
        Consultor: consultants[0] || '',
        Gestor: managers[0] || '',
        Anjo: '',
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comissões');
    XLSX.writeFile(workbook, 'modelo_importacao_comissoes.xlsx');
  };

  const handleClose = () => {
    setRows([]);
    setFileName('');
    setPastedData('');
    setShowPaste(false);
    setBulk({ consultant: '', manager: '', pv: '', angel: '', hasAngel: false });
    setIsImporting(false);
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  const missingCellClass = 'border-amber-400 bg-amber-50 text-gray-900 dark:border-amber-500 dark:bg-amber-900/20 dark:text-white';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[96vw] xl:max-w-[1400px] bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <UploadCloud className="w-6 h-6 text-brand-500" />
            <span>Importar comissões de planilha</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Imposto fixo: {TAX_RATE}%
            </span>
          </DialogTitle>
          <DialogDescription>
            Envie um arquivo .xlsx, .xls ou .csv. As colunas Cliente, Data, Valor, Grupo, Cota, PV e Tipo são preenchidas automaticamente. Consultor, Gestor e Anjo normalmente não vêm na planilha — complete nas linhas destacadas em amarelo ou use o preenchimento em massa.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[78vh] space-y-4 overflow-y-auto custom-scrollbar pr-1">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <Label htmlFor="commissionSpreadsheet" className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-brand-500" /> Planilha de comissões
              </Label>
              <label
                htmlFor="commissionSpreadsheet"
                className={`mt-2 flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${fileName ? 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/30' : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:border-brand-500'}`}
              >
                {isProcessing ? (
                  <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
                ) : fileName ? (
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                ) : (
                  <UploadCloud className="h-7 w-7 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {fileName ? `Arquivo: ${fileName}` : 'Clique para selecionar a planilha'}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-400">A primeira linha deve ser o cabeçalho</span>
                <input
                  id="commissionSpreadsheet"
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="justify-start">
                <FileDown className="mr-2 h-4 w-4" /> Baixar modelo da planilha
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowPaste(prev => !prev)} className="justify-start">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> {showPaste ? 'Fechar colagem' : 'Colar dados (CSV/Excel)'}
              </Button>
            </div>
          </div>

          {showPaste && (
            <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
              <Label htmlFor="commissionPastedData">Cole aqui os dados copiados da planilha</Label>
              <Textarea
                id="commissionPastedData"
                value={pastedData}
                onChange={event => setPastedData(event.target.value)}
                placeholder={'Cliente\tData\tValor\tGrupo\tCota\tPV\nJoão da Silva\t01/11/2026\t120.000,00\t5025\t150\tMatriz'}
                className="min-h-[110px] font-mono text-xs"
              />
              <Button type="button" size="sm" onClick={handlePastedData}>
                Processar dados colados
              </Button>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-900 dark:bg-brand-950/20">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[170px] flex-1">
                    <Label htmlFor="bulkConsultant" className="text-xs">Consultor para todas as linhas</Label>
                    <Input
                      id="bulkConsultant"
                      list="import-commission-consultants"
                      value={bulk.consultant}
                      onChange={event => setBulk(prev => ({ ...prev, consultant: event.target.value }))}
                      placeholder="Selecione ou digite"
                      className="mt-1 h-9 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="min-w-[170px] flex-1">
                    <Label htmlFor="bulkManager" className="text-xs">Gestor para todas as linhas</Label>
                    <Input
                      id="bulkManager"
                      list="import-commission-managers"
                      value={bulk.manager}
                      onChange={event => setBulk(prev => ({ ...prev, manager: event.target.value }))}
                      placeholder="Selecione ou digite"
                      className="mt-1 h-9 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="min-w-[150px] flex-1">
                    <Label htmlFor="bulkPv" className="text-xs">PV para todas as linhas</Label>
                    <Input
                      id="bulkPv"
                      list="import-commission-pvs"
                      value={bulk.pv}
                      onChange={event => setBulk(prev => ({ ...prev, pv: event.target.value }))}
                      placeholder="Opcional"
                      className="mt-1 h-9 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="min-w-[210px] flex-1">
                    <Label htmlFor="bulkAngel" className="text-xs">Anjo</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={bulk.hasAngel}
                          onChange={event => setBulk(prev => ({ ...prev, hasAngel: event.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Todas têm anjo
                      </label>
                      <Input
                        id="bulkAngel"
                        list="import-commission-angels"
                        value={bulk.angel}
                        onChange={event => setBulk(prev => ({ ...prev, angel: event.target.value }))}
                        placeholder="Nome do anjo"
                        disabled={!bulk.hasAngel}
                        className="h-9 flex-1 bg-white disabled:opacity-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={applyBulk} className="h-9">
                    Aplicar a todas
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Dica: preencha o consultor e o gestor aqui e clique em "Aplicar a todas" quando a planilha não tiver essas colunas.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {rows.length} linha(s)
                  </span>
                  {pendingRows > 0 ? (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> {pendingRows} com informações faltando
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Tudo preenchido
                    </span>
                  )}
                  <span className="text-slate-500 dark:text-slate-400">Imposto aplicado em todas: {TAX_RATE}%</span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addEmptyRow}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar linha
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                <table className="w-full min-w-[1180px] text-xs">
                  <thead className="bg-gray-50 text-left uppercase tracking-wide text-gray-500 dark:bg-slate-700 dark:text-gray-300">
                    <tr>
                      <th className="px-2 py-2">Cliente *</th>
                      <th className="px-2 py-2">Data *</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Grupo</th>
                      <th className="px-2 py-2">Cota</th>
                      <th className="px-2 py-2">PV</th>
                      <th className="px-2 py-2">Valor *</th>
                      <th className="px-2 py-2">Consultor *</th>
                      <th className="px-2 py-2">Gestor *</th>
                      <th className="px-2 py-2">Anjo</th>
                      <th className="px-2 py-2">Pendências</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {rows.map(row => {
                      const issues = rowIssues(row);
                      return (
                        <tr key={row.id} className={issues.length ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                          <td className="px-2 py-2">
                            <Input
                              value={row.clientName}
                              onChange={event => updateRow(row.id, { clientName: event.target.value })}
                              placeholder="Nome do cliente"
                              className={`h-8 w-40 ${!row.clientName.trim() ? missingCellClass : ''}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="date"
                              value={row.date}
                              onChange={event => updateRow(row.id, { date: event.target.value })}
                              className={`h-8 w-32 ${!row.date ? missingCellClass : ''}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={row.type}
                              onChange={event => updateRow(row.id, { type: event.target.value as ImportRow['type'] })}
                              className="h-8 w-24 rounded-md border border-gray-300 bg-white px-1 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            >
                              <option value="Imóvel">Imóvel</option>
                              <option value="Veículo">Veículo</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.group}
                              onChange={event => updateRow(row.id, { group: event.target.value })}
                              placeholder="Grupo"
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.quota}
                              onChange={event => updateRow(row.id, { quota: event.target.value })}
                              placeholder="Cota"
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              list="import-commission-pvs"
                              value={row.pv}
                              onChange={event => updateRow(row.id, { pv: event.target.value })}
                              placeholder="PV"
                              className="h-8 w-32"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.value}
                              onChange={event => updateRow(row.id, { value: event.target.value })}
                              placeholder="0,00"
                              className={`h-8 w-28 ${parseMoney(row.value) <= 0 ? missingCellClass : ''}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              list="import-commission-consultants"
                              value={row.consultant}
                              onChange={event => updateRow(row.id, { consultant: event.target.value })}
                              placeholder="Selecione ou digite"
                              className={`h-8 w-36 ${!row.consultant.trim() ? missingCellClass : ''}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              list="import-commission-managers"
                              value={row.manager}
                              onChange={event => updateRow(row.id, { manager: event.target.value })}
                              placeholder="Selecione ou digite"
                              className={`h-8 w-36 ${!row.manager.trim() ? missingCellClass : ''}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-col gap-1">
                              <label className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={row.hasAngel}
                                  onChange={event => updateRow(row.id, { hasAngel: event.target.checked, angel: event.target.checked ? row.angel : '' })}
                                  className="h-3.5 w-3.5 rounded border-gray-300"
                                />
                                Tem anjo
                              </label>
                              {row.hasAngel && (
                                <Input
                                  list="import-commission-angels"
                                  value={row.angel}
                                  onChange={event => updateRow(row.id, { angel: event.target.value })}
                                  placeholder="Nome do anjo"
                                  className={`h-8 w-32 ${!row.angel.trim() ? missingCellClass : ''}`}
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            {issues.length > 0 ? (
                              <span className="flex items-start gap-1 rounded-md bg-amber-100 px-1.5 py-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Falta: {issues.join(', ')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">OK</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => setRows(prev => prev.filter(item => item.id !== row.id))}
                              title="Remover linha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <datalist id="import-commission-consultants">
                {consultants.map(name => <option key={name} value={name} />)}
              </datalist>
              <datalist id="import-commission-managers">
                {managers.map(name => <option key={name} value={name} />)}
              </datalist>
              <datalist id="import-commission-angels">
                {angels.map(name => <option key={name} value={name} />)}
              </datalist>
              <datalist id="import-commission-pvs">
                {pvs.map(name => <option key={name} value={name} />)}
              </datalist>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            * Campos obrigatórios. O imposto de {TAX_RATE}% é aplicado automaticamente em todas as comissões importadas.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isImporting}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleImport} disabled={isImporting || rows.length === 0 || pendingRows > 0}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isImporting ? 'Importando...' : `Importar ${rows.length || ''} comissão(ões)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportCommissionsModal;
