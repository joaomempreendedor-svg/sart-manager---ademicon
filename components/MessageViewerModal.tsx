import React, { useState } from 'react';
import { X, Copy, Check, Download, Image as ImageIcon, FileText } from 'lucide-react';
import { CommunicationTemplate } from '../types';

interface MessageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  template: CommunicationTemplate;
}

export const MessageViewerModal: React.FC<MessageViewerModalProps> = ({ isOpen, onClose, candidateName, template }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const firstName = candidateName.split(' ')[0];
  const processedText = template.text 
    ? template.text.replace(/\[NOME\]/g, firstName)
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(processedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (template.resource?.url) {
        const link = document.createElement('a');
        link.href = template.resource.url;
        link.download = template.resource.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert("Este é um arquivo de exemplo do sistema. Na versão completa, ele seria baixado aqui.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Enviar Mensagem / Arquivo</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-6 space-y-6">
            {/* Text Section */}
            {processedText && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mensagem para Copiar (WhatsApp)</label>
                    <div className="relative">
                        <textarea 
                            readOnly
                            className="w-full h-32 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-gray-200 text-sm resize-none focus:outline-none"
                            value={processedText}
                        />
                        <button 
                            onClick={handleCopy}
                            className="absolute top-2 right-2 p-2 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition text-brand-600 dark:text-brand-400"
                            title="Copiar texto"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Attachment Section */}
            {template.resource && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Anexo para Enviar</label>
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700/50 transition group">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg">
                                {template.resource.type === 'image' ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{template.resource.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Clique para baixar e enviar</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleDownload}
                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center space-x-2 shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span>Baixar</span>
                        </button>
                    </div>
                    {template.resource.type === 'image' && template.resource.url && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 h-32 w-full">
                             <img src={template.resource.url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 mr-2"
            >
                Fechar
            </button>
             <button 
                onClick={() => {
                     const phone = "55" + "000000000"; // Placeholder
                     window.open(`https://wa.me/?text=${encodeURIComponent(processedText)}`, '_blank');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center space-x-2 shadow-lg shadow-green-500/20"
            >
                <span>Abrir WhatsApp Web</span>
            </button>
        </div>
      </div>
    </div>
  );
};