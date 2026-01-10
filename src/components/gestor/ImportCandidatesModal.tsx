import React, { useState, useMemo, useEffect } from 'react';
import { X, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import { Candidate, TeamMember } from '@/types';

interface ImportCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  origins: string[];
  responsibleMembers: TeamMember[];
  onImport: (candidates: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>[]) => Promise<void>;
}

export const ImportCandidatesModal: React.FC<ImportCandidatesModalProps> = ({
  isOpen,
  onClose,
  origins,
  responsibleMembers,
  onImport,
}) => {
  const [pastedData, setPastedData] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    name: '',
    screeningStatus: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [headerParseError, setHeaderParseError] = useState<string | null>(null);

  const requiredFields = ['name'];
  const allowedScreeningStatuses = ['Pending Contact', 'Contacted', 'No Fit'];

  const mapIncomingStatus = (incomingStatus: string): 'Pending Contact' | 'Contacted' | 'No Fit' | null => {
    const lowerCaseStatus = incomingStatus.toLowerCase();
    if (lowerCaseStatus.includes('sem perfil')) return 'No Fit';
    if (lowerCaseStatus.includes('contato feito')) return 'Contacted';
    if (lowerCaseStatus.includes('pendente')) return 'Pending Contact';
    return null;
  };

  useEffect(() => {
    setHeaderParseError(null);

    if (pastedData) {
      const lines = pastedData.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const firstLine = lines[0];
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        
        let delimiter = ',';
        if (tabCount > commaCount) {
          delimiter = '\t';
        }

        const parsedHeaders = firstLine.split(delimiter).map(h => h.trim());
        const cleanedHeaders = parsedHeaders.filter(h => h !== '');

        if (cleanedHeaders.length > 0) {
          setHeaders(cleanedHeaders);
          setColumnMapping(prev => ({
            name: cleanedHeaders.find(h => h.toLowerCase().includes('nome')) || prev.name,
            screeningStatus: cleanedHeaders.find(h => h.toLowerCase().includes('status') || h.toLowerCase().includes('triagem')) || prev.screeningStatus,
          }));
        } else {
          setHeaders([]);
          setHeaderParseError("Não foi possível identificar cabeçalhos válidos na primeira linha. Verifique o formato.");
        }
      } else {
        setHeaders([]);
        setHeaderParseError("Nenhuma linha válida encontrada nos dados colados.");
      }
    } else {
      setHeaders([]);
      setColumnMapping({ name: '', screeningStatus: '' });
    }
  }, [pastedData]);

  const handleProcessImport = async () => {
    setIsProcessing(true);
    setImportResult(null);
    const newCandidates: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>[] = [];
    const failedRecords: string[] = [];
    let successCount = 0;
    let failCount = 0;

    const lines = pastedData.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      toast.error("Nenhum dado para importar. Cole os dados da sua planilha.");
      setIsProcessing(false);
      return;
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const dataLines = lines.slice(1);

    for (const line of dataLines) {
      const values = line.split(delimiter).map(v => v.trim());
      const candidateData: Partial<Omit<Candidate, 'id' | 'createdAt' | 'db_id'>> = {
        status: 'Triagem',
        screeningStatus: 'Pending Contact',
        interviewDate: '',
        interviewer: '',
        interviewScores: { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
        checklistProgress: {},
        consultantGoalsProgress: {},
        feedbacks: [],
      };
      let recordIsValid = true;
      const currentRecordErrors: string[] = [];

      // Process mapped fields (name, screeningStatus)
      const nameHeaderIndex = headers.indexOf(columnMapping.name);
      if (nameHeaderIndex !== -1 && values[nameHeaderIndex]) {
        candidateData.name = values[nameHeaderIndex];
      }

      const screeningStatusHeaderIndex = headers.indexOf(columnMapping.screeningStatus);
      if (screeningStatusHeaderIndex !== -1 && values[screeningStatusHeaderIndex]) {
        const mappedStatus = mapIncomingStatus(values[screeningStatusHeaderIndex]);
        if (mappedStatus) {
          candidateData.screeningStatus = mappedStatus;
        } else {
          currentRecordErrors.push(`Status de triagem "${values[screeningStatusHeaderIndex]}" inválido. Use: "Sem perfil", "Contato Feito" ou "Pendente".`);
          recordIsValid = false;
        }
      }

      // Attempt to auto-detect other common fields if headers exist
      const autoDetectFields = {
        phone: ['fone', 'tel', 'telefone'],
        email: ['email'],
        origin: ['origem'],
        responsibleUserId: ['responsavel', 'gestor'],
      };

      Object.entries(autoDetectFields).forEach(([fieldKey, possibleHeaders]) => {
        for (const possibleHeader of possibleHeaders) {
          const headerIndex = headers.findIndex(h => h.toLowerCase().includes(possibleHeader));
          if (headerIndex !== -1 && values[headerIndex]) {
            const value = values[headerIndex];
            if (fieldKey === 'responsibleUserId') {
              const foundMember = responsibleMembers.find(m => m.name.toLowerCase() === value.toLowerCase());
              if (foundMember) {
                candidateData.responsibleUserId = foundMember.id;
              } else {
                currentRecordErrors.push(`Responsável "${value}" não encontrado.`);
                recordIsValid = false;
              }
            } else if (fieldKey === 'origin') {
              if (origins.includes(value)) {
                candidateData.origin = value;
              } else {
                currentRecordErrors.push(`Origem "${value}" não encontrada nas opções configuradas.`);
                recordIsValid = false;
              }
            } else {
              (candidateData as any)[fieldKey] = value;
            }
            break; // Found a match, move to next fieldKey
          }
        }
      });

      // Validate required fields
      requiredFields.forEach(field => {
        if (!(candidateData as any)[field] || (candidateData as any)[field].trim() === '') {
          currentRecordErrors.push(`Campo obrigatório "${field}" ausente.`);
          recordIsValid = false;
        }
      });

      if (recordIsValid) {
        newCandidates.push(candidateData as Omit<Candidate, 'id' | 'createdAt' | 'db_id'>);
        successCount++;
      } else {
        failCount++;
        failedRecords.push(`Linha "${line}" falhou: ${currentRecordErrors.join(', ')}`);
      }
    }

    if (newCandidates.length > 0) {
      try {
        await onImport(newCandidates);
        toast.success(`${successCount} candidatos importados com sucesso!`);
      } catch (error: any) {
        toast.error(`Erro ao salvar candidatos: ${error.message}`);
        failCount += successCount;
        successCount = 0;
      }
    } else if (failCount === 0) {
      toast.info("Nenhum candidato válido para importar.");
    }

    setImportResult({ success: successCount, failed: failCount, errors: failedRecords });
    setIsProcessing(false);
  };

  const handleCloseModal = () => {
    setPastedData('');
    setHeaders([]);
    setColumnMapping({ name: '', screeningStatus: '' });
    setImportResult(null);
    setHeaderParseError(null);
    onClose();
  };

  if (!isOpen) return null;

  const renderHeaderOptions = () => {
    const options = [<SelectItem key="none" value="none">Ignorar</SelectItem>];

    if (headers.length > 0) {
      options.push(...headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>));
    }
    return options;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UploadCloud className="w-6 h-6 text-brand-500" />
            <span>Importar Candidatos da Planilha</span>
          </DialogTitle>
          <DialogDescription>
            Cole os dados da sua planilha (CSV ou tab-separated) e mapeie as colunas para os campos do sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="pastedData">Cole os dados da sua planilha aqui:</Label>
            <Textarea
              id="pastedData"
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              rows={8}
              className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600 font-mono text-sm"
              placeholder="Cole aqui os dados da sua planilha. Use vírgula (,) ou tab (	) como separador.&#10;&#10;Exemplo:&#10;Nome:,Status&#10;Susana,Sem perfil&#10;Rafinha,Contato Feito&#10;Gislaine Aparecida,Pendente"
            />
            {headerParseError && (
              <p className="text-red-500 text-sm mt-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" />{headerParseError}</p>
            )}
          </div>

          {/* Mapeamento de Colunas - Renderizado condicionalmente */}
          {headers.length === 0 && !headerParseError ? (
            <div className="col-span-2 text-center text-gray-500 dark:text-gray-400 mt-4">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p>Cole os dados da sua planilha acima para que as colunas sejam detectadas.</p>
              <p className="text-sm">Se os cabeçalhos não aparecerem, verifique o formato (CSV ou tab-separated).</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <h3 className="col-span-2 text-lg font-semibold text-gray-900 dark:text-white mt-2">Mapeamento de Colunas Essenciais</h3>
              
              {/* Nome */}
              <div>
                <Label htmlFor="map-name">Nome Completo *</Label>
                <Select value={columnMapping.name} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, name: val }))}>
                  <SelectTrigger id="map-name" className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione a coluna do Nome" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {renderHeaderOptions()}
                  </SelectContent>
                </Select>
              </div>

              {/* Status de Triagem */}
              <div>
                <Label htmlFor="map-screeningStatus">Status de Triagem</Label>
                <Select value={columnMapping.screeningStatus} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, screeningStatus: val }))}>
                  <SelectTrigger id="map-screeningStatus" className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione a coluna do Status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {renderHeaderOptions()}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {importResult && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Resultado da Importação:</h4>
              <p className="flex items-center text-green-600 dark:text-green-400"><CheckCircle2 className="w-4 h-4 mr-2" /> Sucesso: {importResult.success} candidatos</p>
              <p className="flex items-center text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4 mr-2" /> Falha: {importResult.failed} candidatos</p>
              {importResult.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-700 dark:text-red-300 max-h-32 overflow-y-auto custom-scrollbar">
                  <p className="font-medium">Detalhes dos erros:</p>
                  <ul className="list-disc list-inside">
                    {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={handleCloseModal} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleProcessImport}
            disabled={isProcessing || !pastedData || !columnMapping.name || (headers.length === 0 && pastedData.trim() !== '')}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            <span>{isProcessing ? 'Processando...' : 'Importar Candidatos'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};