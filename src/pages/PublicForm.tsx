import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputMask from 'react-input-mask';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertTriangle, User, Mail, Phone, MapPin, CalendarDays, Home, FileText, Upload, Link as LinkIcon, Instagram, Facebook, Linkedin, Twitter, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/integrations/supabase/client'; // Importar o cliente Supabase

// Constantes para estados e nacionalidades
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];
const SOCIAL_MEDIA_OPTIONS = [
  'Instagram', 'Facebook', 'LinkedIn', 'Twitter / X'
];

interface FormData {
  nome_completo: string;
  cpf: string;
  rg: string;
  orgao_emissor_rg: string;
  nacionalidade: 'Brasileiro' | 'Estrangeiro' | '';
  estado_civil: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | '';
  nome_completo_conjuge?: string; // Condicional
  data_nascimento: string;
  estado_nascimento: string;
  cidade_nascimento: string;
  email: string;
  profissao: string;
  celular: string;
  cep: string;
  estado_endereco: string;
  cidade_endereco: string;
  rua_endereco: string;
  bairro_endereco: string;
  numero_endereco: string;
  complemento_endereco?: string;
  rede_social?: 'Instagram' | 'Facebook' | 'LinkedIn' | 'Twitter / X' | '';
  link_rede_social?: string;
  // Documentos (serão tratados como File objects e URLs após upload)
  documento_identificacao_file?: File | null;
  comprovante_endereco_file?: File | null;
  comprovante_nome_quem?: 'No meu nome' | 'No nome dos pais' | ''; // Condicional
  certidao_nascimento_file?: File | null; // Condicional
}

export const PublicForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    nome_completo: '',
    cpf: '',
    rg: '',
    orgao_emissor_rg: '',
    nacionalidade: '',
    estado_civil: '',
    data_nascimento: '',
    estado_nascimento: '',
    cidade_nascimento: '',
    email: '',
    profissao: '',
    celular: '',
    cep: '',
    estado_endereco: '',
    cidade_endereco: '',
    rua_endereco: '',
    bairro_endereco: '',
    numero_endereco: '',
    documento_identificacao_file: null,
    comprovante_endereco_file: null,
    comprovante_nome_quem: '',
    certidao_nascimento_file: null,
  });
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validações
  const validateCpf = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return 'CPF inválido.';
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return 'CPF inválido.';
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return 'CPF inválido.';
    return '';
  };

  const validateEmail = (email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido.';
    return '';
  };

  const validateCelular = (celular: string) => {
    if (celular.replace(/\D/g, '').length < 10) return 'Celular inválido.';
    return '';
  };

  const validateField = (name: keyof FormData, value: any) => {
    let error = '';
    switch (name) {
      case 'nome_completo':
      case 'rg':
      case 'orgao_emissor_rg':
      case 'data_nascimento':
      case 'estado_nascimento':
      case 'cidade_nascimento':
      case 'profissao':
      case 'numero_endereco':
        if (!value.trim()) error = 'Campo obrigatório.';
        break;
      case 'cpf':
        error = validateCpf(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'celular':
        error = validateCelular(value);
        break;
      case 'nacionalidade':
      case 'estado_civil':
      case 'comprovante_nome_quem':
        if (!value) error = 'Selecione uma opção.';
        break;
      case 'nome_completo_conjuge':
        if (formData.estado_civil === 'Casado' && !value?.trim()) error = 'Campo obrigatório.';
        break;
      case 'documento_identificacao_file':
      case 'comprovante_endereco_file':
        if (!value) error = 'Upload obrigatório.';
        break;
      case 'certidao_nascimento_file':
        if (formData.comprovante_nome_quem === 'No nome dos pais' && !value) error = 'Upload obrigatório.';
        break;
      case 'cep':
        if (!value.replace(/\D/g, '')) error = 'CEP obrigatório.';
        else if (value.replace(/\D/g, '').length !== 8) error = 'CEP inválido.';
        else if (!formData.rua_endereco) error = 'CEP não encontrado ou inválido.'; // Validação após busca
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'file') {
      newValue = (e.target as HTMLInputElement).files?.[0] || null;
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      // Clear address fields if CEP changes
      if (name === 'cep' && value.replace(/\D/g, '').length !== 8) {
        updated.estado_endereco = '';
        updated.cidade_endereco = '';
        updated.rua_endereco = '';
        updated.bairro_endereco = '';
      }
      return updated;
    });
    validateField(name as keyof FormData, newValue);
  };

  // Busca CEP
  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (response.data.erro) {
          setErrors(prev => ({ ...prev, cep: 'CEP não encontrado.' }));
          setFormData(prev => ({ ...prev, estado_endereco: '', cidade_endereco: '', rua_endereco: '', bairro_endereco: '' }));
        } else {
          setFormData(prev => ({
            ...prev,
            estado_endereco: response.data.uf,
            cidade_endereco: response.data.localidade,
            rua_endereco: response.data.logradouro,
            bairro_endereco: response.data.bairro,
          }));
          setErrors(prev => ({ ...prev, cep: '' }));
        }
      } catch (err) {
        setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP.' }));
        setFormData(prev => ({ ...prev, estado_endereco: '', cidade_endereco: '', rua_endereco: '', bairro_endereco: '' }));
      }
    } else {
      setErrors(prev => ({ ...prev, cep: 'CEP inválido.' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let formIsValid = true;
    const newErrors: Record<string, string> = {};

    // Validate all fields
    (Object.keys(formData) as Array<keyof FormData>).forEach(key => {
      // Skip file fields for direct validation here, they are handled below
      if (key.includes('_file')) return; 
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        formIsValid = false;
      }
    });

    // Validate conditional fields
    if (formData.estado_civil === 'Casado' && !formData.nome_completo_conjuge?.trim()) {
      newErrors.nome_completo_conjuge = 'Campo obrigatório.';
      formIsValid = false;
    }
    if (formData.comprovante_nome_quem === 'No nome dos pais' && !formData.certidao_nascimento_file) {
      newErrors.certidao_nascimento_file = 'Upload obrigatório.';
      formIsValid = false;
    }

    // Validate required file uploads
    if (!formData.documento_identificacao_file) {
      newErrors.documento_identificacao_file = 'Upload obrigatório.';
      formIsValid = false;
    }
    if (!formData.comprovante_endereco_file) {
      newErrors.comprovante_endereco_file = 'Upload obrigatório.';
      formIsValid = false;
    }

    setErrors(newErrors);

    if (!formIsValid) {
      setLoading(false);
      toast.error("Por favor, corrija os erros no formulário.");
      return;
    }

    try {
      const filesToUpload: { fieldName: string; file: File; }[] = [];
      if (formData.documento_identificacao_file) filesToUpload.push({ fieldName: 'documento_identificacao', file: formData.documento_identificacao_file });
      if (formData.comprovante_endereco_file) filesToUpload.push({ fieldName: 'comprovante_endereco', file: formData.comprovante_endereco_file });
      if (formData.certidao_nascimento_file) filesToUpload.push({ fieldName: 'certidao_nascimento', file: formData.certidao_nascimento_file });

      const submissionData: any = { ...formData };
      // Remove file objects from submissionData as they are handled separately
      delete submissionData.documento_identificacao_file;
      delete submissionData.comprovante_endereco_file;
      delete submissionData.certidao_nascimento_file;

      // Prepare files for upload by converting them to ArrayBuffer and then to an array of numbers
      const processedFiles = await Promise.all(filesToUpload.map(async (f) => ({
        fieldName: f.fieldName,
        fileName: f.file.name,
        fileType: f.file.type,
        fileContent: Array.from(new Uint8Array(await f.file.arrayBuffer())), // Convert to array of numbers
      })));

      // Invoke Edge Function to handle submission and file uploads
      const { data, error: invokeError } = await supabase.functions.invoke('submit-form', {
        body: {
          submissionData,
          files: processedFiles, // Use the processed files
        },
      });

      if (invokeError) {
        console.error("Edge Function invocation error:", invokeError);
        toast.error(`Erro ao enviar formulário: ${invokeError.message}`);
        throw invokeError;
      }
      if (data?.error) {
        console.error("Edge Function returned error:", data.error);
        toast.error(`Erro ao enviar formulário: ${data.error}`);
        throw new Error(data.error);
      }

      toast.success("Formulário enviado com sucesso!");
      setFormSubmitted(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(`Falha ao enviar formulário: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center items-center space-x-2">
            <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
              <Globe className="w-8 h-8" strokeWidth={3} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">Formulário</span>
              <span className="text-3xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Obrigado!
          </h2>
          <p className="mt-2 text-center text-lg text-green-600 dark:text-green-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 mr-2" /> Sua submissão foi recebida com sucesso.
          </p>
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Entraremos em contato em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2">
          <div className="bg-brand-500 text-white p-2 rounded-lg shadow-lg shadow-brand-500/30">
            <Globe className="w-8 h-8" strokeWidth={3} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-widest uppercase">Formulário</span>
            <span className="text-3xl font-black text-brand-500 tracking-tighter -mt-1">SART</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Preencha seus dados
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Por favor, preencha o formulário abaixo com suas informações.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 dark:border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* DADOS PESSOAIS */}
            <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <User className="w-5 h-5 mr-2 text-brand-500" /> Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nome_completo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo *</label>
                  <input type="text" id="nome_completo" name="nome_completo" value={formData.nome_completo} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.nome_completo && <p className="text-red-500 text-xs mt-1">{errors.nome_completo}</p>}
                </div>
                <div>
                  <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">CPF *</label>
                  <InputMask mask="999.999.999-99" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} onBlur={() => validateField('cpf', formData.cpf)} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
                </div>
                <div>
                  <label htmlFor="rg" className="block text-sm font-medium text-gray-700 dark:text-gray-300">RG *</label>
                  <input type="text" id="rg" name="rg" value={formData.rg} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.rg && <p className="text-red-500 text-xs mt-1">{errors.rg}</p>}
                </div>
                <div>
                  <label htmlFor="orgao_emissor_rg" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Órgão Emissor RG *</label>
                  <input type="text" id="orgao_emissor_rg" name="orgao_emissor_rg" value={formData.orgao_emissor_rg} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.orgao_emissor_rg && <p className="text-red-500 text-xs mt-1">{errors.orgao_emissor_rg}</p>}
                </div>
                <div>
                  <label htmlFor="nacionalidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nacionalidade *</label>
                  <select id="nacionalidade" name="nacionalidade" value={formData.nacionalidade} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white">
                    <option value="">Selecione...</option>
                    <option value="Brasileiro">Brasileiro</option>
                    <option value="Estrangeiro">Estrangeiro</option>
                  </select>
                  {errors.nacionalidade && <p className="text-red-500 text-xs mt-1">{errors.nacionalidade}</p>}
                </div>
                <div>
                  <label htmlFor="estado_civil" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado Civil</label>
                  <select id="estado_civil" name="estado_civil" value={formData.estado_civil} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white">
                    <option value="">Selecione...</option>
                    <option value="Solteiro">Solteiro</option>
                    <option value="Casado">Casado</option>
                    <option value="Divorciado">Divorciado</option>
                    <option value="Viúvo">Viúvo</option>
                  </select>
                  {errors.estado_civil && <p className="text-red-500 text-xs mt-1">{errors.estado_civil}</p>}
                </div>
                {formData.estado_civil === 'Casado' && (
                  <div>
                    <label htmlFor="nome_completo_conjuge" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo do Cônjuge *</label>
                    <input type="text" id="nome_completo_conjuge" name="nome_completo_conjuge" value={formData.nome_completo_conjuge || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                    {errors.nome_completo_conjuge && <p className="text-red-500 text-xs mt-1">{errors.nome_completo_conjuge}</p>}
                  </div>
                )}
                <div>
                  <label htmlFor="data_nascimento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Nascimento *</label>
                  <input type="date" id="data_nascimento" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.data_nascimento && <p className="text-red-500 text-xs mt-1">{errors.data_nascimento}</p>}
                </div>
                <div>
                  <label htmlFor="estado_nascimento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado de Nascimento *</label>
                  <select id="estado_nascimento" name="estado_nascimento" value={formData.estado_nascimento} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white">
                    <option value="">Selecione...</option>
                    {BRAZILIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                  </select>
                  {errors.estado_nascimento && <p className="text-red-500 text-xs mt-1">{errors.estado_nascimento}</p>}
                </div>
                <div>
                  <label htmlFor="cidade_nascimento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cidade de Nascimento *</label>
                  <input type="text" id="cidade_nascimento" name="cidade_nascimento" value={formData.cidade_nascimento} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.cidade_nascimento && <p className="text-red-500 text-xs mt-1">{errors.cidade_nascimento}</p>}
                </div>
              </div>
            </div>

            {/* CONTATO */}
            <div className="border-b border-gray-200 dark:border-slate-700 pb-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <Mail className="w-5 h-5 mr-2 text-brand-500" /> Contato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail *</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={() => validateField('email', formData.email)} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="profissao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profissão *</label>
                  <input type="text" id="profissao" name="profissao" value={formData.profissao} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.profissao && <p className="text-red-500 text-xs mt-1">{errors.profissao}</p>}
                </div>
                <div>
                  <label htmlFor="celular" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Celular *</label>
                  <InputMask mask="(99) 99999-9999" id="celular" name="celular" value={formData.celular} onChange={handleChange} onBlur={() => validateField('celular', formData.celular)} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.celular && <p className="text-red-500 text-xs mt-1">{errors.celular}</p>}
                </div>
              </div>
            </div>

            {/* ENDEREÇO */}
            <div className="border-b border-gray-200 dark:border-slate-700 pb-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <Home className="w-5 h-5 mr-2 text-brand-500" /> Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cep" className="block text-sm font-medium text-gray-700 dark:text-gray-300">CEP *</label>
                  <InputMask mask="99999-999" id="cep" name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep}</p>}
                </div>
                <div>
                  <label htmlFor="estado_endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                  <input type="text" id="estado_endereco" name="estado_endereco" value={formData.estado_endereco} readOnly className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <label htmlFor="cidade_endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cidade</label>
                  <input type="text" id="cidade_endereco" name="cidade_endereco" value={formData.cidade_endereco} readOnly className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <label htmlFor="bairro_endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bairro</label>
                  <input type="text" id="bairro_endereco" name="bairro_endereco" value={formData.bairro_endereco} readOnly className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="rua_endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rua</label>
                  <input type="text" id="rua_endereco" name="rua_endereco" value={formData.rua_endereco} readOnly className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <label htmlFor="numero_endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número *</label>
                  <input type="text" id="numero_endereco" name="numero_endereco" value={formData.numero_endereco} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                  {errors.numero_endereco && <p className="text-red-500 text-xs mt-1">{errors.numero_endereco}</p>}
                </div>
                <div>
                  <label htmlFor="complemento_endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Complemento (Opcional)</label>
                  <input type="text" id="complemento_endereco" name="complemento_endereco" value={formData.complemento_endereco || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                </div>
              </div>
            </div>

            {/* REDES SOCIAIS */}
            <div className="border-b border-gray-200 dark:border-slate-700 pb-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <LinkIcon className="w-5 h-5 mr-2 text-brand-500" /> Redes Sociais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rede_social" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rede Social</label>
                  <select id="rede_social" name="rede_social" value={formData.rede_social} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white">
                    <option value="">Selecione...</option>
                    {SOCIAL_MEDIA_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="link_rede_social" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Link ou @ da Rede Social</label>
                  <input type="text" id="link_rede_social" name="link_rede_social" value={formData.link_rede_social || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                </div>
              </div>
            </div>

            {/* DOCUMENTOS (UPLOAD) */}
            <div className="pb-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <Upload className="w-5 h-5 mr-2 text-brand-500" /> Documentos
              </h3>
              <div className="space-y-6">
                {/* Documento de Identificação */}
                <div>
                  <label htmlFor="documento_identificacao_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Documento de Identificação (RG ou CNH) *</label>
                  <input type="file" id="documento_identificacao_file" name="documento_identificacao_file" onChange={handleChange} accept=".pdf,image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400 dark:hover:file:bg-brand-900/40" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enviar frente e verso do documento.</p>
                  {errors.documento_identificacao_file && <p className="text-red-500 text-xs mt-1">{errors.documento_identificacao_file}</p>}
                </div>

                {/* Comprovante de Endereço */}
                <div>
                  <label htmlFor="comprovante_endereco_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comprovante de Endereço *</label>
                  <input type="file" id="comprovante_endereco_file" name="comprovante_endereco_file" onChange={handleChange} accept=".pdf,image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400 dark:hover:file:bg-brand-900/40" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O comprovante deve estar no nome do titular ou no nome dos pais.</p>
                  {errors.comprovante_endereco_file && <p className="text-red-500 text-xs mt-1">{errors.comprovante_endereco_file}</p>}
                </div>

                {/* Comprovante está no nome de quem? (Condicional) */}
                <div>
                  <label htmlFor="comprovante_nome_quem" className="block text-sm font-medium text-gray-700 dark:text-gray-300">O comprovante está no nome de quem? *</label>
                  <select id="comprovante_nome_quem" name="comprovante_nome_quem" value={formData.comprovante_nome_quem} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white">
                    <option value="">Selecione...</option>
                    <option value="No meu nome">No meu nome</option>
                    <option value="No nome dos pais">No nome dos pais</option>
                  </select>
                  {errors.comprovante_nome_quem && <p className="text-red-500 text-xs mt-1">{errors.comprovante_nome_quem}</p>}
                </div>

                {/* Certidão de Nascimento (Condicional) */}
                {formData.comprovante_nome_quem === 'No nome dos pais' && (
                  <div>
                    <label htmlFor="certidao_nascimento_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Certidão de Nascimento *</label>
                    <input type="file" id="certidao_nascimento_file" name="certidao_nascimento_file" onChange={handleChange} accept=".pdf,image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400 dark:hover:file:bg-brand-900/40" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Documento necessário para validação de vínculo.</p>
                    {errors.certidao_nascimento_file && <p className="text-red-500 text-xs mt-1">{errors.certidao_nascimento_file}</p>}
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center">
                    Enviar Formulário
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};