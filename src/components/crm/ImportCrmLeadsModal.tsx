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
import toast from 'react-hot-toast';
import { CrmLead } from '@/types'; // Removido CrmField, CrmStage, TeamMember
import { useApp } from '@/context/AppContext'; // Importar useApp

interface ImportCrmLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (leads: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>[]) => Promise<void>;
}

export const ImportCrmLeadsModal: React.FC<ImportCrmLeadsModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const { origins } = useApp(); // Acessar a lista de origens do AppContext
  const [pastedData, setPastedData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleProcessImport = async () => {
    setIsProcessing(true);
    setImportResult(null);
    setParseError(null);

    const newLeads: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>[] = [];
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
    // Apenas 'nome' é um cabeçalho esperado para detecção
    if (lowerCaseFirstLine.includes('nome')) {
      hasHeader = true;
      headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
      dataLines = allLines.slice(1);
    } else {
      // Se não houver cabeçalho, assume que a primeira coluna é o nome e a segunda (se existir) é a origem
      headers = ['nome', 'origem']; 
      dataLines = allLines;
    }

    if (dataLines.length === 0) {
      setParseError(hasHeader ? 'Nenhum dado de lead encontrado após os cabeçalhos. Por favor, cole as linhas de dados.' : 'Nenhum dado de lead válido encontrado.');
      setIsProcessing(false);
      return;
    }

    const headerToFieldKeyMap: { [key: string]: string } = {
      'nome': 'name',
      'nome do lead': 'name',
      'origem': 'origin',
    };

    for (const line of dataLines) {
      const values = line.split(delimiter).map(v => v.trim());
      const leadData: Partial<Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>> = {
        data: {},
      };
      let recordIsValid = true;
      const currentRecordErrors: string[] = [];

      // Mapeia os valores para os campos do lead
      headers.forEach((header, index) => {
        const fieldKey = headerToFieldKeyMap[header];
        const value = values[index];

        if (fieldKey && value) {
          if (fieldKey === 'name') {
            leadData.name = value;
          } else if (fieldKey === 'origin') {
            // Valida a origem contra a lista de origens configuradas, se fornecida
            if (origins.includes(value)) {
              (leadData.data as any).origin = value;
            } else {
              currentRecordErrors.push(`Origem "${value}" inválida. Origens permitidas: ${origins.join(', ')}.`);
              recordIsValid = false;
            }
          }
        }
      });

      // Validação: Nome do Lead é obrigatório
      if (!leadData.name?.trim()) {
        currentRecordErrors.push('Campo "Nome do Lead" é obrigatório.');
        recordIsValid = false;
      }
      
      // Se a origem não foi fornecida ou é inválida, define um valor padrão
      if (!(leadData.data as any)?.origin?.trim() || !origins.includes((leadData.data as any)?.origin)) {
        (leadData.data as any).origin = 'Não Informado';
      }

      if (recordIsValid) {
        newLeads.push(leadData as Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>);
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
            <span>Importar Leads do CRM</span>
          </DialogTitle>
          <DialogDescription>
            Cole os dados da sua planilha (CSV ou tab-separated). Apenas a coluna 'Nome' é obrigatória. A 'Origem' é opcional e será preenchida como 'Não Informado' se não for fornecida.
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
              placeholder={`Cole aqui os dados da sua planilha. Use vírgula (,) ou tab (	) como separador.\n\nExemplo:\nNome\nJoão Silva\nMaria Oliveira\n\nOu com origem (opcional):\nNome,Origem\nJoão Silva,Indicação\nMaria Oliveira,Prospecção`}
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
            <span>{isProcessing ? 'Processando...' : 'Importar Leads'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};