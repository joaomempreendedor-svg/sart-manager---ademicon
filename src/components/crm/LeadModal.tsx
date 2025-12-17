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
  pipelineStages: CrmStage[];
  consultantId: string;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, lead, crmFields, pipelineStages, consultantId }) => {
  const { addCrmLead, updateCrmLead, deleteCrmLead, crmOwnerUserId } = useApp();
  const [formData, setFormData] = useState<Partial<CrmLead>>({
    name: '',
    stage_id: '',
    data: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        stage_id: lead.stage_id,
        data: lead.data || {},
      });
    } else {
      setFormData({
        name: '',
        stage_id: pipelineStages.length > 0 ? pipelineStages[0].id : '', // Default to first stage
        data: {},
      });
    }
  }, [lead, isOpen, pipelineStages]);

  const handleChange = (key: string, value: any) => {
    if (key === 'name' || key === 'stage_id') {
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
    if (!formData.name?.trim() || !formData.stage_id) {
      alert('Nome do Lead e Etapa são obrigatórios.');
      return;
    }

    // Validate required custom fields
    const missingRequiredFields = crmFields.filter(field => field.is_required && field.key !== 'name' && !formData.data?.[field.key]);
    if (missingRequiredFields.length > 0) {
      alert(`Os seguintes campos são obrigatórios: ${missingRequiredFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        consultant_id: consultantId,
        user_id: crmOwnerUserId, // Use the CRM owner's ID (Gestor's ID)
      } as CrmLead;

      if (lead) {
        await updateCrmLead(lead.id, payload);
      } else {
        await addCrmLead(payload);
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

  // Filter out any custom field that has 'name' as its key to avoid duplication
  const filteredCrmFields = useMemo(() => {
    return crmFields.filter(field => field.key !== 'name');
  }, [crmFields]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? `Edite as informações de ${lead.name}.` : 'Preencha os detalhes para adicionar um novo lead.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[60vh] py-4 pr-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome do Lead
                </Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="col-span-3 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stage_id" className="text-right">
                  Etapa
                </Label>
                <Select value={formData.stage_id || ''} onValueChange={(val) => handleChange('stage_id', val)} required>
                  <SelectTrigger className="col-span-3 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Selecione a Etapa" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    {pipelineStages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-4 border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <SlidersHorizontal className="w-4 h-4 mr-2 text-brand-500" />
                  Campos Personalizados
                </h4>
                <div className="grid gap-4">
                  {filteredCrmFields.map(field => (
                    <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={field.key} className="text-right">
                        {field.label} {field.is_required && <span className="text-red-500">*</span>}
                      </Label>
                      <div className="col-span-3">
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