import React from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CrmLead, CrmField, CrmStage, TeamMember } from '@/types';
import toast from 'react-hot-toast';

interface ExportCrmLeadsButtonProps {
  leads: CrmLead[];
  crmFields: CrmField[];
  crmStages: CrmStage[];
  teamMembers: TeamMember[];
  fileName?: string;
}

const ExportCrmLeadsButton: React.FC<ExportCrmLeadsButtonProps> = ({
  leads,
  crmFields,
  crmStages,
  teamMembers,
  fileName = 'leads_crm',
}) => {
  const handleExport = () => {
    if (leads.length === 0) {
      toast.info('Não há leads para exportar.');
      return;
    }

    // Mapear campos personalizados para um objeto de fácil acesso
    const customFieldsMap = new Map(crmFields.map(f => [f.key, f.label]));
    const stagesMap = new Map(crmStages.map(s => [s.id, s.name]));
    const consultantsMap = new Map(teamMembers.map(m => [m.id, m.name]));

    // Definir cabeçalhos fixos e dinâmicos
    const fixedHeaders = [
      'Nome do Lead',
      'Consultor',
      'Etapa',
      'Valor Proposta',
      'Data Fechamento Proposta',
      'Valor Vendido',
      'Grupo Vendido',
      'Cota Vendida',
      'Data Venda',
      'Criado Em',
      'Atualizado Em',
    ];

    const dynamicHeaders = crmFields
      .filter(f => f.is_active && f.key !== 'name') // Excluir 'name' pois já é um cabeçalho fixo
      .map(f => f.label);

    const headers = [...fixedHeaders, ...dynamicHeaders];

    const dataToExport = leads.map(lead => {
      const row: { [key: string]: any } = {};

      // Campos fixos
      row['Nome do Lead'] = lead.name;
      row['Consultor'] = lead.consultant_id ? consultantsMap.get(lead.consultant_id) || 'Desconhecido' : 'Não Atribuído';
      row['Etapa'] = lead.stage_id ? stagesMap.get(lead.stage_id) || 'Desconhecido' : 'Não Definida';
      row['Valor Proposta'] = lead.proposalValue || '';
      row['Data Fechamento Proposta'] = lead.proposalClosingDate || '';
      row['Valor Vendido'] = lead.soldCreditValue || '';
      row['Grupo Vendido'] = lead.soldGroup || '';
      row['Cota Vendida'] = lead.soldQuota || '';
      row['Data Venda'] = lead.saleDate || '';
      row['Criado Em'] = new Date(lead.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(lead.created_at).toLocaleTimeString('pt-BR');
      row['Atualizado Em'] = new Date(lead.updated_at).toLocaleDateString('pt-BR') + ' ' + new Date(lead.updated_at).toLocaleTimeString('pt-BR');

      // Campos dinâmicos
      crmFields
        .filter(f => f.is_active && f.key !== 'name')
        .forEach(field => {
          row[field.label] = lead.data?.[field.key] || '';
        });

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