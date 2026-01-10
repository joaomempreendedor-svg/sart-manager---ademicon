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
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null); // General parsing error

  const requiredFields = ['name'];
  const allowedScreeningStatuses = ['Pending Contact', 'Contacted', 'No Fit'];

  const mapIncomingStatus = (incomingStatus: string): 'Pending Contact' | 'Contacted' | 'No Fit' | null => {
    const lowerCaseStatus = incomingStatus.toLowerCase();
    if (lowerCaseStatus.includes('sem perfil')) return 'No Fit';
    if (lowerCaseStatus.includes('contato feito')) return 'Contacted';
    if (lowerCaseStatus.includes('pendente')) return 'Pending Contact';
    return null;
  };

  const handleProcessImport = async () => {
    setIsProcessing(true);
    setImportResult(null);
    setParseError(null);

    const newCandidates: Omit<Candidate, 'id' | 'createdAt' | 'db_id'>[] = [];
    const failedRecords: string[] = [];
    let successCount = 0;
    let failCount = 0;

    const allLines = pastedData.split('\n').filter(line => line.trim() !== '');
    
    if (allLines.length === 0) {
      toast.error("Nenhum dado para importar. Cole os dados da sua planilha.");
      setIsProcessing(false);
      return;
    }

    const firstLine = allLines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    
    let delimiter = ',';
    if (tabCount > commaCount) {
      delimiter = '\t';
    }

    let headers: string[] = [];
    let dataLines: string[] = [];
    let hasHeader = false;

    // Heuristic to detect if the first line is a header
    const lowerCaseFirstLine = firstLine.toLowerCase();
    if (lowerCaseFirstLine.includes('nome') && lowerCaseFirstLine.includes('status')) {
      hasHeader = true;
      headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
      dataLines = allLines.slice(1);
    } else {
      // If no header, assume default headers and all lines are data
      headers = ['nome', 'status']; // Hardcode expected headers
      dataLines = allLines;
    }

    if (dataLines.length === 0) {
      setParseError(hasHeader ? "Nenhum dado de candidato encontrado após os cabeçalhos. Por favor, cole as linhas de dados." : "Nenhum dado de candidato válido encontrado.");
      setIsProcessing(false);
      return;
    }

    // Identify column indices based on detected/assumed headers
    const nameIndex = headers.findIndex(h => h.includes('nome'));
    const statusIndex = headers.findIndex(h => h.includes('status') || h.includes('triagem'));

    if (nameIndex === -1) {
      setParseError("Coluna 'Nome' não encontrada nos dados. Verifique o formato.");
      setIsProcessing(false);
      return;
    }
    if (statusIndex === -1) {
      setParseError("Coluna 'Status' ou 'Triagem' não encontrada nos dados. Verifique o formato.");
      setIsProcessing(false);
      return;
    }

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
        phone: '', 
        email: '', 
        origin: '', 
        responsibleUserId: undefined, 
      };
      let recordIsValid = true;
      const currentRecordErrors: string[] = [];

      // Extract Name
      if (values[nameIndex]) {
        candidateData.name = values[nameIndex];
      } else {
        currentRecordErrors.push("Nome do candidato ausente.");
        recordIsValid = false;
      }

      // Extract Screening Status
      if (values[statusIndex]) {
        const mappedStatus = mapIncomingStatus(values[statusIndex]);
        if (mappedStatus) {
          candidateData.screeningStatus = mappedStatus;
        } else {
          currentRecordErrors.push(`Status de triagem "${values[statusIndex]}" inválido. Use: "Sem perfil", "Contato Feito" ou "Pendente".`);
          recordIsValid = false;
        }
      } else {
        currentRecordErrors.push("Status de triagem ausente.");
        recordIsValid = false;
      }

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
    setImportResult(null);
    setParseError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UploadCloud className="w-6 h-6 text-brand-500" />
            <span>Importar Candidatos da Planilha</span>
          </DialogTitle>
          <DialogDescription>
            Cole os dados da sua planilha (CSV ou tab-separated). O sistema buscará apenas as colunas 'Nome' e 'Status'.
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
              placeholder="Cole aqui os dados da sua planilha. Use vírgula (,) ou tab (	) como separador.&#10;&#10;Exemplo:&#10;Nome,Status&#10;Susana,Sem perfil&#10;Rafinha,Contato Feito&#10;Gislaine Aparecida,Pendente"
            />
            {parseError && (
              <p className="text-red-500 text-sm mt-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" />{parseError}</p>
            )}
          </div>

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
            disabled={isProcessing || !pastedData}
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