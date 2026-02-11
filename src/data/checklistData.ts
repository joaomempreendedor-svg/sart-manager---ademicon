import { ChecklistStage } from '../types';

export const CHECKLIST_STAGES: ChecklistStage[] = [
  {
    id: 'stage_1',
    title: 'ETAPA 1 – Processo Seletivo e Documentação',
    description: 'Entrevista, notas e envio de documentação.',
    items: [
      { id: 'st1_interview', label: 'Realizar a entrevista completa com formulário + gabarito (Dia 01)', responsibleRole: 'GESTOR' },
      { id: 'st1_score', label: 'Registrar a nota do candidato na ficha', responsibleRole: 'GESTOR' },
      { id: 'st1_response', label: 'Dar a resposta no dia seguinte até 12h (Dia 02)', responsibleRole: 'GESTOR' },
      { 
        id: 'st1_msg_approval', 
        label: 'Enviar mensagem de aprovação + link coleta documentos',
        whatsappTemplate: 'Olá [NOME], tudo bem? Aqui é o João Müller da Ademicon. Tenho ótimas notícias! Gostamos muito do seu perfil e você foi APROVADO(A) nesta primeira etapa. Para darmos sequência, preciso que envie sua documentação através deste link: [LINK_DOCS]. Fico no aguardo!',
        resource: { type: 'image', name: 'Imagem "Próximos Passos.png"' },
        responsibleRole: 'SECRETARIA'
      },
      { 
        id: 'st1_msg_rejection', 
        label: 'Enviar mensagem de reprovação (se aplicável)',
        whatsappTemplate: 'Olá [NOME], agradecemos muito seu tempo e interesse na Ademicon. Neste momento, optamos por seguir com outro perfil para a vaga, mas manteremos seu contato para futuras oportunidades. Desejamos muito sucesso na sua jornada!',
        responsibleRole: 'SECRETARIA'
      },
      { id: 'st1_docs_send', label: 'Encaminhar documentação para análise prévia da Ademicon (Dia 02)', responsibleRole: 'GESTOR' },
      { id: 'st1_status_update', label: 'Atualizar status para: "Aguardando prévia"', responsibleRole: 'SECRETARIA' },
    ]
  },
  {
    id: 'stage_2',
    title: 'ETAPA 2 – Aprovação e Onboarding Online',
    description: 'Sistema SMI e vídeos de treinamento.',
    items: [
      { 
        id: 'st2_smi_link', 
        label: 'Enviar link do sistema SMI e instruir finalizar 100% dos vídeos',
        whatsappTemplate: 'Parabéns pela aprovação na prévia, [NOME]! Agora vamos iniciar seu treinamento. Acesse o sistema SMI pelo link: [LINK_SMI]. É fundamental que você assista 100% dos vídeos antes da nossa integração presencial.',
        responsibleRole: 'SECRETARIA'
      },
      { 
        id: 'st2_msg_docs', 
        label: 'Mensagem de Aviso: Documentação enviada + Liberação Onboarding',
        responsibleRole: 'SECRETARIA'
      },
      { id: 'st2_access', label: 'Liberar acesso ao Onboarding Online após envio dos documentos', responsibleRole: 'SECRETARIA' },
      { id: 'st2_verify', label: 'Conferir no sistema se finalizou o onboarding', responsibleRole: 'SECRETARIA' },
      { id: 'st2_wait_preview', label: 'Aguardar resposta da prévia (Ademicon)', responsibleRole: 'SECRETARIA' },
      { 
        id: 'st2_approve_inform', 
        label: 'Se APROVADO: Informar aprovação e enviar data da integração',
        whatsappTemplate: 'Olá [NOME]! Sua documentação foi aprovada e seu onboarding online concluído. Sua Integração Presencial está marcada para o dia [DATA] às [HORA]. Conto com sua presença!',
        responsibleRole: 'SECRETARIA'
      },
      { 
        id: 'st2_computer', 
        label: 'Reforçar presença obrigatória e solicitar computador',
        whatsappTemplate: 'Lembrando: A presença na integração é obrigatória. Por favor, traga seu notebook pessoal para configurarmos as ferramentas de trabalho.',
        responsibleRole: 'SECRETARIA'
      },
      { id: 'st2_status_integration', label: 'Atualizar status: "Aguardando integração"', responsibleRole: 'SECRETARIA' },
      { id: 'st2_deny_msg', label: 'Se REPROVADO: Enviar mensagem formal de dispensa', responsibleRole: 'SECRETARIA' },
    ]
  },
  {
    id: 'stage_3',
    title: 'ETAPA 3 – Integração Presencial',
    description: 'Cultura, Bumerang e Primeiros Passos.',
    items: [
      { id: 'st3_confidentiality', label: 'Orientar sobre assinatura do termo de confidencialidade', responsibleRole: 'GESTOR' },
      { 
        id: 'st3_whatsapp_photo', 
        label: 'Imagem + Mensagem WhatsApp de boas-vindas',
        resource: { type: 'image', name: 'Card Boas Vindas.png' },
        whatsappTemplate: 'Seja muito bem-vindo(a) ao time SART, [NOME]! Vamos juntos construir uma jornada de sucesso na Ademicon 🚀',
        responsibleRole: 'GESTOR'
      },
      { id: 'st3_bumerang', label: 'Orientar sobre conclusão do Bumerang fora do horário comercial', responsibleRole: 'GESTOR' },
      { 
        id: 'st3_apostila', 
        label: 'Realizar a integração presencial utilizando a apostila oficial',
        resource: { type: 'pdf', name: 'Apostila de Vendas Oficial.pdf' },
        responsibleRole: 'GESTOR'
      },
      { id: 'st3_crm_routine', label: 'Ensinar rotina, CRMs e padrão de atendimento', responsibleRole: 'GESTOR' },
      { id: 'st3_method_smi', label: 'Apresentar o Método SMI', responsibleRole: 'GESTOR' },
      { id: 'st3_culture', label: 'Reforçar cultura, metas, comportamento e Dress Code', responsibleRole: 'GESTOR' },
      { 
        id: 'st3_materials', 
        label: 'Encaminhar materiais "Como/Qual?"',
        resource: { type: 'pdf', name: 'Material de Apoio - Como_Qual.pdf' },
        responsibleRole: 'GESTOR'
      },
      { id: 'st3_finish', label: 'Registrar que a integração foi concluída', responsibleRole: 'GESTOR' },
    ]
  },
  {
    id: 'stage_4_w1',
    title: 'ETAPA 4: Dias 01-07 (Primeiros Passos)',
    description: 'Início da prospecção e configuração de ferramentas.',
    items: [
      { id: 'w1_list', label: 'Instruir a Criar lista de contatos conforme apostila', responsibleRole: 'GESTOR' },
      { id: 'w1_crm_smi', label: 'Ensinar como cadastrar leads no CRM SMI', responsibleRole: 'GESTOR' },
      { 
        id: 'w1_apollo_link', 
        label: 'Enviar link para cadastro CRM APOLLO',
        whatsappTemplate: '[NOME], segue o link para cadastro no CRM Apollo (Simulador): [LINK_APOLLO]. Use este sistema apenas para simulações de crédito.',
        responsibleRole: 'GESTOR'
      },
      { id: 'w1_apollo_sim', label: 'Ensinar uso correto do APOLLO para simulações', responsibleRole: 'GESTOR' },
      { id: 'w1_indications', label: 'Orientar sobre captação de indicações', responsibleRole: 'GESTOR' },
      { id: 'w1_cold_call', label: 'Orientar sobre prospecção a frio', responsibleRole: 'GESTOR' },
      { id: 'w1_chip', label: 'Instruir compra de novo chip/aparelho secundário', responsibleRole: 'GESTOR' },
      { id: 'w1_start_pros', label: 'Iniciar prospecção', responsibleRole: 'GESTOR' },
      { id: 'w1_meeting', label: 'Realizar 01 reunião com o consultor', responsibleRole: 'GESTOR' },
      { id: 'w1_feedback', label: 'Realizar Feedback dia 07', responsibleRole: 'GESTOR' },
    ]
  },
  {
    id: 'stage_4_w2',
    title: 'ETAPA 4: Dias 08-15 (Ritmo + Pipeline)',
    description: 'Métricas diárias e domínio dos CRMs.',
    items: [
      { id: 'w2_review_scripts', label: 'Revisar mensagens e scripts usados', responsibleRole: 'GESTOR' },
      { id: 'w2_validate_40', label: 'Validar execução dos 40 contatos/dia', responsibleRole: 'GESTOR' },
      { 
        id: 'w2_evidence', 
        label: 'Cobrar evidências de prospecção diária (prints, CRM)',
        whatsappTemplate: 'Bom dia [NOME]! Como está a prospecção hoje? Por favor, me envie os prints da agenda e atualização do CRM até as 18h.',
        responsibleRole: 'GESTOR'
      },
      { id: 'w2_shadow_meet', label: 'Participar das 2 reuniões acompanhando o consultor', responsibleRole: 'GESTOR' },
      { id: 'w2_pitch', label: 'Avaliar postura, pitch e narrativa', responsibleRole: 'GESTOR' },
      { id: 'w2_pipeline', label: 'Revisar o pipeline semanal junto com o consultor', responsibleRole: 'GESTOR' },
      { id: 'w2_feedback', label: 'Realizar Feedback dia 15', responsibleRole: 'GESTOR' },
    ]
  },
  {
    id: 'stage_4_w34',
    title: 'ETAPA 4: Dias 16-30 (Produtividade Assistida)',
    description: 'Autonomia supervisionada e reuniões.',
    items: [
      { id: 'w34_60_contacts', label: 'Acompanhar se realiza 60 contatos/dia', responsibleRole: 'GESTOR' },
      { id: 'w34_hot_list', label: 'Verificar uso correto da lista quente', responsibleRole: 'GESTOR' },
      { id: 'w34_shadow_2', label: 'Participar de 2 reuniões acompanhando', responsibleRole: 'GESTOR' },
      { id: 'w34_keep_1meet', label: 'Validar se mantém 1 reunião por dia', responsibleRole: 'GESTOR' },
      { id: 'w34_first_solo', label: 'Avaliar a primeira reunião conduzida sozinho', responsibleRole: 'GESTOR' },
      { id: 'w34_proposals', label: 'Revisar todas as propostas enviadas', responsibleRole: 'GESTOR' },
      { id: 'w34_feedback', label: 'Realizar Feedback dia 30 e confirmar Bumerang/UCA', responsibleRole: 'GESTOR' },
    ]
  },
  {
    id: 'stage_4_m2',
    title: 'ETAPA 4: Dias 31-60 (Consolidação)',
    description: 'Rumo à primeira venda.',
    items: [
      { id: 'm2_solo_meetings', label: 'Acompanhar se conduz reuniões sozinho semanalmente', responsibleRole: 'GESTOR' },
      { id: 'm2_first_sale', label: 'Orientar no processo para fechar a 1ª venda', responsibleRole: 'GESTOR' },
      { id: 'm2_crm_full', label: 'Verificar se CRM está totalmente atualizado', responsibleRole: 'GESTOR' },
      { id: 'm2_smi_mastery', label: 'Avaliar domínio da apresentação metodologia SMI', responsibleRole: 'GESTOR' },
      { id: 'm2_presence', label: 'Cobrar presença física no escritório', responsibleRole: 'GESTOR' },
      { id: 'm2_fb_45', label: 'Realizar Feedback Dia 45 (meia etapa)', responsibleRole: 'GESTOR' },
      { id: 'm2_fb_60', label: 'Realizar Feedback Dia 60', responsibleRole: 'GESTOR' },
    ]
  },
  {
    id: 'stage_4_m3',
    title: 'ETAPA 4: Dias 61-90 (Preparação Autorizado)',
    description: 'Validação final para virar independente.',
    items: [
      { id: 'm3_productivity', label: 'Acompanhar produtividade mínima de R$ 1.500.000,00', responsibleRole: 'GESTOR' },
      { id: 'm3_30_meetings', label: 'Verificar se alcançou 30 reuniões totais acumuladas', responsibleRole: 'GESTOR' },
      { id: 'm3_tech_knowledge', label: 'Avaliar conhecimento técnico (consórcio/alavancagem)', responsibleRole: 'GESTOR' },
      { id: 'm3_routine', label: 'Confirmar consistência na rotina diária', responsibleRole: 'GESTOR' },
      { id: 'm3_pj', label: 'Instruir consultor a abrir PJ para virar autorizado', responsibleRole: 'GESTOR' },
      { id: 'm3_fb_final', label: 'Realizar Feedback Final – Dia 90', responsibleRole: 'GESTOR' },
      { id: 'm3_send_docs', label: 'Enviar documentação para a Ademicon', responsibleRole: 'SECRETARIA' },
    ]
  },
  {
    id: 'stage_5',
    title: 'ETAPA 5 – Pós-Autorização',
    description: 'Acompanhamento contínuo.',
    items: [
      { id: 'st5_biweekly', label: 'Realizar reuniões quinzenais', responsibleRole: 'GESTOR' },
      { id: 'st5_perf_fb', label: 'Dar feedbacks de performance', responsibleRole: 'GESTOR' },
      { id: 'st5_strategy', label: 'Oferecer suporte estratégico', responsibleRole: 'GESTOR' },
    ]
  }
];