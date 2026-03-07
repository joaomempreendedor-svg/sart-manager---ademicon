import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { NoShowCadenceTemplateStep } from '@/types';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, X, RotateCcw, CalendarCheck, MessageSquare, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const NoShowCadenceConfig = () => {
  const { 
    noShowCadenceTemplate, 
    addNoShowCadenceTemplateStep, 
    updateNoShowCadenceTemplateStep, 
    deleteNoShowCadenceTemplateStep, 
    moveNoShowCadenceTemplateStep, 
    resetNoShowCadenceTemplate,
    templates, // Para selecionar templates de comunicação
  } = useApp();

  const [editingStep, setEditingStep] = useState<NoShowCadenceTemplateStep | null>(null);
  const [stepText, setStepText] = useState('');
  const [offsetDays, setOffsetDays] = useState<number>(0);
  const [resourceTemplateId, setResourceTemplateId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNewStep = () => {
    setEditingStep(null);
    setStepText('');
    setOffsetDays(0);
    setResourceTemplateId(undefined);
    setIsSaving(false);
  };

  const handleEditStep = (step: NoShowCadenceTemplateStep) => {
    setEditingStep(step);
    setStepText(step.text);
    setOffsetDays(step.offset_days);
    setResourceTemplateId(step.resource_template_id);
    setIsSaving(false);
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepText.trim()) {
      toast.error("O texto do passo é obrigatório.");
      return;
    }
    setIsSaving(true);
    try {
      const stepData: Omit<NoShowCadenceTemplateStep, 'id'> = {
        text: stepText.trim(),
        offset_days: offsetDays,
        resource_template_id: resourceTemplateId || undefined,
      };

      if (editingStep) {
        await updateNoShowCadenceTemplateStep(editingStep.id, stepData);
        toast.success("Passo da cadência atualizado!");
      } else {
        await addNoShowCadenceTemplateStep(stepData);
        toast.success("Novo passo da cadência adicionado!");
      }
      handleAddNewStep(); // Reset form
    } catch (error: any) {
      toast.error(`Erro ao salvar passo: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStep = (id: string, text: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o passo "${text}"?`)) {
      deleteNoShowCadenceTemplateStep(id);
      toast.success("Passo excluído com sucesso!");
    }
  };

  const handleReset = () => {
    if (window.confirm("Tem certeza que deseja restaurar a cadência padrão? Todas as suas personalizações serão perdidas.")) {
      resetNoShowCadenceTemplate();
      toast.success("Cadência restaurada para o padrão!");
    }
  };

  const getResourceTemplateLabel = (id?: string) => {
    if (!id) return "Nenhum";
    return templates[id]?.label || "Template desconhecido";
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Cadência Anti-NoShow</h1>
          <p className="text-gray-500 dark:text-gray-400">Defina os passos que o consultor deve seguir para diminuir o não comparecimento em reuniões.</p>
        </div>
        <button onClick={handleReset} className="text-xs flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 rounded px-3 py-1.5 transition">
          <RotateCcw className="w-3 h-3 mr-1.5" />
          Restaurar Padrão
        </button>
      </div>

      {/* Formulário de Adição/Edição */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingStep ? 'Editar Passo da Cadência' : 'Adicionar Novo Passo'}</h2>
        <form onSubmit={handleSaveStep} className="space-y-4">
          <div>
            <Label htmlFor="stepText">Texto do Passo *</Label>
            <Input
              id="stepText"
              value={stepText}
              onChange={(e) => setStepText(e.target.value)}
              required
              className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              placeholder="Ex: Enviar lembrete da reunião"
            />
          </div>
          <div>
            <Label htmlFor="offsetDays">Dias de Antecedência/Pós-Reunião</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Use valores negativos para dias *antes* da reunião (ex: -1 para 1 dia antes), 0 para o dia da reunião, e positivos para dias *depois* da reunião.
            </p>
            <Input
              id="offsetDays"
              type="number"
              value={offsetDays}
              onChange={(e) => setOffsetDays(parseInt(e.target.value) || 0)}
              className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              placeholder="Ex: -1 (1 dia antes), 0 (no dia), 1 (1 dia depois)"
            />
          </div>
          <div>
            <Label htmlFor="resourceTemplate">Template de Mensagem/Recurso (Opcional)</Label>
            <Select
              value={resourceTemplateId || ''}
              onValueChange={(value) => setResourceTemplateId(value || undefined)}
            >
              <SelectTrigger className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <SelectValue placeholder="Selecione um template de mensagem" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white dark:border-slate-700">
                <SelectItem value="">Nenhum</SelectItem>
                {Object.values(templates).map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            {editingStep && (
              <Button type="button" variant="outline" onClick={handleAddNewStep} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                <X className="w-4 h-4 mr-2" /> Cancelar Edição
              </Button>
            )}
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              <span>{editingStep ? 'Salvar Alterações' : 'Adicionar Passo'}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Lista de Passos da Cadência */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold p-6 border-b border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white">Passos da Cadência ({noShowCadenceTemplate.length})</h2>
        <ul className="divide-y divide-gray-100 dark:divide-slate-700">
          {noShowCadenceTemplate.length === 0 ? (
            <li className="p-6 text-center text-gray-400">Nenhum passo configurado.</li>
          ) : (
            noShowCadenceTemplate.map((step, index, arr) => (
              <li key={step.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                <div className="flex-1 mr-4 flex items-center space-x-2 mb-2 sm:mb-0">
                  <CalendarCheck className="w-5 h-5 text-brand-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{step.text}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {step.offset_days === 0 ? 'No dia da reunião' :
                       step.offset_days < 0 ? `${Math.abs(step.offset_days)} dia(s) antes da reunião` :
                       `${step.offset_days} dia(s) depois da reunião`}
                    </p>
                    {step.resource_template_id && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                        <LinkIcon className="w-3 h-3 mr-1" /> Template: {getResourceTemplateLabel(step.resource_template_id)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => moveNoShowCadenceTemplateStep(step.id, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => moveNoShowCadenceTemplateStep(step.id, 'down')}
                    disabled={index === arr.length - 1}
                    className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-4 bg-gray-200 dark:bg-slate-600 mx-1"></div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditStep(step)}
                    className="p-1.5 text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteStep(step.id, step.text)}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};