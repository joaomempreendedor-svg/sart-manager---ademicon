import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { DailyChecklist, DailyChecklistItem, TeamMember } from '@/types';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Users, Check, X, ListChecks } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Componente para o modal de criação/edição de Checklist
interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: DailyChecklist | null;
}

const ChecklistModal: React.FC<ChecklistModalProps> = ({ isOpen, onClose, checklist }) => {
  const { addDailyChecklist, updateDailyChecklist } = useApp();
  const [title, setTitle] = useState(checklist?.title || '');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setTitle(checklist?.title || '');
  }, [checklist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      if (checklist) {
        await updateDailyChecklist(checklist.id, { title });
      } else {
        await addDailyChecklist(title);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save checklist:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>{checklist ? 'Editar Checklist' : 'Novo Checklist'}</DialogTitle>
          <DialogDescription>
            {checklist ? 'Altere o título do checklist.' : 'Crie um novo checklist diário para seus consultores.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Título
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Componente para o modal de atribuição de Checklist
interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: DailyChecklist | null;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ isOpen, onClose, checklist }) => {
  const { teamMembers, dailyChecklistAssignments, assignDailyChecklistToConsultant, unassignDailyChecklistFromConsultant } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const consultants = useMemo(() => teamMembers.filter(m => m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')), [teamMembers]);
  const assignedConsultantIds = useMemo(() => 
    new Set(dailyChecklistAssignments.filter(a => a.daily_checklist_id === checklist?.id).map(a => a.consultant_id))
  , [dailyChecklistAssignments, checklist]);

  const handleToggleAssignment = async (consultantId: string, isAssigned: boolean) => {
    if (!checklist) return;
    setIsSaving(true);
    try {
      if (isAssigned) {
        await unassignDailyChecklistFromConsultant(checklist.id, consultantId);
      } else {
        await assignDailyChecklistToConsultant(checklist.id, consultantId);
      }
    } catch (error) {
      console.error("Failed to update assignment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!checklist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>Atribuir "{checklist.title}"</DialogTitle>
          <DialogDescription>
            Selecione os consultores que receberão este checklist. Se nenhum for selecionado, ele será global.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] py-4">
          <div className="grid gap-3">
            {consultants.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">Nenhum consultor encontrado.</p>
            ) : (
              consultants.map(member => {
                const isAssigned = assignedConsultantIds.has(member.id);
                return (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`consultant-${member.id}`}
                      checked={isAssigned}
                      onCheckedChange={() => handleToggleAssignment(member.id, isAssigned)}
                      disabled={isSaving}
                      className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor={`consultant-${member.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {member.name}
                    </Label>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Componente principal da página de configuração
export const DailyChecklistConfig = () => {
  const { 
    dailyChecklists, 
    dailyChecklistItems, 
    dailyChecklistAssignments, 
    addDailyChecklistItem, 
    updateDailyChecklistItem, 
    deleteDailyChecklistItem, 
    moveDailyChecklistItem,
    updateDailyChecklist,
    deleteDailyChecklist,
    teamMembers
  } = useApp();

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<DailyChecklist | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedChecklistForAssignment, setSelectedChecklistForAssignment] = useState<DailyChecklist | null>(null);

  const [editingItem, setEditingItem] = useState<{ itemId: string, checklistId: string } | null>(null);
  const [editItemText, setEditItemText] = useState('');
  const [addingItemToChecklistId, setAddingItemToChecklistId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const handleAddNewChecklist = () => {
    setEditingChecklist(null);
    setIsChecklistModalOpen(true);
  };

  const handleEditChecklist = (checklist: DailyChecklist) => {
    setEditingChecklist(checklist);
    setIsChecklistModalOpen(true);
  };

  const handleDeleteChecklist = async (checklistId: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o checklist "${title}" e todos os seus itens e atribuições?`)) {
      await deleteDailyChecklist(checklistId);
    }
  };

  const handleToggleChecklistActive = async (checklist: DailyChecklist) => {
    await updateDailyChecklist(checklist.id, { is_active: !checklist.is_active });
  };

  const handleOpenAssignmentModal = (checklist: DailyChecklist) => {
    setSelectedChecklistForAssignment(checklist);
    setIsAssignmentModalOpen(true);
  };

  const startEditItem = (itemId: string, checklistId: string, currentText: string) => {
    setEditingItem({ itemId, checklistId });
    setEditItemText(currentText);
  };

  const handleSaveEditItem = async () => {
    if (editingItem && editItemText.trim()) {
      await updateDailyChecklistItem(editingItem.itemId, { text: editItemText.trim() });
      setEditingItem(null);
      setEditItemText('');
    }
  };

  const handleSaveNewItem = async (checklistId: string) => {
    if (newItemText.trim()) {
      const itemsInChecklist = dailyChecklistItems.filter(item => item.daily_checklist_id === checklistId);
      const newOrderIndex = itemsInChecklist.length > 0 ? Math.max(...itemsInChecklist.map(item => item.order_index)) + 1 : 0;
      await addDailyChecklistItem(checklistId, newItemText.trim(), newOrderIndex);
      setAddingItemToChecklistId(null);
      setNewItemText('');
    }
  };

  const handleDeleteItem = async (itemId: string, text: string) => {
    if (window.confirm(`Tem certeza que deseja remover o item "${text}"?`)) {
      await deleteDailyChecklistItem(itemId);
    }
  };

  const handleMoveItem = async (checklistId: string, itemId: string, direction: 'up' | 'down') => {
    await moveDailyChecklistItem(checklistId, itemId, direction);
  };

  const sortedChecklists = useMemo(() => {
    return [...dailyChecklists].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [dailyChecklists]);

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar Checklist do Dia</h1>
          <p className="text-gray-500 dark:text-gray-400">Crie e gerencie os checklists diários para seus consultores.</p>
        </div>
        <Button onClick={handleAddNewChecklist} className="bg-brand-600 hover:bg-brand-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Novo Checklist
        </Button>
      </div>

      <div className="space-y-8">
        {sortedChecklists.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
            <ListChecks className="mx-auto w-12 h-12 text-gray-300 dark:text-slate-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum checklist criado ainda.</p>
            <p className="text-sm text-gray-400">Clique em "Novo Checklist" para começar.</p>
          </div>
        ) : (
          sortedChecklists.map((checklist) => (
            <div key={checklist.id} className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden ${!checklist.is_active ? 'opacity-60' : ''}`}>
              <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{checklist.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${checklist.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'}`}>
                    {checklist.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenAssignmentModal(checklist)} className="flex items-center space-x-1 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <Users className="w-4 h-4" />
                    <span>Atribuir</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggleChecklistActive(checklist)} className="p-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    {checklist.is_active ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditChecklist(checklist)} className="p-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteChecklist(checklist.id, checklist.title)} className="p-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {dailyChecklistItems
                  .filter((item) => item.daily_checklist_id === checklist.id)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((item, index, arr) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 group">
                      {editingItem?.itemId === item.id ? (
                        <div className="flex-1 flex items-center space-x-2 mr-4">
                          <Input 
                            type="text" 
                            value={editItemText}
                            onChange={(e) => setEditItemText(e.target.value)}
                            className="flex-1 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleSaveEditItem} className="bg-green-600 hover:bg-green-700 text-white"><Check className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600"><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex-1 mr-4">
                          <span className="text-sm text-gray-700 dark:text-gray-200">{item.text}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMoveItem(checklist.id, item.id, 'up')}
                          disabled={index === 0}
                          className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMoveItem(checklist.id, item.id, 'down')}
                          disabled={index === arr.length - 1}
                          className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-4 bg-gray-200 dark:bg-slate-600 mx-1"></div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => startEditItem(item.id, checklist.id, item.text)}
                          className="p-1.5 text-gray-400 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteItem(item.id, item.text)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                <div className="p-4 bg-gray-50/50 dark:bg-slate-700/30">
                  {addingItemToChecklistId === checklist.id ? (
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="text" 
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="Nome da nova tarefa..."
                        className="flex-1 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleSaveNewItem(checklist.id)} className="bg-brand-600 hover:bg-brand-700 text-white">
                        Adicionar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {setAddingItemToChecklistId(null); setNewItemText('');}} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      onClick={() => setAddingItemToChecklistId(checklist.id)}
                      className="flex items-center text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Tarefa
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ChecklistModal 
        isOpen={isChecklistModalOpen} 
        onClose={() => setIsChecklistModalOpen(false)} 
        checklist={editingChecklist} 
      />
      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        checklist={selectedChecklistForAssignment}
      />
    </div>
  );
};