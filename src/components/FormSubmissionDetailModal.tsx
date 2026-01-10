import React, { useState, useEffect } from 'react';
import { X, FileText, Image as ImageIcon, Download, CheckCircle2, AlertTriangle, MessageSquare, Loader2, Save } from 'lucide-react';
import { FormCadastro, FormFile } from '@/types';
import { useApp } from '@/context/AppContext';
import toast from 'react-hot-toast';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { formSteps, BRAZILIAN_STATES, SOCIAL_MEDIA_OPTIONS } from '@/data/formStepsData'; // Importar formSteps e outras constantes

interface FormCadastroDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cadastro: FormCadastro | null;
  formSteps: typeof formSteps; // Adicionar formSteps como prop
}

export const FormCadastroDetailModal: React.FC<FormCadastroDetailModalProps> = ({ isOpen, onClose, cadastro, formSteps }) => {
  const { getFormFilesForSubmission, updateFormCadastro } = useApp();
  const [internalNotes, setInternalNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const files = cadastro ? getFormFilesForSubmission(cadastro.id) : [];

  useEffect(() => {
    if (cadastro) {
      setInternalNotes(cadastro.internal_notes || '');
      setIsComplete(cadastro.is_complete);
    }
  }, [cadastro, isOpen]);

  const handleDownloadFile = async (file: FormFile) => {
    try {
      const response = await fetch(file.file_url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.file_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Download de "${file.file_name}" iniciado.`);
    } catch (error) {
      console.error("Erro ao baixar o arquivo:", error);
      toast.error("Falha ao iniciar o download do arquivo.");
    }
  };

  const handleSaveNotesAndStatus = async () => {
    if (!cadastro) return;
    setIsSaving(true);
    try {
      await updateFormCadastro(cadastro.id, { internal_notes: internalNotes, is_complete: isComplete });
      toast.success("Notas e status atualizados com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar notas/status:", error);
      toast.error("Falha ao salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!cadastro) return null; // Renderiza nulo se não houver cadastro

  // Função para formatar o rótulo do campo
  const formatLabel = (fieldName: string, cadastroData: any) => {
    if (fieldName === 'documento_identificacao_file' && cadastroData.tipo_documento_identificacao) {
      return `Arquivo do ${cadastroData.tipo_documento_identificacao}`;
    }
    if (fieldName === 'comprovante_endereco_file') return 'Comprovante de Residência';
    if (fieldName === 'certidao_nascimento_file') return 'Certidão de Nascimento';
    if (fieldName === 'tipo_documento_identificacao') return 'Tipo Documento de Identificação';
    
    // Lógica para campos de endereço
    if (fieldName.includes('_endereco')) {
      return fieldName.replace('_endereco', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
    }

    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-800 dark:text-white p-6 z-[100]">
        <DialogHeader>
          <DialogTitle>Detalhes do Cadastro</DialogTitle>
          <DialogDescription>
            Cadastro de {cadastro.data.nome_completo} em {new Date(cadastro.submission_date).toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] py-4 pr-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna de Dados do Formulário */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Dados do Formulário</h3>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                {formSteps.map(step => (
                  <React.Fragment key={step.id}>
                    {step.fields.map(fieldName => {
                      const value = cadastro.data[fieldName];

                      // Ignorar campos de arquivo que são tratados separadamente
                      if (fieldName.includes('_file')) return null;

                      // Lógica condicional para exibir campos
                      if (fieldName === 'nome_completo_conjuge' && cadastro.data.estado_civil !== 'Casado') return null;
                      if (fieldName === 'rede_social' && !value) return null; // Não mostra se não preenchido
                      if (fieldName === 'link_rede_social' && !cadastro.data.rede_social) return null; // Não mostra se não preenchido

                      // Não mostra campos de endereço se o CEP não foi preenchido ou não retornou dados
                      if (step.id === 'localizacao' && !cadastro.data.cep) return null;

                      return (
                        <div key={fieldName} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatLabel(fieldName, cadastro.data)}:</span>
                          <span className="text-sm text-gray-900 dark:text-white text-right break-all">{String(value || 'N/A')}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Coluna de Arquivos e Notas Internas */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Arquivos Anexados</h3>
              {files.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum arquivo anexado.</p>
              ) : (
                <div className="space-y-3">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-700">
                      <div className="flex items-center space-x-3">
                        {file.file_name.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-5 h-5 text-red-500" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{file.file_name}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadFile(file)} className="flex items-center space-x-1 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <Download className="w-4 h-4" />
                        <span>Baixar</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Notas Internas</h3>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Adicione notas internas sobre este cadastro..."
                rows={5}
                className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />

              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="isComplete"
                  checked={isComplete}
                  onChange={(e) => setIsComplete(e.target.checked)}
                  className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 dark:bg-slate-700 dark:border-slate-600"
                />
                <label htmlFor="isComplete" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Marcar como Completo/Verificado
                </label>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose} className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
            Fechar
          </Button>
          <Button type="button" onClick={handleSaveNotesAndStatus} disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            <span>Salvar Alterações</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};