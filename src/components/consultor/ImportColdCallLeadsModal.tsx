import React, { useState, useMemo } from 'react';
import { X, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Save, Phone, Mail } from 'lucide-react';
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

interface ImportColdCallLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (leads: Omit<ColdCallLead, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_stage'>[]) => Promise<void>;
}

export const ImportColdCallLeadsModal: React.FC<ImportColdCallLeadsModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [pastedData, setPastedData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleProcessImport = async () => {
    setIsProcessing(true);
    setImportResult(null);
    setParseError(null);

    const newLeads: Omit<ColdCallLead, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_stage'>[] = [];
    const failedRecords: string[] = [];
    let successCount = 0;
    let failCount = 0;

    const allLines = pastedData.split('\n').filter(line => line.trim() !== '');

    if (allLines.length === 0) {
      toast.error('Nenhum dado para importar. Cole os dados da sua planilha.');
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

    const lowerCaseFirstLine = firstLine.toLowerCase();
    // Detecta cabeçalhos comuns para 'nome', 'telefone', 'email'
    if (lowerCaseFirstLine.includes('nome') || lowerCaseFirstLine.includes('telefone') || lowerCaseFirstLine.includes('email')) {
      hasHeader = true;
      headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
      dataLines = allLines.slice(1);
    } else {
      // Se não houver cabeçalho, assume que a primeira coluna é o telefone e a segunda (se existir) é o nome
      headers = ['telefone', 'nome', 'email']; 
      dataLines = allLines;
    }

    if (dataLines.length === 0) {
      setParseError(hasHeader ? 'Nenhum dado de lead encontrado após os cabeçalhos. Por favor, cole as linhas de dados.' : 'Nenhum dado de lead válido encontrado.');
      setIsProcessing(false);
      return;
    }

    const headerToFieldKeyMap: { [key: string]: string } = {
      'nome': 'name',
      'telefone': 'phone',
      'celular': 'phone',
      'email': 'email',
    };

    for (const line of dataLines) {
      const values = line.split(delimiter).map(v => v.trim());
      const leadData: Partial<Omit<ColdCallLead, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_stage'>> = {};
      let recordIsValid = true;
      const currentRecordErrors: string[] = [];

      // Mapeia os valores para os campos do lead
      headers.forEach((header, index) => {
        const fieldKey = headerToFieldKeyMap[header];
        const value = values[index];

        if (fieldKey && value) {
          if (fieldKey === 'name') {
            leadData.name = value;
          } else if (fieldKey === 'phone') {
            leadData.phone = value;
          } else if (fieldKey === 'email') {
            leadData.email = value;
          }
        }
      });

      // Validação: Telefone é obrigatório
      if (!leadData.phone?.trim()) {
        currentRecordErrors.push('Campo "Telefone" é obrigatório.');
        recordIsValid = false;
      }
      
      if (recordIsValid) {
        // Se o nome não foi fornecido, usa o telefone como nome
        if (!leadData.name?.trim()) {
          leadData.name = leadData.phone;
        }
        newLeads.push(leadData as Omit<ColdCallLead, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_stage'>);
        successCount++;
      } else {
        failCount++;
        failedRecords.push(`Linha "${line}" falhou: ${currentRecordErrors.join(', ')}`);
      }
    }

    if (newLeads.length > 0) {
      try {
        await onImport(newLeads);
        toast.success(`${successCount} leads importados com sucesso!`);
      } catch (error: any) {
        toast.error(`Erro ao salvar leads: ${error.message}`);
        failCount += successCount;
        successCount = 0;
      }
    } else if (failCount === 0) {
      toast.info('Nenhum lead válido para importar.');
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
            <span>Importar Prospects de Cold Call</span>
          </DialogTitle>
          <DialogDescription>
            Cole os dados da sua planilha (CSV ou tab-separated). A coluna 'Telefone' é obrigatória. A coluna 'Nome' é opcional e será preenchida com o telefone se não for fornecida.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
            <Label htmlFor="pastedData">Cole os dados da sua planilha aqui:</Label>
            <Textarea
              id="pastedData"
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              rows={8}
              className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600 font-mono text-sm"
              placeholder={`Cole aqui os dados da sua planilha. Use vírgula (,) ou tab (	) como separador.\n\nExemplo:\nTelefone,Nome,Email\n(11) 98765-4321,João Silva,joao@email.com\n(21) 91234-5678,,maria@email.com\n(31) 99887-7665,Carlos Souza`}
            />
            {parseError && (
              <p className="text-red-500 text-sm mt-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" />{parseError}</p>
            )}
          </div>

          {importResult && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Resultado da Importação:</h4>
              <p className="flex items-center text-green-600 dark:text-green-400"><CheckCircle2 className="w-4 h-4 mr-2" /> Sucesso: {importResult.success} leads</p>
              <p className="flex items-center text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4 mr-2" /> Falha: {importResult.failed} leads</p>
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

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={handleCloseModal} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto mb-2 sm:mb-0">
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleProcessImport}
            disabled={isProcessing || !pastedData}
            className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            <span>{isProcessing ? 'Processando...' : 'Importar Prospects'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};