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
  console.log("[ImportCandidatesModal] Modal is rendering. isOpen:", isOpen); // Adicionado para depuração
  const [pastedData, setPastedData] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    name: '',
    phone: '',
    email: '',
    origin: '',
    responsibleUserId: '',
    screeningStatus: '', // NOVO: Adicionado para mapear o status de triagem
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [headerParseError, setHeaderParseError] = useState<string | null>(null); // NOVO: Estado para erro de parsing de cabeçalho

  const requiredFields = ['name']; // Apenas o nome é obrigatório para triagem inicial
  const allowedScreeningStatuses = ['Pending Contact', 'Contacted', 'No Fit'];

  // Mapeamento de status da planilha para o sistema
  const mapIncomingStatus = (incomingStatus: string): 'Pending Contact' | 'Contacted' | 'No Fit' | null => {
    const lowerCaseStatus = incomingStatus.toLowerCase();
    if (lowerCaseStatus.includes('sem perfil')) return 'No Fit';
    if (lowerCaseStatus.includes('contato feito')) return 'Contacted';
    if (lowerCaseStatus.includes('pendente')) return 'Pending Contact';
    return null; // Retorna null se não houver correspondência
  };

  // Parse headers when data is pasted
  useEffect(() => {
    console.log("[ImportModal] Pasted data changed:", pastedData);
    setHeaderParseError(null); // Reset error on new paste

    if (pastedData) {
      const lines = pastedData.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const firstLine = lines[0];
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        
        let delimiter = ','; // Default to comma
        if (tabCount > commaCount) {
          delimiter = '\t'; // Prefer tab if more tabs
        }

        const parsedHeaders = firstLine.split(delimiter).map(h => h.trim());
        // Filter out any empty strings that might result from split (e.g., "a,,b" -> ["a", "", "b"])
        const cleanedHeaders = parsedHeaders.filter(h => h !== '');

        console.log("[ImportModal] Parsed headers:", cleanedHeaders);
        if (cleanedHeaders.length > 0) {
          setHeaders(cleanedHeaders);
          // Attempt to auto-map common headers
          setColumnMapping(prev => ({
            name: cleanedHeaders.find(h => h.toLowerCase().includes('nome')) || prev.name,
            phone: cleanedHeaders.find(h => h.toLowerCase().includes('fone') || h.toLowerCase().includes('tel') || h.toLowerCase().includes('telefone')) || prev.phone,
            email: cleanedHeaders.find(h => h.toLowerCase().includes('email')) || prev.email,
            origin: cleanedHeaders.find(h => h.toLowerCase().includes('origem')) || prev.origin,
            responsibleUserId: cleanedHeaders.find(h => h.toLowerCase().includes('responsavel') || h.toLowerCase().includes('gestor')) || prev.responsibleUserId,
            screeningStatus: cleanedHeaders.find(h => h.toLowerCase().includes('status') || h.toLowerCase().includes('triagem')) || prev.screeningStatus, // NOVO: Auto-map status
          }));
        } else {
          setHeaders([]);
          setHeaderParseError("Não foi possível identificar cabeçalhos válidos na primeira linha. Verifique o formato.");
          console.log("[ImportModal] No valid headers found after cleaning.");
        }
      } else {
        setHeaders([]);
        setHeaderParseError("Nenhuma linha válida encontrada nos dados colados.");
        console.log("[ImportModal] No valid lines found in pasted data.");
      }
    } else {
      setHeaders([]);
      setColumnMapping({ name: '', phone: '', email: '', origin: '', responsibleUserId: '', screeningStatus: '' }); // Reset mapping when data is empty
      console.log("[ImportModal] Pasted data is empty.");
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
    if (lines.length <= 1) { // Only headers or empty
      toast.error("Nenhum dado para importar. Cole os dados da sua planilha.");
      setIsProcessing(false);
      return;
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const dataLines = lines.slice(1); // Skip header row

    for (const line of dataLines) {
      const values = line.split(delimiter).map(v => v.trim());
      const candidateData: Partial<Omit<Candidate, 'id' | 'createdAt' | 'db_id'>> = {
        status: 'Triagem', // Sempre inicia no status de triagem
        screeningStatus: 'Pending Contact', // Default screening status
        interviewDate: '',
        interviewer: '',
        interviewScores: { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' },
        checklistProgress: {},
        consultantGoalsProgress: {},
        feedbacks: [],
      };
      let recordIsValid = true;
      const currentRecordErrors: string[] = [];

      // Map values to candidateData
      Object.entries(columnMapping).forEach(([fieldKey, headerName]) => {
        const headerIndex = headers.indexOf(headerName);
        if (headerIndex !== -1 && values[headerIndex]) {
          const value = values[headerIndex];
          if (fieldKey === 'responsibleUserId') {
            const responsibleName = value;
            const foundMember = responsibleMembers.find(m => m.name.toLowerCase() === responsibleName.toLowerCase());
            if (foundMember) {
              candidateData.responsibleUserId = foundMember.id;
            } else {
              currentRecordErrors.push(`Responsável "${responsibleName}" não encontrado.`);
              recordIsValid = false;
            }
          } else if (fieldKey === 'origin') {
            const originName = value;
            if (origins.includes(originName)) {
              candidateData.origin = originName;
            } else {
              currentRecordErrors.push(`Origem "${originName}" não encontrada nas opções configuradas.`);
              recordIsValid = false;
            }
          } else if (fieldKey === 'screeningStatus') { // NOVO: Lógica para status de triagem
            const mappedStatus = mapIncomingStatus(value);
            if (mappedStatus) {
              candidateData.screeningStatus = mappedStatus;
            } else {
              currentRecordErrors.push(`Status de triagem "${value}" inválido. Use: "Sem perfil", "Contato Feito" ou "Pendente".`);
              recordIsValid = false;
            }
          } else {
            (candidateData as any)[fieldKey] = value;
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
        failCount += successCount; // If batch save fails, all are considered failed
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
    setColumnMapping({ name: '', phone: '', email: '', origin: '', responsibleUserId: '', screeningStatus: '' });
    setImportResult(null);
    setHeaderParseError(null);
    onClose();
  };

  if (!isOpen) return null;

  const renderHeaderOptions = () => {
    // Always include "Ignorar" option
    const options = [<SelectItem key="ignore" value="">Ignorar</SelectItem>];

    if (headers.length === 0) {
      // If no headers are detected, provide a disabled option for feedback
      options.push(<SelectItem key="no-headers" value="" disabled>Nenhum cabeçalho detectado</SelectItem>);
    } else {
      // Otherwise, map the detected headers
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
              placeholder="Cole aqui os dados da sua planilha. Use vírgula (,) ou tab (	) como separador.&#10;&#10;Exemplo:&#10;Nome:,Staus&#10;Susana,Sem perfil&#10;Rafinha,Contato Feito&#10;Gislaine Aparecida,Pendente"
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
              <h3 className="col-span-2 text-lg font-semibold text-gray-900 dark:text-white mt-2">Mapeamento de Colunas</h3>
              
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

              {/* Telefone */}
              <div>
                <Label htmlFor="map-phone">Telefone</Label>
                <Select value={columnMapping.phone} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, phone: val }))}>
                  <SelectTrigger id="map-phone" className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione a coluna do Telefone" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {renderHeaderOptions()}
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="map-email">E-mail</Label>
                <Select value={columnMapping.email} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, email: val }))}>
                  <SelectTrigger id="map-email" className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione a coluna do E-mail" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {renderHeaderOptions()}
                  </SelectContent>
                </Select>
              </div>

              {/* Origem */}
              <div>
                <Label htmlFor="map-origin">Origem</Label>
                <Select value={columnMapping.origin} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, origin: val }))}>
                  <SelectTrigger id="map-origin" className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione a coluna da Origem" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {renderHeaderOptions()}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável */}
              <div>
                <Label htmlFor="map-responsible">Responsável (Nome)</Label>
                <Select value={columnMapping.responsibleUserId} onValueChange={(val) => setColumnMapping(prev => ({ ...prev, responsibleUserId: val }))}>
                  <SelectTrigger id="map-responsible" className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione a coluna do Responsável" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {renderHeaderOptions()}
                  </SelectContent>
                </Select>
              </div>

              {/* NOVO: Status de Triagem */}
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