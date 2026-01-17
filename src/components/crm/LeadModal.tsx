import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmLead, CrmField, CrmStage } from '@/types';
import { X, Save, Loader2, SlidersHorizontal, MapPin } from 'lucide-react';
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
import toast from 'react-hot-toast';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead | null; // Pode ser null para novo lead
  crmFields: CrmField[];
  assignedConsultantId?: string | null;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, lead, crmFields, assignedConsultantId }) => {
  const { addCrmLead, updateCrmLead, deleteCrmLead, crmOwnerUserId, crmStages, salesOrigins, crmPipelines } = useApp();
  const [formData, setFormData] = useState<Partial<CrmLead>>({
    name: '',
    data: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // A lista de origens disponíveis é estritamente as salesOrigins configuradas
  const allAvailableOrigins = useMemo(() => {
    return [...salesOrigins].sort((a, b) => a.localeCompare(b));
  }, [salesOrigins]);

  useEffect(() => {
    if (isOpen) {
      const initialOrigin = lead?.data?.origin;
      let validatedOrigin = '';

      // Se houver uma origem inicial e ela estiver na lista de origens configuradas, use-a.
      // Caso contrário, o campo de origem será vazio, forçando a seleção de uma opção válida.
      if (initialOrigin && allAvailableOrigins.includes(initialOrigin)) {
        validatedOrigin = initialOrigin;
      }

      setFormData({
        name: lead?.name || '',
        stage_id: lead?.stage_id,
        consultant_id: lead?.consultant_id,
        proposalValue: lead?.proposalValue,
        proposalClosingDate: lead?.proposalClosingDate,
        soldCreditValue: lead?.soldCreditValue,
        soldGroup: lead?.soldGroup,
        soldQuota: lead?.soldQuota,
        saleDate: lead?.saleDate,
        data: { 
          ...lead?.data,
          origin: validatedOrigin, // Usa a origem validada (ou vazia se inválida)
        },
      });
      setError('');
    }
  }, [lead, isOpen, assignedConsultantId, allAvailableOrigins]); // allAvailableOrigins como dependência

  const handleChange = (key: string, value: any) => {
    setFormData(prev => {
      if (['name', 'stage_id', 'consultant_id', 'proposalValue', 'proposalClosingDate', 'soldCreditValue', 'soldGroup', 'soldQuota', 'saleDate'].includes(key)) {
        return { ...prev, [key]: value };
      } else {
        return {
          ...prev,
          data: {
            ...prev.data,
            [key]: value,
          },
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const errorsList: string[] = [];

    // 1. Validate hardcoded 'name' field
    if (!formData.name?.trim()) {
      errorsList.push('Nome do Lead');
    }

    // 2. Validate hardcoded 'origin' field
    if (!formData.data?.origin?.trim()) {
      errorsList.push('Origem');
    }

    // 3. Validate stage_id for existing leads (if applicable)
    if (lead && !formData.stage_id) {
      errorsList.push('Etapa');
    }

    // Keys that are handled by dedicated inputs and should not be re-validated as custom fields
    const systemHandledKeys = ['name', 'nome', 'origin', 'origem']; 
    
    // 4. Validate other custom required fields
    const missingRequiredCustomFields = crmFields.filter(field => 
      field.is_active && 
      field.is_required && 
      !systemHandledKeys.includes(field.key) && // Exclude fields handled by dedicated inputs
      !formData.data?.[field.key] // Check if the value is missing in formData.data
    );

    missingRequiredCustomFields.forEach(field => {
      errorsList.push(field.label);
    });

    if (errorsList.length > 0) {
      setError(`Os seguintes campos são obrigatórios: ${errorsList.join(', ')}.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        name: formData.name || null,
        consultant_id: formData.consultant_id || null,
        user_id: crmOwnerUserId,
        data: {
          ...formData.data,
          origin: formData.data?.origin || null,
        },
        proposalValue: formData.proposalValue || null,
        proposalClosingDate: formData.proposalClosingDate || null,
        soldCreditValue: formData.soldCreditValue || null,
        soldGroup: formData.soldGroup || null,
        soldQuota: formData.soldQuota || null,
        saleDate: formData.saleDate || null,
      } as CrmLead;

      if (lead) {
        await updateCrmLead(lead.id, payload);
        toast.success(`Lead "${payload.name}" atualizado com sucesso!`);
      } else {
        await addCrmLead(payload);
        toast.success(`Lead "${payload.name}" adicionado com sucesso!`);
      }
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar lead:", error);
      toast.error(`Erro ao salvar lead: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead || !window.confirm(`Tem certeza que deseja excluir o lead "${lead.name}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteCrmLead(lead.id);
      toast.success(`Lead "${lead.name}" excluído com sucesso!`);
      onClose();
    } catch (error: any) {
      console.error("Erro ao excluir lead:", error);
      toast.error(`Erro ao excluir lead: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderField = (field: CrmField) => {
    const systemReservedKeys = ['name', 'nome', 'origin', 'origem'];

    if (systemReservedKeys.includes(field.key)) {
      return null;
    }

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
            <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-200 dark:border-slate-700 shadow-lg z-50 max-h-[200px] overflow-y-auto">
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

  const filteredCrmFields = useMemo(() => {
    const explicitlyHandledKeys = ['name', 'nome', 'origin', 'origem']; 
    
    return crmFields.filter(field => 
      field.is_active && 
      !explicitlyHandledKeys.includes(field.key)
    );
  }, [crmFields]);

  const currentStageName = useMemo(() => {
    if (!lead?.stage_id) return 'N/A';
    const stage = crmStages.find(s => s.id === lead.stage_id);
    return stage?.name || 'N/A';
  }, [lead?.stage_id, crmStages]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? `Edite as informações de ${lead.name}.` : 'Preencha os detalhes para adicionar um novo lead.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] py-4 pr-4 custom-scrollbar">
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

              {/* Campo Nome do Lead (sempre visível e obrigatório) */}
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-left">
                  Nome do Lead <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                  required
                />
              </div>

              {/* Campo Origem (sempre visível e obrigatório) */}
              <div className="grid gap-2">
                <Label htmlFor="origin" className="text-left">
                  Origem <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Select
                    value={formData.data?.origin || ''}
                    onValueChange={(val) => handleChange('origin', val)}
                    required
                  >
                    <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700 max-h-[200px] overflow-y-auto">
                      {allAvailableOrigins.map(origin => (
                        <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            {lead && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="mb-2 sm:mb-0 w-full sm:w-auto">
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                {isDeleting ? 'Excluindo...' : 'Excluir Lead'}
              </Button>
            )}
            <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
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