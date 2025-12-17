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
  // Removido pipelineStages: CrmStage[];
  consultantId: string;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, lead, crmFields, consultantId }) => {
  const { addCrmLead, updateCrmLead, deleteCrmLead, crmOwnerUserId, crmStages } = useApp(); // Adicionado crmStages
  const [formData, setFormData] = useState<Partial<CrmLead>>({
    // Removido stage_id: '',
    data: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        stage_id: lead.stage_id, // Manter stage_id para edição de leads existentes
        data: { ...lead.data, name: lead.name || '' },
      });
    } else {
      setFormData({
        // Para novos leads, stage_id será definido automaticamente no AppContext
        data: { name: '' },
      });
    }
  }, [lead, isOpen]);

  const handleChange = (key: string, value: any) => {
    if (key === 'stage_id') {
      setFormData(prev => ({ ...prev, [key]: value }));
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
    
    // Validate 'name' from custom fields
    const nameField = crmFields.find(f => f.key === 'name' || f.key === 'nome');
    if (nameField?.is_required && !formData.data?.name?.trim()) {
      alert('O campo "Nome do Lead" é obrigatório.');
      return;
    }

    // A validação de stage_id para novos leads será feita no AppContext
    // Para leads existentes, a etapa pode ser alterada (se a UI permitir) ou mantida.
    if (lead && !formData.stage_id) {
      alert('A Etapa é obrigatória para leads existentes.');
      return;
    }

    // Validate other required custom fields
    const missingRequiredFields = crmFields.filter(field => 
      field.is_required && 
      field.key !== 'name' && // Exclude 'name' as it's handled above
      field.key !== 'nome' && // Exclude 'nome' as it's handled above
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
        name: formData.data?.name || null, // Extract name from data to top-level for CrmLead type
        consultant_id: consultantId,
        user_id: crmOwnerUserId, // Use the CRM owner's ID (Gestor's ID)
      } as CrmLead;

      if (lead) {
        await updateCrmLead(lead.id, payload);
      } else {
        // Para novos leads, não passamos stage_id aqui, ele será definido no addCrmLead
        const { stage_id, ...newLeadPayload } = payload; // Remove stage_id from payload for new leads
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
    const value = formData.data?.[field.key] || '';
    const commonProps = {
      id: field.key,
      name: field.key,
      value: value,
      onChange: (e: any) => handleChange(field.key, e.target.value),
      className: "w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600",
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
            <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
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

  // Filter out system-reserved keys that are NOT meant to be custom fields
  const filteredCrmFields = useMemo(() => {
    const systemReservedKeys = ['stage_id']; 
    return crmFields.filter(field => !systemReservedKeys.includes(field.key));
  }, [crmFields]);

  // Get the name of the current stage for display
  const currentStageName = useMemo(() => {
    if (!lead?.stage_id) return 'N/A';
    const stage = crmStages.find(s => s.id === lead.stage_id);
    return stage?.name || 'N/A';
  }, [lead?.stage_id, crmStages]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl dark:bg-slate-800 dark:text-white p-6"> {/* Increased max-w to 2xl and added p-6 */}
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? `Edite as informações de ${lead.name}.` : 'Preencha os detalhes para adicionar um novo lead.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] py-4 pr-4"> {/* Changed h-[60vh] to max-h-[60vh] and added pr-4 back for scrollbar */}
            <div className="grid gap-4">
              {lead && ( // Para leads existentes, ainda podemos mostrar a etapa atual (apenas leitura ou com um seletor diferente se necessário)
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