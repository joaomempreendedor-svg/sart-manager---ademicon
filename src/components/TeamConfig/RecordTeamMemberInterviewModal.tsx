import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Calendar as CalendarIcon, User, MessageSquare, CheckSquare } from 'lucide-react';
import { Candidate, InterviewScores, InterviewSection } from '@/types';
import { useApp } from '@/context/AppContext';
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

interface RecordInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onSave: (candidateId: string, interviewDate: string, scores: InterviewScores, checkedQuestions: Record<string, boolean>) => Promise<void>;
}

export const RecordInterviewModal: React.FC<RecordInterviewModalProps> = ({ isOpen, onClose, candidate, onSave }) => {
  const { interviewStructure: appInterviewStructure } = useApp();
  
  const [interviewDate, setInterviewDate] = useState(candidate.interviewDate || new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState<InterviewScores>(candidate.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' });
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>(candidate.checkedQuestions || {});
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when modal opens or candidate changes
  useEffect(() => {
    if (isOpen) {
      setInterviewDate(candidate.interviewDate || new Date().toISOString().split('T')[0]);
      setScores(candidate.interviewScores || { basicProfile: 0, commercialSkills: 0, behavioralProfile: 0, jobFit: 0, notes: '' });
      setCheckedQuestions(candidate.checkedQuestions || {});
    }
  }, [isOpen, candidate]);

  const handleScoreChange = (sectionId: string, value: number) => {
    setScores(prev => ({ ...prev, [sectionId]: value }));
  };

  const handleQuestionToggle = (questionId: string, points: number, sectionId: string) => {
    setCheckedQuestions(prev => {
      const newCheckedQuestions = { ...prev, [questionId]: !prev[questionId] };
      
      // Adjust section score based on toggle
      setScores(currentScores => {
        const currentSectionScore = (currentScores[sectionId] as number) || 0;
        const newSectionScore = newCheckedQuestions[questionId] 
          ? currentSectionScore + points 
          : currentSectionScore - points;
        
        // Ensure score doesn't exceed maxPoints for the section
        const sectionMaxPoints = appInterviewStructure.find(s => s.id === sectionId)?.maxPoints || 0;
        const finalSectionScore = Math.max(0, Math.min(sectionMaxPoints, newSectionScore));

        return { ...currentScores, [sectionId]: finalSectionScore };
      });

      return newCheckedQuestions;
    });
  };

  const totalScore = useMemo(() => {
    return Object.entries(scores)
      .filter(([key]) => key !== 'notes')
      .reduce((sum, [_, val]) => sum + (typeof val === 'number' ? val : 0), 0);
  }, [scores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(candidate.id, interviewDate, scores, checkedQuestions);
      onClose();
    } catch (error: any) {
      alert(`Erro ao salvar avaliação: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-800 dark:text-white p-6">
        <DialogHeader>
          <DialogTitle>Registrar Entrevista para: {candidate.name}</DialogTitle>
          <DialogDescription>
            Preencha a data da entrevista e as pontuações de avaliação.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 mr-4">
                <Label htmlFor="interviewDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Entrevista</Label>
                <CalendarIcon className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                <Input
                  id="interviewDate"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  required
                  className="pl-10 bg-white text-gray-900 dark:bg-slate-700 dark:text-white dark:border-slate-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">Nota Total:</span>
                <span className={`text-2xl font-bold ${totalScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-brand-900 dark:text-brand-400'}`}>{totalScore}/100</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {appInterviewStructure.map(section => (
                  <div key={section.id}>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{section.title}</h3>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>0</span>
                        <span>{section.maxPoints}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={section.maxPoints} 
                        value={(scores[section.id] as number) || 0}
                        onChange={(e) => handleScoreChange(section.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="text-center font-bold text-brand-600 dark:text-brand-400 mt-1">{(scores[section.id] as number) || 0} pts</div>
                    </div>
                    <div className="space-y-2">
                      {section.questions.map(q => (
                        <label key={q.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <input 
                            type="checkbox"
                            checked={!!checkedQuestions[q.id]}
                            onChange={() => handleQuestionToggle(q.id, q.points, section.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{q.text} <span className="text-xs text-gray-400">({q.points} pts)</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Anotações Gerais</h3>
                <Textarea 
                  value={scores.notes}
                  onChange={(e) => setScores(prev => ({ ...prev, notes: e.target.value }))}
                  rows={20}
                  className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-brand-500 focus:border-brand-500 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  placeholder="Digite aqui as anotações sobre o candidato..."
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};