import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle, Save, Users, ShieldBan } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { ColdCallLead } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export interface ColdCallImportConsultant {
  id: string;
  name: string;
  key: string;
}

type LeadInput = Omit<ColdCallLead, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_stage'>;

interface ImportAssignment {
  lead: LeadInput;
  consultantId: string;
}

interface ImportColdCallLeadsDivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: ColdCallImportConsultant[];
  existingLeads: ColdCallLead[];
  onImport: (items: ImportAssignment[]) => Promise<void>;
}

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

const parsePastedData = (pastedData: string): { items: LeadInput[]; errors: string[] } => {
  const items: LeadInput[] = [];
  const errors: string[] = [];
  const allLines = pastedData.split('\n').filter(line => line.trim() !== '');
  if (allLines.length === 0) return { items, errors };

  const firstLine = allLines[0];
  const countChar = (ch: string) => (firstLine.match(new RegExp(ch === '\t' ? '\\t' : ch, 'g')) || []).length;
  const counts = {
    '\t': countChar('\t'),
    ';': countChar(';'),
    ',': countChar(','),
  };
  let delimiter = '\t';
  if (counts[';'] > 0 && counts[';'] >= counts[',']) {
    delimiter = ';';
  } else if (counts[','] > counts[';']) {
    delimiter = ',';
  } else if (counts['\t'] > 0) {
    delimiter = '\t';
  }

  let headers: string[] = [];
  let dataLines: string[] = [];
  const lowerFirst = firstLine.toLowerCase();
  if (lowerFirst.includes('telefone') || lowerFirst.includes('celular') || lowerFirst.includes('nome')) {
    headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
    dataLines = allLines.slice(1);
  } else {
    headers = ['telefone', 'nome', 'email', 'observações'];
    dataLines = allLines;
  }

  const headerMap: Record<string, 'phone' | 'name' | 'email' | 'notes'> = {
    'telefone': 'phone',
    'celular': 'phone',
    'fone': 'phone',
    'nome': 'name',
    'email': 'email',
    'e-mail': 'email',
    'observações': 'notes',
    'observacoes': 'notes',
    'observacao': 'notes',
    'anotações': 'notes',
    'anotacoes': 'notes',
  };

  dataLines.forEach((line, idx) => {
    if (!line.trim()) return;
    const values = line.split(delimiter).map(v => v.trim());
    const lead: Partial<LeadInput> = {};
    headers.forEach((header, col) => {
      const key = headerMap[header.trim()];
      const value = values[col];
      if (key && value) lead[key] = value;
    });

    if (!lead.phone?.trim()) {
      errors.push(`Linha ${idx + 1} (na planilha): telefone é obrigatório. "${line}"`);
      return;
    }
    if (!lead.name?.trim()) lead.name = lead.phone.trim();
    if (!lead.email) delete lead.email;
    if (!lead.notes) delete lead.notes;
    items.push(lead as LeadInput);
  });

  return { items, errors };
};

const ImportColdCallLeadsDivisionModal: React.FC<ImportColdCallLeadsDivisionModalProps> = ({
  isOpen,
  onClose,
  consultants,
  existingLeads,
  onImport,
}) => {
  const [pastedData, setPastedData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedItems, setParsedItems] = useState<LeadInput[]>([]);
  const [duplicatesInBase, setDuplicatesInBase] = useState(0);
  const [duplicatesInBatch, setDuplicatesInBatch] = useState(0);
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([]);
  const [selectedConsultantKeys, setSelectedConsultantKeys] = useState<string[]>(consultants.map(c => c.key));
  const [isImporting, setIsImporting] = useState(false);
  const [dbPhones, setDbPhones] = useState<Set<string>>(new Set());

  const loadDbPhones = useCallback(async () => {
    const { data } = await supabase.from('cold_call_leads').select('phone');
    const set = new Set<string>();
    (data || []).forEach(row => {
      if (row?.phone) set.add(normalizePhone(String(row.phone)));
    });
    setDbPhones(set);
  }, []);

  useEffect(() => {
    if (isOpen) loadDbPhones();
  }, [isOpen, loadDbPhones]);

  const existingPhones = useMemo(() => {
    const set = new Set(dbPhones);
    existingLeads.forEach(l => set.add(normalizePhone(l.phone)));
    return set;
  }, [existingLeads, dbPhones]);

  // Telefones reais da base (para sinalizar apenas o que é bloqueado contra o banco)
  const knownBasePhones = useMemo(() => {
    return new Set([...dbPhones, ...existingLeads.map(l => normalizePhone(l.phone))]);
  }, [existingLeads, dbPhones]);

  const handleProcess = () => {
    setIsProcessing(true);
    setParseErrors([]);
    setParsedItems([]);
    setDuplicatesInBase(0);
    setDuplicatesInBatch(0);
    setBlockedNumbers([]);

    const { items, errors } = parsePastedData(pastedData);

    const seenAll = new Set(existingPhones);
    let dupBase = 0;
    let dupBatch = 0;
    const blocked: string[] = [];
    const unique: LeadInput[] = [];
    items.forEach(item => {
      const norm = normalizePhone(item.phone);
      if (seenAll.has(norm)) {
        if (knownBasePhones.has(norm)) {
          dupBase += 1;
        } else {
          dupBatch += 1;
        }
        blocked.push(item.phone);
        return;
      }
      seenAll.add(norm);
      unique.push(item);
    });

    setParseErrors(errors);
    setParsedItems(unique);
    setDuplicatesInBase(dupBase);
    setDuplicatesInBatch(dupBatch);
    setBlockedNumbers(blocked);
    setIsProcessing(false);

    if (unique.length === 0) {
      toast.error('Nenhum lead válido para importar (todos duplicados ou inválidos).');
    }
  };

  const activeConsultants = consultants.filter(c => selectedConsultantKeys.includes(c.key));

  const assignments: ImportAssignment[] = useMemo(() => {
    if (activeConsultants.length === 0) return [];
    return parsedItems.map((item, index) => ({
      lead: item,
      consultantId: activeConsultants[index % activeConsultants.length].key,
    }));
  }, [parsedItems, activeConsultants]);

  const perConsultantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => { counts[a.consultantId] = (counts[a.consultantId] || 0) + 1; });
    return counts;
  }, [assignments]);

  const toggleConsultant = (key: string) => {
    setSelectedConsultantKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleImport = async () => {
    if (assignments.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(assignments);
      toast.success(`${assignments.length} leads importados e divididos entre ${activeConsultants.length} consultor(es).`);
      handleClose();
    } catch (err: any) {
      toast.error(`Erro ao salvar leads: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setIsImporting(false);
    setPastedData('');
    setParsedItems([]);
    setParseErrors([]);
    setDuplicatesInBase(0);
    setDuplicatesInBatch(0);
    setBlockedNumbers([]);
    setDbPhones(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UploadCloud className="w-6 h-6 text-brand-500" />
            <span>Importar e Dividir Prospects</span>
          </DialogTitle>
          <DialogDescription>
            Cole os dados da planilha (CSV ou tab-separated). Coluna obrigatória: Telefone. Colunas opcionais: Nome, Email, Observações. Os leads são divididos automaticamente entre os consultores marcados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
            <Label htmlFor="pastedData">Cole os dados da planilha aqui:</Label>
            <Textarea
              id="pastedData"
              value={pastedData}
              onChange={e => setPastedData(e.target.value)}
              rows={6}
              className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600 font-mono text-sm"
              placeholder={'Nome;Telefone;Email;Observações\nJoão Silva;(11) 98765-4321;joao@email.com;Cliente quente\nMaria Oliveira;(31) 99887-7665;;Retornar semana que vem'}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button type="button" onClick={handleProcess} disabled={isProcessing || !pastedData.trim()} variant="outline" className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Processar dados
            </Button>
            {parsedItems.length > 0 && (
              <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> {parsedItems.length} novos leads
              </span>
            )}
          </div>

          {(duplicatesInBase > 0 || duplicatesInBatch > 0) && (
            <div className="flex items-start space-x-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300">
              <ShieldBan className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {duplicatesInBase > 0 && (
                  <p><strong>{duplicatesInBase}</strong> telefone(s) já existente(s) na base foram bloqueados e não serão importados.</p>
                )}
                {duplicatesInBatch > 0 && (
                  <p><strong>{duplicatesInBatch}</strong> telefone(s) repetido(s) dentro da própria lista colada foram mantidos apenas uma vez.</p>
                )}
                {blockedNumbers.length > 0 && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Números bloqueados: <span className="font-mono break-all">{blockedNumbers.map(n => normalizePhone(n)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              <p className="flex items-center font-medium"><AlertTriangle className="w-4 h-4 mr-1.5" /> Linhas inválidas ignoradas:</p>
              <ul className="mt-1 max-h-28 list-inside list-disc space-y-0.5 overflow-y-auto text-xs custom-scrollbar">
                {parseErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {parsedItems.length > 0 && (
            <>
              <div>
                <Label className="flex items-center"><Users className="w-4 h-4 mr-1.5" /> Divisão automática entre consultores</Label>
                {consultants.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Nenhum consultor de cold call ativo. Cadastre um consultor na tela do gestor.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {consultants.map(c => {
                      const checked = selectedConsultantKeys.includes(c.key);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleConsultant(c.key)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${checked ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'border-gray-200 text-gray-500 dark:border-slate-600 dark:text-gray-400'}`}
                        >
                          <input type="checkbox" readOnly checked={checked} className="h-4 w-4 rounded border-gray-300" />
                          {c.name}
                          {checked && perConsultantCounts[c.key] > 0 && (
                            <span className="rounded-full bg-brand-600 text-white px-2 py-0.5 text-xs font-bold">{perConsultantCounts[c.key]}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Telefone</th>
                      <th className="px-3 py-2">Consultor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {assignments.map((a, i) => {
                      const consultant = consultants.find(c => c.key === a.consultantId);
                      return (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{a.lead.name}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{a.lead.phone}</td>
                          <td className="px-3 py-2 font-medium text-brand-600 dark:text-brand-400">{consultant?.name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={handleClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || assignments.length === 0 || activeConsultants.length === 0}
            className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto"
          >
            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isImporting ? 'Importando...' : `Importar ${assignments.length} leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportColdCallLeadsDivisionModal;