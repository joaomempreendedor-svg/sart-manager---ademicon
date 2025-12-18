import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmLead, CrmField, CrmStage } from '@/types';
import { X, Save, Loader2, SlidersHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead | null;
  crmFields: CrmField[];
  assignedConsultantId?: string; // Tornando opcional
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, lead, crmFields, assignedConsultantId }) => {
  const { addCrmLead, updateCrmLead, deleteCrmLead, crmOwnerUserId, crmStages } = useApp();
  const [formData, setFormData] = useState<Partial<CrmLead>>({
    name: '', // Adicionado name aqui para ser a fonte primária
    data: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '', // Popula o name principal
        stage_id: lead.stage_id,
        data: { ...lead.data }, // Mantém outros campos de dados
      });
    } else {
      setFormData({
        name: '', // Para novos leads
        data: {},
      });
    }
  }, [lead, isOpen]);

  const handleChange = (key: string, value: any) => {
    if (key === 'stage_id') {
      setFormData(prev => ({ ...prev, [key]: value }));
    } else if (key === 'name' || key === 'nome') { // Trata 'name' ou 'nome' como o campo de nome principal
      setFormData(prev => ({ ...prev, name: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        data: {
          ...prev.data,
          [key]: value,
        },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Valida o campo 'name' principal
    const nameField = crmFields.find(f => f.key === 'name' || f.key === 'nome');
    if (nameField?.is_required && !formData.name?.trim()) { // Verifica formData.name diretamente
      alert('O campo "Nome do Lead" é obrigatório.');
      return;
    }

    if (lead && !formData.stage_id) {
      alert('A Etapa é obrigatória para leads existentes.');
      return;
    }

    // Valida outros campos personalizados obrigatórios
    const missingRequiredFields = crmFields.filter(field => 
      field.is_required && 
      field.key !== 'name' && // Exclui 'name' pois já foi tratado acima
      field.key !== 'nome' && // Exclui 'nome' pois já foi tratado acima
      !formData.data?.[field.key]
    );
    if (missingRequiredFields.length > 0) {
      alert(`Os seguintes campos são obrigatórios: ${missingRequiredFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        name: formData.name || null, // Garante que o name de nível superior seja usado
        consultant_id: assignedConsultantId || lead?.consultant_id || '', // Usa assignedConsultantId se disponível, senão o do lead existente
        user_id: crmOwnerUserId, // Use o ID do proprietário do CRM (ID do Gestor)
      } as CrmLead;

      if (lead) {
        await updateCrmLead(lead.id, payload);
      } else {
        const { stage_id, ...newLeadPayload } = payload; // Remove stage_id do payload para novos leads
        await addCrmLead(newLeadPayload);
      }
      onClose();
    } catch (error: any) {
      alert(`Erro ao salvar lead: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead || !window.confirm(`Tem certeza que deseja excluir o lead "${lead.name}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteCrmLead(lead.id);
      onClose();
    } catch (error: any) {
      alert(`Erro ao excluir lead: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderField = (field: CrmField) => {
    // Tratamento especial para o campo de nome principal
    if (field.key === 'name' || field.key === 'nome') {
      const value = formData.name || ''; // Vincula ao name de nível superior
      const commonProps = {
        id: field.key,
        name: field.key,
        value: value,
        onChange: (e: any) => handleChange(field.key, e.target.value), // Isso agora atualizará formData.name
        className: "w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent",
        required: field.is_required,
      };
      return <Input type="text" {...commonProps} />;
    }

    // Para outros campos personalizados
    const value = formData.data?.[field.key] || '';
    const commonProps = {
      id: field.key,
      name: field.key,
      value: value,
      onChange: (e: any) => handleChange(field.key, e.target.value),
      className: "w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent",
      required: field.is_required,
    };

    switch (field.type) {
      case 'text':
        return <Input type="text" {...commonProps} />;
      case 'longtext':
        return <Textarea rows={3} {...commonProps} />;
      case 'number':
        return <Input type="number" {...commonProps} />;
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleChange(field.key, val)} required={field.is_required}>
            <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-transparent">
              <SelectValue placeholder={`Selecione ${field.label}`} />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return <Input type="text" {...commonProps} />;
    }
  };

  // Filtra chaves reservadas do sistema que NÃO devem ser campos personalizados
  const filteredCrmFields = useMemo(() => {
    const systemReservedKeys = ['stage_id']; 
    return crmFields.filter(field => !systemReservedKeys.includes(field.key));
  }, [crmFields]);

  // Obtém o nome da etapa atual para exibição
  const currentStageName = useMemo(() => {
    if (!lead?.stage_id) return 'N/A';
    const stage = crmStages.find(s => s.id === lead.stage_id);
    return stage?.name || 'N/A';
  }, [lead?.stage_id, crmStages]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? `Edite as informações de ${lead.name}.` : 'Preencha os detalhes para adicionar um novo lead.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] py-4 pr-4">
            <div className="grid gap-4">
              {lead && (
                <div className="grid gap-2">
                  <Label htmlFor="current_stage" className="text-left text-gray-500 dark:text-gray-400">
                    Etapa Atual
                  </Label>
                  <Input
                    id="current_stage"
                    value={currentStageName}
                    readOnly
                    className="w-full p-2 border rounded bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200"
                  />
                </div>
              )}

              <div className="col-span-4 border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <SlidersHorizontal className="w-4 h-4 mr-2 text-brand-500" />
                  Campos Personalizados
                </h4>
                <div className="grid gap-4">
                  {filteredCrmFields.map(field => (
                    <div key={field.id} className="grid gap-2">
                      <Label htmlFor={field.key} className="text-left">
                        {field.label} {field.is_required && <span className="text-red-500">*</span>}
                      </Label>
                      <div>
                        {renderField(field)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            {lead && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="mb-2 sm:mb-0">
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                {isDeleting ? 'Excluindo...' : 'Excluir Lead'}
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;