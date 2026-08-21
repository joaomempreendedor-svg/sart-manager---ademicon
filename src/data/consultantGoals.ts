
export interface GoalItem {
  id: string;
  label: string;
}

export interface GoalStage {
  id: string;
  title: string;
  objective: string;
  color: 'blue' | 'green' | 'orange' | 'brown';
  items: GoalItem[];
}

export const CONSULTANT_GOALS: GoalStage[] = [
  {
    id: 'stage_1',
    title: 'DIA 01 A DIA 07 – Integração + Primeiros Passos na Loja',
    objective: 'Objetivo: aprender o básico, configurar ferramentas e iniciar prospecção.',
    color: 'blue',
    items: [
      { id: 'g1_confidentiality', label: 'Assinar o termo de confidencialidade' },
      { id: 'g1_integration', label: 'Realizar a integração com o gestor' },
      { id: 'g1_list', label: 'Criar lista de contatos (mínimo 100 nomes)' },
      { id: 'g1_crm_smi', label: 'Acessar CRM SMI e cadastrar os leads corretamente' },
      { id: 'g1_crm_apollo', label: 'Acessar CRM APOLLO e entender como usar para simulações' },
      { id: 'g1_setup_phone', label: 'Configurar número de prospecção + celular extra (se possível)' },
      { id: 'g1_start_pros', label: 'Iniciar prospecção diária' },
      { id: 'g1_20_contacts', label: 'Fazer 20 contatos/dia (mínimo)' },
      { id: 'g1_schedule_meet', label: 'Marcar a primeira reunião' },
      { id: 'g1_meet_manager', label: 'Realizar a primeira reunião com o gestor' },
      { id: 'g1_send_proposal', label: 'Enviar a primeira proposta junto com o gestor utilizando o modelo' },
      { id: 'g1_feedback', label: 'Feedback com o gestor' },
    ]
  },
  {
    id: 'stage_2',
    title: 'DIA 08 A DIA 15 – Ritmo + Organização de Pipeline',
    objective: 'Objetivo: ganhar ritmo, ajustar scripts, dominar o uso dos CRMs.',
    color: 'green',
    items: [
      { id: 'g2_scripts', label: 'Ajustar mensagens e scripts de abordagem' },
      { id: 'g2_40_contacts', label: 'Fazer 40 contatos/dia (mínimo)' },
      { id: 'g2_4_meetings', label: 'Agendar no mínimo 4 reuniões no período' },
      { id: 'g2_shadow_2', label: 'Realizar 2 reuniões com o gestor acompanhando' },
      { id: 'g2_pipeline', label: 'Registrar todas as ações no pipeline semanal' },
      { id: 'g2_apollo_sim', label: 'Aprender a usar o APOLLO para simulações de crédito' },
      { id: 'g2_feedback', label: 'Feedback com o gestor' },
    ]
  },
  {
    id: 'stage_3',
    title: 'DIA 16 A DIA 30 – Produtividade Assistida + Autonomia Parcial',
    objective: 'Objetivo: entrar em ritmo real de vendas.',
    color: 'orange',
    items: [
      { id: 'g3_60_contacts', label: 'Fazer 60 contatos/dia (mínimo) + lista quente' },
      { id: 'g3_shadow_2', label: 'Realizar 2 reuniões com o gestor acompanhando' },
      { id: 'g3_1_meet_day', label: 'Fazer 1 reunião por dia (alvo ideal)' },
      { id: 'g3_solo_meet', label: 'Conduzir 1 reunião sozinho (avaliada pelo gestor)' },
      { id: 'g3_proposals', label: 'Enviar propostas completas seguindo o modelo' },
      { id: 'g3_pipeline_clean', label: 'Manter pipeline atualizado (zero tarefas atrasadas)' },
      { id: 'g3_agenda', label: 'Organizar agenda semanal de prospecção e reuniões' },
      { id: 'g3_personal_goals', label: 'Criar metas pessoais para o mês seguinte' },
      { id: 'g3_register_actions', label: 'Registrar todas as ações no pipeline semanal' },
      { id: 'g3_bumerang', label: 'Finalizar 100% do Bumerang / UCA (se faltando)' },
      { id: 'g3_feedback', label: 'Feedback com o gestor' },
    ]
  },
  {
    id: 'stage_4',
    title: 'DIA 31 A DIA 60 – Consolidação + Primeira Venda',
    objective: 'Objetivo: assumir mais autonomia, fechar a primeira venda e dominar o processo.',
    color: 'brown',
    items: [
      { id: 'g4_solo_weekly', label: 'Conduzir reuniões sozinho semanalmente' },
      { id: 'g4_first_sale', label: 'Fechar a 1ª venda (meta do período)' },
      { id: 'g4_crm', label: 'Manter CRM totalmente atualizado' },
      { id: 'g4_smi', label: 'Dominar a apresentação da metodologia' },
      { id: 'g4_office', label: 'Manter presença física no escritório' },
      { id: 'g4_register', label: 'Registrar todas as ações no pipeline semanal' },
      { id: 'g4_feedback', label: 'Feedback com o gestor' },
    ]
  },
  {
    id: 'stage_5',
    title: 'DIA 61 A DIA 90 – Preparação para Virar Autorizado Independente',
    objective: 'Objetivo: atingir a produtividade mínima e comprovar consistência.',
    color: 'blue',
    items: [
      { id: 'g5_prod_target', label: 'Atingir produtividade de R$ 1.500.000,00 (meta mínima)' },
      { id: 'g5_30_meetings', label: 'Alcançar 30 reuniões totais realizadas (acumulado)' },
      { id: 'g5_crm_mastery', label: 'Demonstrar domínio do CRM (tarefas, processos e organização)' },
      { id: 'g5_knowledge', label: 'Apresentar conhecimento sólido sobre consórcio e alavancagem' },
      { id: 'g5_consistency', label: 'Provar consistência na rotina de prospecção diária' },
      { id: 'g5_new_goals', label: 'Criar metas para a nova fase como Autorizado' },
      { id: 'g5_soft_skills', label: 'Evoluir em postura, comunicação e abordagem' },
      { id: 'g5_pj', label: 'Ter PJ aberta e ativa' },
      { id: 'g5_feedback', label: 'Feedback com o gestor' },
      { id: 'g5_authorized', label: 'Estar apto ao status: AUTORIZADO INDEPENDENTE' },
    ]
  }
];
