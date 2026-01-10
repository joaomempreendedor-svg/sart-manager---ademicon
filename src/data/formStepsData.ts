import { User, Mail, Phone, MapPin, CalendarDays, Home, FileText, Upload, Link as LinkIcon, Instagram, Facebook, Linkedin, Twitter, Globe, FileBadge, IdCard } from 'lucide-react';

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];
export const SOCIAL_MEDIA_OPTIONS = [
  'Instagram', 'Facebook', 'LinkedIn', 'Twitter / X'
];

export const formSteps = [
  {
    id: 'dados_pessoais_1',
    title: 'Dados Pessoais (1/2)',
    icon: User,
    fields: ['nome_completo', 'cpf', 'rg', 'orgao_emissor_rg'],
  },
  {
    id: 'dados_pessoais_2',
    title: 'Dados Pessoais (2/2)',
    icon: CalendarDays,
    fields: ['nacionalidade', 'estado_civil', 'nome_completo_conjuge', 'data_nascimento', 'estado_nascimento', 'cidade_nascimento'],
  },
  {
    id: 'contato',
    title: 'Contato',
    icon: Mail,
    fields: ['email', 'profissao', 'celular'],
  },
  {
    id: 'localizacao',
    title: 'Localização',
    icon: Home,
    fields: ['cep', 'estado_endereco', 'cidade_endereco', 'rua_endereco', 'bairro_endereco', 'numero_endereco', 'complemento_endereco'],
  },
  {
    id: 'redes_sociais',
    title: 'Redes Sociais',
    icon: LinkIcon,
    fields: ['rede_social', 'link_rede_social'],
    optional: true,
  },
  {
    id: 'documentos_1',
    title: 'Documentos (1/2)',
    icon: Upload,
    fields: ['tipo_documento_identificacao', 'documento_identificacao_file', 'comprovante_endereco_file'],
  },
  {
    id: 'documentos_2',
    title: 'Documentos (2/2)',
    icon: FileText,
    fields: ['comprovante_nome_quem', 'certidao_nascimento_file'],
  },
];