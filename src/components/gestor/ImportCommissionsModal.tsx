import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Plus, Trash2, UploadCloud, FileDown, Users } from 'lucide-react';
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
import { Commission } from '@/types';
import toast from 'react-hot-toast';
import {
  buildCommissionPayload,
  COMMISSION_IMPORT_TAX_RATE,
  CommissionImportRow,
  createCommissionImportRowId,
  getCommissionRowIssues,
  parseCommissionWorkbook,
  parseImportMoney,
} from '@/lib/commissionImport';
import CurrencyInput from '@/components/ui/currency-input';
import DatePicker from '@/components/ui/date-picker';
import SearchableSelect from '@/components/ui/searchable-select';

const CODE_MAP_STORAGE_KEY = 'commission_import_code_map';

interface ImportCommissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (commissions: Omit<Commission, 'id' | 'db_id' | 'criado_em'>[]) => Promise<unknown>;
  consultants: string[];
  managers: string[];
  angels: string[];
  pvs: string[];
}

const readSavedCodeMap = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem(CODE_MAP_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const ImportCommissionsModal = ({
  isOpen,
  onClose,
  onImport,
  consultants,
  managers,
  angels,
  pvs,
}: ImportCommissionsModalProps) => {
  const [rows, setRows] = useState<CommissionImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [skippedUnpaid, setSkippedUnpaid] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [bulk, setBulk] = useState({ consultant: '', manager: '', pv: '', angel: '', hasAngel: false });
  const [codeMap, setCodeMap] = useState<Record<string, string>>(readSavedCodeMap);

  const updateRow = (id: string, patch: Partial<CommissionImportRow>) => {
    setRows(prev => prev.map(row => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addEmptyRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: createCommissionImportRowId(),
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
        code: '',
        company: '',
        payment: '',
        contract: '',
        taxRate: COMMISSION_IMPORT_TAX_RATE,
      },
    ]);
  };

  const pendingRows = useMemo(() => rows.filter(row => getCommissionRowIssues(row).length > 0).length, [rows]);

  const rowCodes = useMemo(
    () => Array.from(new Set(rows.map(row => row.code).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const mappedCodesCount = useMemo(
    () => rowCodes.filter(code => Boolean(codeMap[code]?.trim())).length,
    [rowCodes, codeMap],
  );

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const { rows: parsed, skippedUnpaid: unpaidCount } = parseCommissionWorkbook(workbook, readSavedCodeMap());
      setSkippedUnpaid(unpaidCount);
      if (!parsed.length) {
        toast.error(
          unpaidCount > 0
            ? `Nenhuma linha para importar: as ${unpaidCount} linha(s) da planilha estão sem pagamento.`
            : 'Nenhuma linha encontrada na planilha. Verifique se a primeira linha é o cabeçalho.',
        );
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      toast.success(
        `${parsed.length} linha(s) carregada(s).${unpaidCount > 0 ? ` ${unpaidCount} sem pagamento ignorada(s).` : ''} Revise e complete as informações pendentes.`,
      );
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
      const { rows: parsed, skippedUnpaid: unpaidCount } = parseCommissionWorkbook(workbook, readSavedCodeMap());
      setSkippedUnpaid(unpaidCount);
      if (!parsed.length) {
        toast.error(
          unpaidCount > 0
            ? `Nenhuma linha para importar: as ${unpaidCount} linha(s) coladas estão sem pagamento.`
            : 'Nenhuma linha encontrada nos dados colados.',
        );
        return;
      }
      setRows(parsed);
      setFileName('Dados colados');
      setShowPaste(false);
      toast.success(
        `${parsed.length} linha(s) carregada(s).${unpaidCount > 0 ? ` ${unpaidCount} sem pagamento ignorada(s).` : ''} Revise e complete as informações pendentes.`,
      );
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

  const applyCodeMap = () => {
    if (!rowCodes.length) return;
    localStorage.setItem(CODE_MAP_STORAGE_KEY, JSON.stringify(codeMap));
    setRows(prev => prev.map(row => (row.code && codeMap[row.code]?.trim() ? { ...row, consultant: codeMap[row.code].trim() } : row)));
    toast.success('De-para aplicado às linhas com código.');
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
      const payloads = rows.map(buildCommissionPayload);
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
        Grupo: '12204',
        Cota: '2149',
        Valor: '120.000,00',
        PV: pvs[0] || 'Matriz',
        Matricula: '007115',
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
    setSkippedUnpaid(0);
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
      <DialogContent className="sm:max-w-[96vw] xl:max-w-[1450px] bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <UploadCloud className="w-6 h-6 text-brand-500" />
            <span>Importar comissões de planilha</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Imposto padrão: {COMMISSION_IMPORT_TAX_RATE}%
            </span>
          </DialogTitle>
          <DialogDescription>
            Envie o export "Produção por Cota" (.xlsx, .xls ou .csv). O sistema lê Cliente/Cota, Data, Grupo, Cota, Crédito e PV automaticamente e ignora as linhas marcadas como "Sem Pagamento". Consultor (matrícula), Gestor e Anjo não vêm na planilha — use o de-para de códigos, o preenchimento em massa ou complete nas linhas destacadas em amarelo.
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
                placeholder={'Cliente\tData\tValor\tGrupo\tCota\tPV\nJoão da Silva\t01/11/2026\t120.000,00\t12204\t2149\tMatriz'}
                className="min-h-[110px] font-mono text-xs"
              />
              <Button type="button" size="sm" onClick={handlePastedData}>
                Processar dados colados
              </Button>
            </div>
          )}

          {rows.length > 0 && (
            <>
              {rowCodes.length > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                    <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                      De-para de códigos ({mappedCodesCount}/{rowCodes.length} preenchidos)
                    </p>
                    <span className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                      A planilha não traz o nome do consultor, apenas a matrícula. Associe cada código uma vez.
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rowCodes.map(code => (
                      <div key={code} className="flex items-center gap-2 rounded-md border border-indigo-200 bg-white p-1.5 dark:border-indigo-900 dark:bg-slate-900">
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                          {code}
                        </span>
                        <SearchableSelect
                          value={codeMap[code] || ''}
                          onChange={value => setCodeMap(prev => ({ ...prev, [code]: value }))}
                          options={consultants}
                          placeholder="Pesquisar consultor"
                          searchPlaceholder="Pesquisar consultor..."
                          emptyLabel="Nenhum consultor encontrado."
                          className="flex-1"
                          invalid={!codeMap[code]?.trim()}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                      O de-para fica salvo neste navegador para as próximas importações.
                    </p>
                    <Button type="button" size="sm" onClick={applyCodeMap}>
                      Aplicar de-para
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-900 dark:bg-brand-950/20">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[170px] flex-1">
                    <Label htmlFor="bulkConsultant" className="text-xs">Consultor para todas as linhas</Label>
                    <SearchableSelect
                      id="bulkConsultant"
                      value={bulk.consultant}
                      onChange={value => setBulk(prev => ({ ...prev, consultant: value }))}
                      options={consultants}
                      placeholder="Pesquisar consultor"
                      searchPlaceholder="Pesquisar consultor..."
                      emptyLabel="Nenhum consultor encontrado."
                      className="mt-1 h-9"
                    />
                  </div>
                  <div className="min-w-[170px] flex-1">
                    <Label htmlFor="bulkManager" className="text-xs">Gestor para todas as linhas</Label>
                    <SearchableSelect
                      id="bulkManager"
                      value={bulk.manager}
                      onChange={value => setBulk(prev => ({ ...prev, manager: value }))}
                      options={managers}
                      placeholder="Pesquisar gestor"
                      searchPlaceholder="Pesquisar gestor..."
                      emptyLabel="Nenhum gestor encontrado."
                      className="mt-1 h-9"
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
                  Dica: se todas as vendas têm o mesmo gestor, preencha só aqui e clique em "Aplicar a todas".
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
                  <span className="text-slate-500 dark:text-slate-400">Imposto padrão de {COMMISSION_IMPORT_TAX_RATE}% (editável por linha)</span>
                  {skippedUnpaid > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {skippedUnpaid} sem pagamento ignorada(s)
                    </span>
                  )}
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addEmptyRow}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar linha
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                <table className="w-full min-w-[1720px] text-xs">
                  <thead className="bg-gray-50 text-left uppercase tracking-wide text-gray-500 dark:bg-slate-700 dark:text-gray-300">
                    <tr>
                      <th className="px-2 py-2">Cliente *</th>
                      <th className="px-2 py-2">Data *</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Grupo</th>
                      <th className="px-2 py-2">Cota</th>
                      <th className="px-2 py-2">PV</th>
                      <th className="px-2 py-2">Valor *</th>
                      <th className="px-2 py-2 text-center">Imposto %</th>
                      <th className="px-2 py-2">Consultor *</th>
                      <th className="px-2 py-2">Gestor *</th>
                      <th className="px-2 py-2">Anjo</th>
                      <th className="px-2 py-2">Pendências</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {rows.map(row => {
                      const issues = getCommissionRowIssues(row);
                      return (
                        <tr key={row.id} className={issues.length ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                          <td className="px-2 py-2">
                            <Input
                              value={row.clientName}
                              onChange={event => updateRow(row.id, { clientName: event.target.value })}
                              placeholder="Nome do cliente"
                              title={row.clientName}
                              className={`h-8 w-[22rem] min-w-[20rem] ${!row.clientName.trim() ? missingCellClass : ''}`}
                            />
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {row.contract && <span className="text-[10px] text-slate-400">Contrato {row.contract}</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <DatePicker
                              value={row.date}
                              onChange={date => updateRow(row.id, { date })}
                              className="w-36"
                              invalid={!row.date}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={row.type}
                              onChange={event => updateRow(row.id, { type: event.target.value as CommissionImportRow['type'] })}
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
                              className="h-8 w-40"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <CurrencyInput
                              value={parseImportMoney(row.value)}
                              onValueChange={numericValue => updateRow(row.id, { value: String(numericValue) })}
                              placeholder="R$ 0,00"
                              className={`h-8 w-36 text-right font-mono ${parseImportMoney(row.value) <= 0 ? missingCellClass : ''}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="relative w-20">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={Number.isFinite(row.taxRate) ? row.taxRate : ''}
                                onChange={event => {
                                  const parsedTax = parseFloat(event.target.value);
                                  updateRow(row.id, {
                                    taxRate: Number.isFinite(parsedTax) ? Math.min(100, Math.max(0, parsedTax)) : 0,
                                  });
                                }}
                                onFocus={event => event.currentTarget.select()}
                                title="Imposto aplicado nesta linha"
                                className={`h-8 w-20 pr-5 text-right ${
                                  !Number.isFinite(row.taxRate) || row.taxRate < 0 || row.taxRate > 100 ? missingCellClass : ''
                                }`}
                              />
                              <span className="pointer-events-none absolute right-2 top-2 text-[11px] text-gray-400">%</span>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <SearchableSelect
                              value={row.consultant}
                              onChange={value => updateRow(row.id, { consultant: value })}
                              options={consultants}
                              placeholder={row.code ? `Cód. ${row.code}` : 'Pesquisar consultor'}
                              searchPlaceholder="Pesquisar consultor..."
                              emptyLabel="Nenhum consultor encontrado."
                              className="w-40"
                              invalid={!row.consultant.trim()}
                            />
                            {row.code && <p className="mt-0.5 font-mono text-[10px] text-slate-400">Matrícula {row.code}</p>}
                          </td>
                          <td className="px-2 py-2">
                            <SearchableSelect
                              value={row.manager}
                              onChange={value => updateRow(row.id, { manager: value })}
                              options={managers}
                              placeholder="Pesquisar gestor"
                              searchPlaceholder="Pesquisar gestor..."
                              emptyLabel="Nenhum gestor encontrado."
                              className="w-40"
                              invalid={!row.manager.trim()}
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
            * Campos obrigatórios. O imposto padrão é {COMMISSION_IMPORT_TAX_RATE}% e pode ser alterado linha a linha na coluna "Imposto %".
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
