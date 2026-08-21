import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { SupportMaterialV2, TeamMember } from '@/types';
import { X, Loader2, Users, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SupportMaterialAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: SupportMaterialV2 | null;
}

export const SupportMaterialAssignmentModal: React.FC<SupportMaterialAssignmentModalProps> = ({ isOpen, onClose, material }) => {
  const { teamMembers, supportMaterialAssignments, assignSupportMaterialToConsultant, unassignSupportMaterialFromConsultant } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const consultants = useMemo(() => teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado'))), [teamMembers]);
  
  const assignedConsultantIds = useMemo(() => 
    new Set(supportMaterialAssignments.filter(a => a.material_id === material?.id).map(a => a.consultant_id))
  , [supportMaterialAssignments, material]);

  const handleToggleAssignment = async (consultantId: string, isAssigned: boolean) => {
    if (!material) return;
    setIsSaving(true);
    try {
      if (isAssigned) {
        await unassignSupportMaterialFromConsultant(material.id, consultantId);
      } else {
        await assignSupportMaterialToConsultant(material.id, consultantId);
      }
    } catch (error: any) {
      console.error("Failed to update assignment:", error);
      alert(`Erro ao atualizar atribuição: ${error.message || 'Verifique o console para mais detalhes.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!material) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-800 dark:text-white">
        <DialogHeader>
          <DialogTitle>Atribuir Material: "{material.title}"</DialogTitle>
          <DialogDescription>
            Selecione os consultores que terão acesso a este material. Se nenhum for selecionado, ele será global.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] py-4 custom-scrollbar">
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
        <DialogFooter className="flex-col sm:flex-row">
          <Button type="button" onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};