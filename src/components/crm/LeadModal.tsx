import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { CrmLead, CrmField } from '@/types';
import { X, Save, Loader2, User, Phone, Mail, Tag, Text, Hash, List } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: CrmLead | null;
  initialStageId?: string;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, lead, initialStageId }) => {
  const { user } = useAuth();
  const { crmFields, crmStages, addCrmLead, updateCrmLead, teamMembers } = useApp();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedStageId, setSelectedStageId] = useState(initialStageId || '');
  const [selectedConsultantId, setSelectedConsultantId] = useState(user?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCrmFields = crmFields.filter(field => field.is_active);
  const activeCrmStages = crmStages.filter(stage => stage.is_active);
  const consultants = teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')));

  useEffect(() => {
    if (lead) {
      setFormData(lead.data || {});
      setSelectedStageId(lead.stage_id);
      setSelectedConsultantId(lead.consultant_id || user?.id || '');
    } else {
      // Initialize with default values or empty for new lead
      const initialData: Record<string, any> = {};
      activeCrmFields.forEach(field => {
        initialData[field.key] = '';
      });
      setFormData(initialData);
      setSelectedStageId(initialStageId || (activeCrmStages.length > 0 ? activeCrmStages[0].id : ''));
      setSelectedConsultantId(user?.id || '');
    }
    setError(null);
  }, [lead, isOpen, activeCrmFields, activeCrmStages, initialStageId, user]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStageId) {
      setError("Por favor, selecione uma etapa para o lead.");
      return;
    }
    if (!selectedConsultantId) {
      setError("Por favor, selecione um consultor para atribuir o lead.");
      return;
    }

    // Validate required fields
    for (const field of activeCrmFields) {
      if (field.is_required && !formData[field.key]) {
        setError(`O campo "${field.label}" é obrigatório.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const leadName = formData['name'] || `Lead ${new Date().getTime()}`; // Fallback name
      const payload = {
        name: leadName,
        consultant_id: selectedConsultantId,
        stage_id: selectedStageId,
        data: formData,
      };

      if (lead) {
        await updateCrmLead(lead.id, payload);
      } else {
        await addCrmLead(payload);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save lead:", err);
      setError(err.message || "Erro ao salvar o lead.");
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldIcon = (type: CrmField['type']) => {
    switch (type) {
      case 'text': return <Text className="w-4 h-4 text-gray-400" />;
      case 'longtext': return <Text className="w-4 h-4 text-gray-400" />;
      case 'number': return <Hash className="w-4 h-4 text-gray-400" />;
      case 'select': return <List className="w-4 h-4 text-gray-400" />;
      default: return <Tag className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Atualize as informações deste lead.' : 'Preencha os detalhes para criar um novo lead.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* Fixed fields */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stage" className="text-right">
                Etapa
              </Label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId} disabled={isSaving}>
                <SelectTrigger className="col-span-3 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="Selecione a Etapa" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  {activeCrmStages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="consultant" className="text-right">
                Consultor
              </Label>
              <Select value={selectedConsultantId} onValueChange={setSelectedConsultantId} disabled={isSaving}>
                <SelectTrigger className="col-span-3 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="Atribuir ao Consultor" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  {consultants.map(consultant => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic fields */}
            {activeCrmFields.map(field => (
              <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={field.key} className="text-right">
                  {field.label} {field.is_required && <span className="text-red-500">*</span>}
                </Label>
                <div className="col-span-3 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {getFieldIcon(field.type)}
                  </div>
                  {field.type === 'text' && (
                    <Input
                      id={field.key}
                      name={field.key}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      required={field.is_required}
                      disabled={isSaving}
                    />
                  )}
                  {field.type === 'longtext' && (
                    <Textarea
                      id={field.key}
                      name={field.key}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      required={field.is_required}
                      disabled={isSaving}
                      rows={3}
                    />
                  )}
                  {field.type === 'number' && (
                    <Input
                      id={field.key}
                      name={field.key}
                      type="number"
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      required={field.is_required}
                      disabled={isSaving}
                    />
                  )}
                  {field.type === 'select' && field.options && (
                    <Select
                      value={formData[field.key] || ''}
                      onValueChange={(value) => handleChange(field.key, value)}
                      disabled={isSaving}
                      required={field.is_required}
                    >
                      <SelectTrigger className="w-full pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder={`Selecione ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                        {field.options.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? 'Salvando...' : 'Salvar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;