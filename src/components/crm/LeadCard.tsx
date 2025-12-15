import React from 'react';
import { CrmLead, CrmField } from '@/types';
import { User, Phone, Mail, Tag, Calendar, Edit2 } from 'lucide-react';

interface LeadCardProps {
  lead: CrmLead;
  crmFields: CrmField[];
  onEdit: (lead: CrmLead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, crmFields, onEdit }) => {
  const getFieldValue = (key: string) => {
    return lead.data?.[key] || 'N/A';
  };

  const getFieldLabel = (key: string) => {
    const field = crmFields.find(f => f.key === key);
    return field ? field.label : key;
  };

  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg shadow-md p-4 mb-3 border border-gray-200 dark:border-slate-600 relative group">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white text-base pr-8">{lead.name}</h4>
        <button
          onClick={() => onEdit(lead)}
          className="p-1.5 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3"
          title="Editar Lead"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        {crmFields.filter(f => f.is_active).map(field => (
          <div key={field.key} className="flex items-center">
            {field.key === 'phone' && <Phone className="w-3 h-3 mr-2 text-gray-400" />}
            {field.key === 'email' && <Mail className="w-3 h-3 mr-2 text-gray-400" />}
            {field.key !== 'phone' && field.key !== 'email' && <Tag className="w-3 h-3 mr-2 text-gray-400" />}
            <span className="font-medium">{field.label}:</span>
            <span className="ml-1">{getFieldValue(field.key)}</span>
          </div>
        ))}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-600 mt-2">
          <Calendar className="w-3 h-3 mr-1.5" />
          <span>Criado em: {new Date(lead.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;