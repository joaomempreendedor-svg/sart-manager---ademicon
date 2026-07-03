  const renderAttachment = (att: ProcessAttachment) => {
    const fileName = att.file_name || att.file_url.split('/').pop() || 'arquivo_anexado';

    switch (att.file_type) {
      case 'video':
        // ... (igual, sem mudanças)
      case 'link':
        // ... (igual, sem mudanças)
      case 'image':
        // ... (igual, sem mudanças)
      case 'pdf':
        // ... (igual, sem mudanças)
      case 'audio':
        // ... (igual, sem mudanças)
      case 'doc':
        return (
          <div key={att.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <FileText className="w-5 h-5 text-blue-700 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">Documento Word</p>
                <span className="text-xs text-blue-600 dark:text-blue-400 truncate block">{fileName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full" title="Visualizar">
                <ExternalLink className="w-4 h-4" />
              </a>
              <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(att.file_url, fileName)} className="text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      default:
        // ... (igual, sem mudanças)
    }
  };