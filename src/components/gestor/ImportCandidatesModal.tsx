import React, { useState, useMemo } from 'react';
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
    phone: '',
    email: '',
    origin: '',
    responsibleUserId: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const requiredFields = ['name']; // Apenas o nome é obrigatório para triagem inicial

  // Parse headers when data is pasted
  useMemo(() => {
    if (pastedData) {
      const lines = pastedData.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const firstLine = lines[0];
        // Try to detect delimiter (tab or comma)
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        const parsedHeaders = firstLine.split(delimiter).map(h => h.trim());
        setHeaders(parsedHeaders);
        // Attempt to auto-map common headers
        setColumnMapping(prev => ({
          name: parsedHeaders.find(h => h.toLowerCase().includes('nome')) || prev.name,
          phone: parsedHeaders.find(h => h.toLowerCase().includes('fone') || h.toLowerCase().includes('tel')) || prev.phone,
          email: parsedHeaders.find(h => h.toLowerCase().includes('email')) || prev.email,
          origin: parsedHeaders.find(h => h.toLowerCase().includes('origem')) || prev.origin,
          responsibleUserId: parsedHeaders.find(h => h.toLowerCase().includes('responsavel')) || prev.responsibleUserId,
        }));
      }
    } else {
      setHeaders([]);
      setColumnMapping({ name: '', phone: '', email: '', origin: '', responsibleUserId: '' });
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

      // Map values to candidateData
      Object.entries(columnMapping).forEach(([fieldKey, headerName]) => {
        const headerIndex = headers.indexOf(headerName);
        if (headerIndex !== -1 && values[headerIndex]) {
          if (fieldKey === 'responsibleUserId') {
            const responsibleName = values[headerIndex];
            const foundMember = responsibleMembers.find(m => m.name.toLowerCase() === responsibleName.toLowerCase());
            if (foundMember) {
              candidateData.responsibleUserId = foundMember.id;
            } else {
              currentRecordErrors.push(`Responsável "${responsibleName}" não encontrado.`);
              recordIsValid = false;
            }
          } else if (fieldKey === 'origin') {
            const originName = values[headerIndex];
            if (origins.includes(originName)) {
              candidateData.origin = originName;
            } else {
              currentRecordErrors.push(`Origem "${originName}" não encontrada nas opções configuradas.`);
              recordIsValid = false;
            }
          } else {
            (candidateData as any)[fieldKey] = values[headerIndex];
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
    setColumnMapping({ name: '', phone: '', email: '', origin: '', responsibleUserId: '' });
    setImportResult(null);
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
              placeholder="Cole aqui as colunas: Nome, Telefone, Email, Origem, Responsável..."
            />
          </div>

          {headers.length > 0 && (
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
                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
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
                    <SelectItem value="">Ignorar</SelectItem>
                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
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
                    <SelectItem value="">Ignorar</SelectItem>
                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
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
                    <SelectItem value="">Ignorar</SelectItem>
                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
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
                    <SelectItem value="">Ignorar</SelectItem>
                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
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
            disabled={isProcessing || !pastedData || !columnMapping.name}
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