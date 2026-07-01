import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader2, Trash2, Upload, Search, Download, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';

export const Contratos = () => {
  const { user } = useAuth();
  const { contratos, addContrato, deleteContrato, isDataLoading } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredContratos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contratos;

    return contratos.filter((contrato) =>
      contrato.display_name.toLowerCase().includes(term) ||
      contrato.file_name.toLowerCase().includes(term),
    );
  }, [contratos, searchTerm]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    if (!displayName.trim()) {
      toast.error('Informe o nome do contrato.');
      return;
    }

    if (!selectedFile) {
      toast.error('Selecione o PDF assinado.');
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      toast.error('Envie apenas arquivos em PDF.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addContrato(selectedFile, displayName.trim());
      setDisplayName('');
      setSelectedFile(null);
      const fileInput = document.getElementById('signed-contract-file') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      toast.success('Contrato enviado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar contrato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, filePath: string, contractName: string) => {
    const confirmed = window.confirm(`Deseja excluir o contrato "${contractName}"?`);
    if (!confirmed) return;

    try {
      await deleteContrato(id, filePath);
      toast.success('Contrato removido com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover contrato.');
    }
  };

  const getPublicUrl = (filePath: string) => {
    return supabase.storage.from('contratos').getPublicUrl(filePath).data.publicUrl;
  };

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileSignature className="w-6 h-6 text-brand-500" />
          Contratos assinados
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Cadastre os PDFs assinados pelos consultores e mantenha tudo organizado em um só lugar.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Enviar contrato assinado
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome do contrato
              </label>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ex: Contrato João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                PDF assinado
              </label>
              <Input
                id="signed-contract-file"
                type="file"
                accept="application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              />
              {selectedFile && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 hover:bg-brand-700 text-white">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Enviar contrato
            </Button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Contratos cadastrados
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredContratos.length} contrato{filteredContratos.length !== 1 ? 's' : ''} encontrado{filteredContratos.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar contrato..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredContratos.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum contrato encontrado.
                </p>
              </div>
            ) : (
              filteredContratos.map((contrato) => (
                <div
                  key={contrato.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {contrato.display_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {contrato.file_name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Enviado em {new Date(contrato.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={getPublicUrl(contrato.file_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Ver PDF
                      </Button>
                    </a>

                    <a
                      href={getPublicUrl(contrato.file_path)}
                      download={contrato.file_name}
                    >
                      <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Baixar
                      </Button>
                    </a>

                    <Button
                      variant="outline"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:hover:bg-red-950/30"
                      onClick={() => handleDelete(contrato.id, contrato.file_path, contrato.display_name)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contratos;