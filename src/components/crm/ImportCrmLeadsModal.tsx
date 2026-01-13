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
import { CrmLead, CrmField, CrmStage, TeamMember } from '@/types';

interface ImportCrmLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (leads: Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>[]) => Promise<void>;
  crmFields: CrmField[];
  consultants: TeamMember[];
  stages: CrmStage[];
}

export const ImportCrmLeadsModal: React.FC<ImportCrmLeadsModalProps> = ({
  isOpen,
  onClose,
  onImport,
  crmFields,
  consultants,
  stages,
}) => {
  const [pastedData, setPastedData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const activeCrmFields = useMemo(() => crmFields.filter(f => f.is_active), [crmFields]);
  const consultantsMap = useMemo(() => new Map(consultants.map(c => [c.name.toLowerCase(), c.id])), [consultants]);
  const stagesMap = useMemo(() => new Map(stages.map(s => [s.name.toLowerCase(), s.id])), [stages]);

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

    // Heurística para detectar se a primeira linha é um cabeçalho
    const lowerCaseFirstLine = firstLine.toLowerCase();
    const commonLeadHeaders = ['nome', 'consultor', 'etapa', 'valor proposta', 'data fechamento proposta', 'valor vendido', 'grupo vendido', 'cota vendida', 'data venda'];
    
    if (commonLeadHeaders.some(h => lowerCaseFirstLine.includes(h))) {
      hasHeader = true;
      headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
      dataLines = allLines.slice(1);
    } else {
      // Se não houver cabeçalho, assumir um conjunto mínimo e todas as linhas são dados
      headers = ['nome']; // Apenas o nome é o mínimo obrigatório para tentar importar
      dataLines = allLines;
    }

    if (dataLines.length === 0) {
      setParseError(hasHeader ? 'Nenhum dado de lead encontrado após os cabeçalhos. Por favor, cole as linhas de dados.' : 'Nenhum dado de lead válido encontrado.');
      setIsProcessing(false);
      return;
    }

    // Mapear cabeçalhos para chaves de campo do CRM
    const headerToFieldKeyMap: { [key: string]: string } = {};
    activeCrmFields.forEach(field => {
      headerToFieldKeyMap[field.label.toLowerCase()] = field.key;
      headerToFieldKeyMap[field.key.toLowerCase()] = field.key; // Permitir mapear pela chave também
    });
    // Mapear cabeçalhos fixos
    headerToFieldKeyMap['nome'] = 'name';
    headerToFieldKeyMap['nome do lead'] = 'name';
    headerToFieldKeyMap['consultor'] = 'consultant_id';
    headerToFieldKeyMap['etapa'] = 'stage_id';
    headerToFieldKeyMap['valor proposta'] = 'proposalValue';
    headerToFieldKeyMap['data fechamento proposta'] = 'proposalClosingDate';
    headerToFieldKeyMap['valor vendido'] = 'soldCreditValue';
    headerToFieldKeyMap['grupo vendido'] = 'soldGroup';
    headerToFieldKeyMap['cota vendida'] = 'soldQuota';
    headerToFieldKeyMap['data venda'] = 'saleDate';


    for (const line of dataLines) {
      const values = line.split(delimiter).map(v => v.trim());
      const leadData: Partial<Omit<CrmLead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by' | 'updated_by'>> = {
        data: {},
      };
      let recordIsValid = true;
      const currentRecordErrors: string[] = [];

      // Preencher leadData com base nos cabeçalhos e valores
      headers.forEach((header, index) => {
        const fieldKey = headerToFieldKeyMap[header];
        const value = values[index];

        if (fieldKey && value) {
          if (fieldKey === 'name') {
            leadData.name = value;
          } else if (fieldKey === 'consultant_id') {
            const consultantId = consultantsMap.get(value.toLowerCase());
            if (consultantId) {
              leadData.consultant_id = consultantId;
            } else {
              currentRecordErrors.push(`Consultor "${value}" não encontrado.`);
              recordIsValid = false;
            }
          } else if (fieldKey === 'stage_id') {
            const stageId = stagesMap.get(value.toLowerCase());
            if (stageId) {
              leadData.stage_id = stageId;
            } else {
              currentRecordErrors.push(`Etapa "${value}" não encontrada.`);
              recordIsValid = false;
            }
          } else if (['proposalValue', 'soldCreditValue'].includes(fieldKey)) {
            const numericValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
            if (!isNaN(numericValue)) {
              (leadData as any)[fieldKey] = numericValue;
            } else {
              currentRecordErrors.push(`Valor inválido para "${header}".`);
              recordIsValid = false;
            }
          } else if (['proposalClosingDate', 'saleDate'].includes(fieldKey)) {
            // Validação básica de data (YYYY-MM-DD)
            if (/\d{4}-\d{2}-\d{2}/.test(value)) {
              (leadData as any)[fieldKey] = value;
            } else {
              currentRecordErrors.push(`Formato de data inválido para "${header}". Use YYYY-MM-DD.`);
              recordIsValid = false;
            }
          } else {
            // Campos personalizados
            (leadData.data as any)[fieldKey] = value;
          }
        }
      });

      // Validação de campos obrigatórios
      const nameField = activeCrmFields.find(f => f.key === 'name' || f.key === 'nome');
      if (nameField?.is_required && !leadData.name?.trim()) {
        currentRecordErrors.push('Campo "Nome do Lead" é obrigatório.');
        recordIsValid = false;
      } else if (!leadData.name?.trim() && !nameField) { // Se não há campo 'name' configurado, mas o nome é o primeiro campo
        if (values[0]) {
          leadData.name = values[0];
        } else {
          currentRecordErrors.push('Nome do lead é obrigatório (primeira coluna).');
          recordIsValid = false;
        }
      }

      activeCrmFields.filter(f => f.is_required && f.key !== 'name' && f.key !== 'nome').forEach(field => {
        if (!leadData.data?.[field.key]?.trim()) {
          currentRecordErrors.push(`Campo obrigatório "${field.label}" ausente.`);
          recordIsValid = false;
        }
      });

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
            Cole os dados da sua planilha (CSV ou tab-separated). O sistema tentará mapear as colunas para os campos do seu CRM.
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
              placeholder={`Cole aqui os dados da sua planilha. Use vírgula (,) ou tab (	) como separador.\n\nExemplo:\nNome,Email,Telefone,Etapa,Consultor\nJoão Silva,joao@email.com,(11) 98765-4321,Prospecção,Maria Souza\nMaria Oliveira,maria@email.com,(21) 91234-5678,Reunião Agendada,Pedro Alves`}
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