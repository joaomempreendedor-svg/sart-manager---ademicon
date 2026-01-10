import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { FormSubmission } from '@/types';
import { Copy, Check, FileText, Loader2, Search, Eye, Trash2, CheckCircle2, AlertTriangle, Link as LinkIcon, RotateCcw } from 'lucide-react';
import { FormSubmissionDetailModal } from '@/components/FormSubmissionDetailModal';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/TableSkeleton';

export const FormSubmissions = () => {
  const { formSubmissions, formFiles, isDataLoading, deleteFormSubmission } = useApp();
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  const publicFormLink = `${window.location.origin}${window.location.pathname}#/public-form`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicFormLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Link do formulário copiado!");
  };

  const filteredSubmissions = useMemo(() => {
    if (!searchTerm) return formSubmissions;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return formSubmissions.filter(submission => 
      Object.values(submission.data).some(value => 
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      ) || (submission.internal_notes && submission.internal_notes.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [formSubmissions, searchTerm]);

  const handleOpenDetails = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const handleDeleteSubmission = async (submissionId: string, clientName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a submissão de "${clientName}" e todos os seus arquivos? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteFormSubmission(submissionId);
        toast.success("Submissão excluída com sucesso!");
      } catch (error: any) {
        toast.error(`Erro ao excluir submissão: ${error.message}`);
      }
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Formulários Públicos</h1>
        <p className="text-gray-500 dark:text-gray-400">Visualize as submissões e gerencie os arquivos enviados.</p>
      </div>

      {/* Seção do Link Público */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <LinkIcon className="w-5 h-5 mr-2 text-brand-500" /> Link do Formulário Público
        </h2>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            readOnly
            value={publicFormLink}
            className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-200 text-sm font-mono"
          />
          <button
            onClick={handleCopyLink}
            className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
            title="Copiar Link"
          >
            {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Compartilhe este link com os candidatos para que eles preencham o formulário.
        </p>
      </div>

      {/* Lista de Submissões */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Submissões Recebidas ({formSubmissions.length})</h2>
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder="Buscar submissão..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm w-full focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Nome Completo</th>
                <th className="px-6 py-3">E-mail</th>
                <th className="px-6 py-3">Data de Cadastro</th> {/* Alterado aqui */}
                <th className="px-6 py-3">Arquivos</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Nenhuma submissão encontrada.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map(submission => {
                  const submissionFiles = formFiles.filter(f => f.submission_id === submission.id);
                  const hasFiles = submissionFiles.length > 0;
                  const clientName = submission.data.nome_completo || 'N/A';

                  return (
                    <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{clientName}</td>
                      <td className="px-6 py-4">{submission.data.email || 'N/A'}</td>
                      <td className="px-6 py-4">{new Date(submission.submission_date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        {hasFiles ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <FileText className="w-3 h-3 mr-1" /> {submissionFiles.length} Arquivo(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                            Nenhum
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {submission.is_complete ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <button onClick={() => handleOpenDetails(submission)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full" title="Ver Detalhes">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteSubmission(submission.id, clientName)} className="p-2 text-gray-400 hover:text-red-500 rounded-full" title="Excluir Submissão">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormSubmissionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        submission={selectedSubmission}
      />
    </div>
  );
};