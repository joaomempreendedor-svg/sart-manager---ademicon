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
  console.log("PublicForm component is rendering."); // Log para verificar a renderização
  // Removendo a maior parte do estado e lógica para simplificar
  // const navigate = useNavigate();
  // const [formData, setFormData] = useState<FormData>({ ... });
  // const [loading, setLoading] = useState(false);
  // const [formSubmitted, setFormSubmitted] = useState(false);
  // const [errors, setErrors] = useState<Record<string, string>>({});

  // Retornando apenas um div simples para testar a renderização
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Olá, Formulário Público!</h1>
    </div>
  );
};