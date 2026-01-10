import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertTriangle, User, Mail, Phone, MapPin, CalendarDays, Home, FileText, Upload, Link as LinkIcon, Instagram, Facebook, Linkedin, Twitter, Globe, ArrowLeft, ArrowRight, FileBadge, IdCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/integrations/supabase/client';

// Helper functions for formatting
const formatCpfInput = (value: string): string => {
  value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
  value = value.replace(/(\d{3})(\d)/, '$1.$2'); // Adiciona ponto após o 3º dígito
  value = value.replace(/(\d{3})(\d)/, '$1.$2'); // Adiciona ponto após o 6º dígito
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); // Adiciona hífen após o 9º dígito
  return value.substring(0, 14); // Limita ao tamanho máximo do CPF formatado
};

const formatCelularInput = (value: string): string => {
  value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
  value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); // Adiciona parênteses e espaço
  value = value.replace(/(\d)(\d{4})$/, '$1-$2'); // Adiciona hífen
  return value.substring(0, 15); // Limita ao tamanho máximo do celular formatado
};

const formatCepInput = (value: string): string => {
  value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
  value = value.replace(/^(\d{5})(\d)/, '$1-$2'); // Adiciona hífen
  return value.substring(0, 9); // Limita ao tamanho máximo do CEP formatado
};

// Helper function for formatting RG
const formatRgInput = (value: string): string => {
  value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
  // Formato comum: XX.XXX.XXX-X ou X.XXX.XXX-X
  if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
  }
  if (value.length > 6) {
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  }
  if (value.length > 10) {
    value = value.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return value.substring(0, 12); // Limita ao tamanho máximo do RG formatado (ex: 12.345.678-9)
};


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
  nome_completo_conjuge?: string;
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
  tipo_documento_identificacao: 'RG' | 'CNH' | ''; // NOVO: Tipo de documento
  documento_identificacao_file: File | null;
  comprovante_endereco_file: File | null;
  comprovante_nome_quem: 'No meu nome' | 'No nome dos pais' | '';
  certidao_nascimento_file: File | null;
}

// Definição das etapas do formulário
const formSteps = [
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

export const PublicForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    nome_completo: '', cpf: '', rg: '', orgao_emissor_rg: '', nacionalidade: '', estado_civil: '',
    data_nascimento: '', estado_nascimento: '', cidade_nascimento: '', email: '', profissao: '',
    celular: '', cep: '', estado_endereco: '', cidade_endereco: '', rua_endereco: '',
    bairro_endereco: '', numero_endereco: '', complemento_endereco: '',
    rede_social: '', link_rede_social: '',
    tipo_documento_identificacao: '',
    documento_identificacao_file: null,
    comprovante_endereco_file: null, comprovante_nome_quem: '', certidao_nascimento_file: null,
  });
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [hasRenderError, setHasRenderError] = useState<string | null>(null);
  const [isDocumentTypeModalOpen, setIsDocumentTypeModalOpen] = useState(false);

  const validateCpf = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return 'CPF inválido.';
    let sum = 0; let remainder;
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

  const validateField = useCallback((name: keyof FormData, value: any) => {
    let error = '';
    switch (name) {
      case 'nome_completo': case 'rg': case 'orgao_emissor_rg': case 'data_nascimento':
      case 'estado_nascimento': case 'cidade_nascimento': case 'profissao':
      case 'numero_endereco':
        if (!value?.trim()) error = 'Campo obrigatório.';
        break;
      case 'cpf': error = validateCpf(value); break;
      case 'email': error = validateEmail(value); break;
      case 'celular': error = validateCelular(value); break;
      case 'nacionalidade': case 'estado_civil': case 'comprovante_nome_quem':
        if (!value) error = 'Selecione uma opção.';
        break;
      case 'nome_completo_conjuge':
        if (formData.estado_civil === 'Casado' && !value?.trim()) error = 'Campo obrigatório.';
        break;
      case 'tipo_documento_identificacao':
        if (!value) error = 'Selecione o tipo de documento.';
        break;
      case 'documento_identificacao_file': case 'comprovante_endereco_file':
        if (!value) error = 'Upload obrigatório.';
        break;
      case 'certidao_nascimento_file':
        if (formData.comprovante_nome_quem === 'No nome dos pais' && !value) error = 'Upload obrigatório.';
        break;
      case 'cep':
        if (!value.replace(/\D/g, '')) error = 'CEP obrigatório.';
        else if (value.replace(/\D/g, '').length !== 8) error = 'CEP inválido.';
        break;
      case 'complemento_endereco':
        break;
      default: break;
    }
    return error;
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let formattedValue: any = value;

    if (type === 'file') {
      formattedValue = (e.target as HTMLInputElement).files?.[0] || null;
    } else if (name === 'cpf') {
      formattedValue = formatCpfInput(value);
    } else if (name === 'celular') {
      formattedValue = formatCelularInput(value);
    } else if (name === 'cep') {
      formattedValue = formatCepInput(value);
    } else if (name === 'rg') {
      formattedValue = formatRgInput(value);
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: formattedValue };
      if (name === 'cep' && value.replace(/\D/g, '').length !== 8) {
        updated.estado_endereco = ''; updated.cidade_endereco = '';
        updated.rua_endereco = ''; updated.bairro_endereco = '';
      }
      return updated;
    });
    setErrors(prev => ({ ...prev, [name]: validateField(name as keyof FormData, formattedValue) }));
  };

  const handleCepBlur = useCallback(async () => {
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
  }, [formData]);

  const validateCurrentStep = useCallback(() => {
    const currentStepFields = formSteps[currentStep].fields;
    let stepIsValid = true;
    const currentStepErrors: Record<string, string> = {};

    currentStepFields.forEach(fieldName => {
      const value = formData[fieldName as keyof FormData];
      const error = validateField(fieldName as keyof FormData, value);
      if (error) {
        currentStepErrors[fieldName] = error;
        stepIsValid = false;
      }
      // Special conditional validations
      if (fieldName === 'nome_completo_conjuge' && formData.estado_civil === 'Casado') {
        if (!value?.trim()) {
          currentStepErrors[fieldName] = 'Campo obrigatório.';
          stepIsValid = false;
        }
      } else if (fieldName === 'nome_completo_conjuge' && formData.estado_civil !== 'Casado') {
        delete currentStepErrors[fieldName];
      }
      if (fieldName === 'certidao_nascimento_file' && formData.comprovante_nome_quem === 'No nome dos pais') {
        if (!value) {
          currentStepErrors[fieldName] = 'Upload obrigatório.';
          stepIsValid = false;
        }
      } else if (fieldName === 'certidao_nascimento_file' && formData.comprovante_nome_quem !== 'No nome dos pais') {
        delete currentStepErrors[fieldName];
      }
      // NOVO: Validação condicional para documento de identificação
      if (fieldName === 'documento_identificacao_file' && formData.tipo_documento_identificacao && !value) {
        currentStepErrors[fieldName] = 'Upload obrigatório.';
        stepIsValid = false;
      } else if (fieldName === 'documento_identificacao_file' && !formData.tipo_documento_identificacao) {
        delete currentStepErrors[fieldName];
      }
    });

    setErrors(prev => ({ ...prev, ...currentStepErrors }));
    return stepIsValid;
  }, [currentStep, formData, validateField]);

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, formSteps.length - 1));
    } else {
      toast.error("Por favor, preencha todos os campos obrigatórios antes de continuar.");
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let formIsValid = true;
    const allErrors: Record<string, string> = {};

    // Validate all steps before final submission
    formSteps.forEach(step => {
      step.fields.forEach(fieldName => {
        const value = formData[fieldName as keyof FormData];
        const error = validateField(fieldName as keyof FormData, value);
        if (error) {
          allErrors[fieldName] = error;
          formIsValid = false;
        }
        // Special conditional validations
        if (fieldName === 'nome_completo_conjuge' && formData.estado_civil === 'Casado' && !value?.trim()) {
          allErrors[fieldName] = 'Campo obrigatório.';
          formIsValid = false;
        } else if (fieldName === 'nome_completo_conjuge' && formData.estado_civil !== 'Casado') {
          delete allErrors[fieldName];
        }
        if (fieldName === 'certidao_nascimento_file' && formData.comprovante_nome_quem === 'No nome dos pais' && !value) {
          allErrors[fieldName] = 'Upload obrigatório.';
          formIsValid = false;
        } else if (fieldName === 'certidao_nascimento_file' && formData.comprovante_nome_quem !== 'No nome dos pais') {
          delete allErrors[fieldName];
        }
        // NOVO: Validação condicional para documento de identificação
        if (fieldName === 'documento_identificacao_file' && formData.tipo_documento_identificacao && !value) {
          allErrors[fieldName] = 'Upload obrigatório.';
          formIsValid = false;
        } else if (fieldName === 'documento_identificacao_file' && !formData.tipo_documento_identificacao) {
          delete allErrors[fieldName];
        }
      });
    });

    setErrors(allErrors);

    if (!formIsValid) {
      setLoading(false);
      toast.error("Por favor, corrija os erros no formulário antes de enviar.");
      return;
    }

    try {
      const filesToUpload: { fieldName: string; file: File; }[] = [];
      if (formData.documento_identificacao_file) filesToUpload.push({ fieldName: 'documento_identificacao', file: formData.documento_identificacao_file });
      if (formData.comprovante_endereco_file) filesToUpload.push({ fieldName: 'comprovante_endereco', file: formData.comprovante_endereco_file });
      if (formData.certidao_nascimento_file) filesToUpload.push({ fieldName: 'certidao_nascimento', file: formData.certidao_nascimento_file });

      const submissionData: any = { ...formData };
      delete submissionData.documento_identificacao_file;
      delete submissionData.comprovante_endereco_file;
      delete submissionData.certidao_nascimento_file;

      const processedFiles = await Promise.all(filesToUpload.map(async (f) => ({
        fieldName: f.fieldName,
        fileName: f.file.name,
        fileType: f.file.type,
        fileContent: Array.from(new Uint8Array(await f.file.arrayBuffer())),
      })));

      const { data, error: invokeError } = await supabase.functions.invoke('submit-form', {
        body: { submissionData, files: processedFiles },
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

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Unhandled error caught by PublicForm:", error);
      setHasRenderError(error.message || "Ocorreu um erro inesperado na renderização do formulário.");
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasRenderError) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-900/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-red-800 dark:text-red-200">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
          <h2 className="mt-6 text-2xl font-extrabold">Erro na Renderização do Formulário</h2>
          <p className="mt-2 text-sm">{hasRenderError}</p>
          <p className="mt-4 text-xs text-red-700 dark:text-red-300">Por favor, tente novamente mais tarde ou entre em contato com o suporte.</p>
        </div>
      </div>
    );
  }

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

  const CurrentStepIcon = formSteps[currentStep].icon;

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
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Etapa {currentStep + 1} de {formSteps.length}</span>
                <span>{formSteps[currentStep].title}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-brand-500 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / formSteps.length) * 100}%` }}></div>
              </div>
            </div>

            {/* Current Step Content */}
            <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <CurrentStepIcon className="w-5 h-5 mr-2 text-brand-500" /> {formSteps[currentStep].title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formSteps[currentStep].fields.map(fieldName => {
                  // 'complemento_endereco' não é obrigatório
                  const isRequired = !['complemento_endereco'].includes(fieldName) && !formSteps[currentStep].optional;
                  // Validações condicionais para campos específicos
                  const isConditionallyRequired = (fieldName === 'nome_completo_conjuge' && formData.estado_civil === 'Casado') ||
                                                 (fieldName === 'certidao_nascimento_file' && formData.comprovante_nome_quem === 'No nome dos pais') ||
                                                 (fieldName === 'documento_identificacao_file' && formData.tipo_documento_identificacao !== '');

                  // Conditional rendering for specific fields
                  if (fieldName === 'nome_completo_conjuge' && formData.estado_civil !== 'Casado') return null;
                  if (fieldName === 'certidao_nascimento_file' && formData.comprovante_nome_quem !== 'No nome dos pais') return null;
                  if (['estado_endereco', 'cidade_endereco', 'rua_endereco', 'bairro_endereco', 'numero_endereco', 'complemento_endereco'].includes(fieldName) && formSteps[currentStep].id === 'localizacao') {
                    return (
                      <div key={fieldName}>
                        <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {/* NOVO: Lógica para remover '_endereco' e formatar o rótulo */}
                          {fieldName.replace('_endereco', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim()} {(isRequired || isConditionallyRequired) && <span className="text-red-500">*</span>}
                        </label>
                        <input type="text" id={fieldName} name={fieldName} value={formData[fieldName as keyof FormData] as string || ''} readOnly={!['cep', 'numero_endereco', 'complemento_endereco'].includes(fieldName)} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                      </div>
                    );
                  }

                  return (
                    <div key={fieldName} className={['rua_endereco'].includes(fieldName) ? 'md:col-span-2' : ''}>
                      <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {/* Rótulos dinâmicos e corrigidos */}
                        {fieldName === 'documento_identificacao_file' && formData.tipo_documento_identificacao ? `Arquivo do ${formData.tipo_documento_identificacao}` :
                         fieldName === 'comprovante_endereco_file' ? 'Comprovante de Residência' :
                         fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} {(isRequired || isConditionallyRequired) && <span className="text-red-500">*</span>}
                      </label>
                      {fieldName === 'cpf' ? (
                        <input 
                          type="text" 
                          id="cpf" 
                          name="cpf" 
                          value={formData.cpf} 
                          onChange={handleChange} 
                          onBlur={() => setErrors(prev => ({ ...prev, cpf: validateField('cpf', formData.cpf) }))}
                          className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" 
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      ) : fieldName === 'celular' ? (
                        <input 
                          type="text" 
                          id="celular" 
                          name="celular" 
                          value={formData.celular} 
                          onChange={handleChange} 
                          onBlur={() => setErrors(prev => ({ ...prev, celular: validateField('celular', formData.celular) }))}
                          className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" 
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      ) : fieldName === 'cep' ? (
                        <input 
                          type="text" 
                          id="cep" 
                          name="cep" 
                          value={formData.cep} 
                          onChange={handleChange} 
                          onBlur={handleCepBlur}
                          className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" 
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      ) : fieldName === 'rg' ? (
                        <input 
                          type="text" 
                          id="rg" 
                          name="rg" 
                          value={formData.rg} 
                          onChange={handleChange} 
                          onBlur={() => setErrors(prev => ({ ...prev, rg: validateField('rg', formData.rg) }))}
                          className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" 
                          placeholder="00.000.000-0"
                          maxLength={12}
                        />
                      ) : fieldName === 'tipo_documento_identificacao' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsDocumentTypeModalOpen(true)}
                            className="mt-1 flex items-center justify-center w-full py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all"
                          >
                            {formData.tipo_documento_identificacao ? (
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            ) : (
                              <FileBadge className="w-4 h-4 mr-2" />
                            )}
                            {formData.tipo_documento_identificacao || 'Selecionar Tipo de Documento'}
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enviar frente e verso do RG, CPF ou CNH.</p>
                        </>
                      ) : fieldName === 'documento_identificacao_file' ? (
                        formData.tipo_documento_identificacao ? (
                          <input type="file" id={fieldName} name={fieldName} onChange={handleChange} accept=".pdf,image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400 dark:hover:file:bg-brand-900/40" />
                        ) : (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Selecione o tipo de documento acima.</p>
                        )
                      ) : fieldName.includes('_file') ? (
                        <>
                          <input type="file" id={fieldName} name={fieldName} onChange={handleChange} accept=".pdf,image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400 dark:hover:file:bg-brand-900/40" />
                          {fieldName === 'comprovante_endereco_file' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">O comprovante deve estar no nome do titular ou no nome dos pais.</p>}
                          {fieldName === 'certidao_nascimento_file' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Documento necessário para validação de vínculo.</p>}
                        </>
                      ) : ['nacionalidade', 'estado_civil', 'comprovante_nome_quem', 'rede_social'].includes(fieldName) ? (
                        <select id={fieldName} name={fieldName} value={formData[fieldName as keyof FormData] as string || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white">
                          <option value="">Selecione...</option>
                          {fieldName === 'nacionalidade' && (<><option value="Brasileiro">Brasileiro</option><option value="Estrangeiro">Estrangeiro</option></>)}
                          {fieldName === 'estado_civil' && (<><option value="Solteiro">Solteiro</option><option value="Casado">Casado</option><option value="Divorciado">Divorciado</option><option value="Viúvo">Viúvo</option></>)}
                          {fieldName === 'comprovante_nome_quem' && (<><option value="No meu nome">No meu nome</option><option value="No nome dos pais">No nome dos pais</option></>)}
                          {fieldName === 'rede_social' && SOCIAL_MEDIA_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : fieldName === 'data_nascimento' ? (
                        <input type="date" id={fieldName} name={fieldName} value={formData[fieldName as keyof FormData] as string || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                      ) : fieldName === 'email' ? (
                        <input type="text" id={fieldName} name={fieldName} value={formData[fieldName as keyof FormData] as string || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" placeholder="exemplo@gmail.com" />
                      ) : (
                        <input type="text" id={fieldName} name={fieldName} value={formData[fieldName as keyof FormData] as string || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 dark:border-slate-600 rounded-md shadow-sm p-2 dark:bg-slate-700 dark:text-white" />
                      )}
                      {errors[fieldName] && <p className="text-red-500 text-xs mt-1">{errors[fieldName]}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center justify-center py-2 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
                </button>
              )}
              {currentStep < formSteps.length - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all ml-auto"
                >
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
              {currentStep === formSteps.length - 1 && (
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
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Document Type Selection Modal */}
      {isDocumentTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Tipo de Documento</h3>
              <button onClick={() => setIsDocumentTypeModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm">Qual tipo de documento de identificação você irá enviar?</p>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, tipo_documento_identificacao: 'RG' }));
                    setErrors(prev => ({ ...prev, tipo_documento_identificacao: '' }));
                    setIsDocumentTypeModalOpen(false);
                  }}
                  className="flex-1 flex flex-col items-center justify-center py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all"
                >
                  <IdCard className="w-6 h-6 mb-2 text-blue-500" />
                  <span>RG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, tipo_documento_identificacao: 'CNH' }));
                    setErrors(prev => ({ ...prev, tipo_documento_identificacao: '' }));
                    setIsDocumentTypeModalOpen(false);
                  }}
                  className="flex-1 flex flex-col items-center justify-center py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all"
                >
                  <FileBadge className="w-6 h-6 mb-2 text-green-500" />
                  <span>CNH</span>
                </button>
              </div>
              {errors.tipo_documento_identificacao && <p className="text-red-500 text-xs mt-1">{errors.tipo_documento_identificacao}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};