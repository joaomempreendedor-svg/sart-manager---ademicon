import React from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CrmLead } from '@/types'; // Removido CrmField, CrmStage, TeamMember
import toast from 'react-hot-toast';

interface ExportCrmLeadsButtonProps {
  leads: CrmLead[];
  fileName?: string;
}

const ExportCrmLeadsButton: React.FC<ExportCrmLeadsButtonProps> = ({
  leads,
  fileName = 'leads_crm',
}) => {
  const handleExport = () => {
    if (leads.length === 0) {
      toast.info('Não há leads para exportar.');
      return;
    }

    // Definir cabeçalhos fixos: apenas Nome do Lead e Origem
    const headers = [
      'Nome do Lead',
      'Origem',
    ];

    const dataToExport = leads.map(lead => {
      const row: { [key: string]: any } = {};

      // Campos fixos
      row['Nome do Lead'] = lead.name;
      row['Origem'] = lead.data?.origin || ''; // Acessa a origem do objeto 'data'

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads CRM');

    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Leads exportados com sucesso!');
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition font-medium"
    >
      <Download className="w-5 h-5" />
      <span>Exportar Leads</span>
    </button>
  );
};

export default ExportCrmLeadsButton;