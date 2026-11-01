import * as XLSX from 'xlsx';
import type { Commission, InstallmentInfo } from '@/types';

export const COMMISSION_IMPORT_TAX_RATE = 20;

const DEFAULT_RULES = {
  consultant: { p1_10: 0.001288, p11_13: 0.002374, p15: 0.003 },
  manager: {
    noAngel: { p1_10: 0.000322, p11_13: 0.000593 },
    withAngel: { p1_10: 0.000194, p11_13: 0.000356 },
  },
  angel: { p1_10: 0.0001288, p11_13: 0.0002374 },
};

export type CommissionImportRow = {
  id: string;
  clientName: string;
  date: string;
  type: 'Imóvel' | 'Veículo';
  group: string;
  quota: string;
  pv: string;
  value: string;
  consultant: string;
  manager: string;
  hasAngel: boolean;
  angel: string;
  code: string;
  company: string;
  payment: string;
  contract: string;
};

export const createCommissionImportRowId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `row-${Math.random().toString(36).slice(2)}`;

export const normalizeImportKey = (value: string) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const COLUMN_SYNONYMS: Record<string, string[]> = {
  clientName: ['cliente', 'nome do cliente', 'nome cliente', 'nome', 'clientes', 'nome completo', 'titular'],
  date: ['data', 'data da venda', 'data venda', 'data de venda', 'data do cadastro', 'data cadastro', 'dt venda', 'data do contrato'],
  type: ['tipo', 'tipo de bem', 'tipo bem', 'bem', 'modalidade', 'segmento'],
  group: ['grupo', 'numero do grupo', 'n do grupo', 'codigo do grupo', 'grupo cota'],
  quota: ['cota', 'cota controle', 'controle', 'numero da cota', 'n da cota', 'codigo da cota'],
  pv: ['pv', 'ponto de venda', 'ponto venda', 'pdv', 'loja', 'unidade', 'unidade atual', 'unidade original'],
  value: ['valor', 'valor da venda', 'valor venda', 'valor total', 'valor do credito', 'valor credito', 'valor do bem', 'credito venda', 'credito', 'producao analitica', 'capital'],
  consultant: ['consultor', 'consultora', 'corretor', 'corretora', 'previa', 'autorizado', 'previa autorizado'],
  seller: ['vendedor', 'vendedora', 'matricula', 'matricula vendedor', 'cod vendedor', 'codigo vendedor', 'cod consultor', 'codigo consultor'],
  manager: ['gestor', 'gestora', 'gerente', 'supervisor'],
  angel: ['anjo', 'nome do anjo', 'anjo nome'],
  payment: ['tem pagamento', 'pagamento', 'pago'],
  contract: ['contrato', 'numero do contrato', 'id contrato', 'id bi'],
};

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseImportDate = (raw: unknown): string => {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return toIsoDate(raw);
  if (typeof raw === 'number' && raw > 0) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${m}-${d}`;
    }
  }
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (brMatch) {
    const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
    return `${year}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? '' : toIsoDate(fallback);
};

export const parseImportMoney = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let text = String(raw ?? '').replace(/[R$\s]/gi, '').trim();
  if (!text) return 0;
  const negative = text.startsWith('-');
  text = text.replace(/-/g, '');
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > lastDot) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    if (lastComma >= 0) {
      text = text.replace(/,/g, '');
    } else {
      const parts = text.split('.');
      if (parts.length > 1 && parts.slice(1).every(part => part.length === 3)) {
        text = parts.join('');
      }
    }
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
};

const parseImportType = (raw: unknown): 'Imóvel' | 'Veículo' => {
  const normalized = normalizeImportKey(String(raw ?? ''));
  if (normalized.includes('veic') || normalized.includes('carro') || normalized.includes('moto') || normalized.includes('auto')) return 'Veículo';
  return 'Imóvel';
};

const parseImportAngelFlag = (raw: unknown): boolean => {
  const normalized = normalizeImportKey(String(raw ?? ''));
  if (!normalized) return false;
  if (['nao', 'n', '0', 'false', 'sem anjo', 'nao tem'].includes(normalized)) return false;
  return true;
};

const looksLikeCode = (value: string) => /^0*\d{3,}$/.test(value.trim());
const looksLikeCompany = (value: string) =>
  /\b(ltda|s\.?a\.?|eireli|me|mei|cia|companhia|investimentos|consorcios|consorcio|grupo|holding)\b/i.test(value);
const stripLeadingZeros = (value: string) => {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed.replace(/^0+(?=\d)/, '') : trimmed;
};

const findHeader = (headers: string[], aliases: string[]): string | undefined => {
  for (const alias of aliases) {
    const match = headers.find(header => normalizeImportKey(header) === alias);
    if (match) return match;
  }
  return undefined;
};

export const getCommissionRowIssues = (row: CommissionImportRow): string[] => {
  const issues: string[] = [];
  if (!row.clientName.trim()) issues.push('Cliente');
  if (!row.date) issues.push('Data');
  if (!(parseImportMoney(row.value) > 0)) issues.push('Valor');
  if (!row.consultant.trim()) issues.push('Consultor');
  if (!row.manager.trim()) issues.push('Gestor');
  if (row.hasAngel && !row.angel.trim()) issues.push('Anjo');
  return issues;
};

export const isCommissionRowUnpaid = (row: CommissionImportRow) =>
  ['nao', 'n', '0', 'false'].includes(normalizeImportKey(row.payment));

export const parseCommissionWorkbook = (workbook: XLSX.WorkBook, savedCodeMap: Record<string, string> = {}): CommissionImportRow[] => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
  if (!json.length) return [];
  const headers = Object.keys(json[0] || {});

  const map = {
    clientName: findHeader(headers, COLUMN_SYNONYMS.clientName),
    date: findHeader(headers, COLUMN_SYNONYMS.date),
    type: findHeader(headers, COLUMN_SYNONYMS.type),
    group: findHeader(headers, COLUMN_SYNONYMS.group),
    quota: findHeader(headers, COLUMN_SYNONYMS.quota),
    pv: findHeader(headers, COLUMN_SYNONYMS.pv),
    value: findHeader(headers, COLUMN_SYNONYMS.value),
    consultant: findHeader(headers, COLUMN_SYNONYMS.consultant),
    seller: findHeader(headers, COLUMN_SYNONYMS.seller),
    manager: findHeader(headers, COLUMN_SYNONYMS.manager),
    angel: findHeader(headers, COLUMN_SYNONYMS.angel),
    payment: findHeader(headers, COLUMN_SYNONYMS.payment),
    contract: findHeader(headers, COLUMN_SYNONYMS.contract),
  };

  const compositeHeader = headers.find(header => {
    const key = normalizeImportKey(header);
    if (key !== 'cota' && key !== 'cota cliente') return false;
    const sample = json.find(row => String(row[header] ?? '').trim() !== '')?.[header];
    return typeof sample === 'string' && sample.includes(';');
  });

  return json
    .map(rawRow => {
      let clientName = map.clientName ? String(rawRow[map.clientName] ?? '').trim() : '';
      let groupValue = map.group ? String(rawRow[map.group] ?? '').trim() : '';
      let quotaValue = map.quota ? String(rawRow[map.quota] ?? '').trim() : '';
      let contractValue = map.contract ? String(rawRow[map.contract] ?? '').trim() : '';

      if (compositeHeader) {
        const rawCota = String(rawRow[compositeHeader] ?? '').trim();
        if (rawCota.includes(';')) {
          const parts = rawCota.split(';').map(part => part.trim());
          if (parts[0]) groupValue = stripLeadingZeros(parts[0]);
          if (parts[1]) quotaValue = stripLeadingZeros(parts[1]);
          if (parts[3]) clientName = parts[3];
          if (parts[4]) contractValue = parts[4];
        }
      }

      const sellerValue = map.seller ? String(rawRow[map.seller] ?? '').trim() : '';
      const consultantValue = map.consultant ? String(rawRow[map.consultant] ?? '').trim() : '';
      const companyValue = consultantValue && (looksLikeCompany(consultantValue) || looksLikeCode(consultantValue)) ? consultantValue : '';

      let consultant = '';
      let code = '';
      if (sellerValue) {
        if (looksLikeCode(sellerValue)) code = sellerValue;
        else consultant = sellerValue;
      }
      if (consultantValue && !companyValue) {
        if (looksLikeCode(consultantValue)) {
          if (!code) code = consultantValue;
        } else {
          consultant = consultantValue;
        }
      }
      if (!consultant && code) consultant = savedCodeMap[code] || '';

      const angelValue = map.angel ? String(rawRow[map.angel] ?? '').trim() : '';
      const hasAngel = angelValue ? parseImportAngelFlag(angelValue) : false;

      const payment = map.payment ? String(rawRow[map.payment] ?? '').trim() : '';
      const typeSource = [map.type ? rawRow[map.type] : '', map.pv ? rawRow[map.pv] : ''].join(' ');

      const row: CommissionImportRow = {
        id: createCommissionImportRowId(),
        clientName,
        date: map.date ? parseImportDate(rawRow[map.date]) : '',
        type: parseImportType(typeSource),
        group: groupValue,
        quota: quotaValue,
        pv: map.pv ? String(rawRow[map.pv] ?? '').trim() : '',
        value: map.value ? String(rawRow[map.value] ?? '').trim() : '',
        consultant,
        manager: map.manager ? String(rawRow[map.manager] ?? '').trim() : '',
        hasAngel,
        angel: hasAngel ? (angelValue && !['sim', 's', '1', 'true'].includes(normalizeImportKey(angelValue)) ? angelValue : '') : '',
        code,
        company: companyValue,
        payment,
        contract: contractValue,
      };
      return row;
    })
    .filter(row => {
      const hasIdentity = Boolean(row.clientName.trim() || row.contract.trim() || (row.group.trim() && row.quota.trim()));
      if (!hasIdentity) return false;
      const junk = normalizeImportKey(`${row.clientName} ${row.contract}`);
      if (junk.includes('filtros aplicados') || junk === 'total') return false;
      return true;
    });
};

export const buildCommissionPayload = (row: CommissionImportRow): Omit<Commission, 'id' | 'db_id' | 'criado_em'> => {
  const credit = parseImportMoney(row.value);
  const angel = row.hasAngel && row.angel.trim() ? row.angel.trim() : undefined;
  const taxMultiplier = 1 - COMMISSION_IMPORT_TAX_RATE / 100;
  const manRules = angel ? DEFAULT_RULES.manager.withAngel : DEFAULT_RULES.manager.noAngel;

  const consultantGross = credit * (DEFAULT_RULES.consultant.p1_10 * 10 + DEFAULT_RULES.consultant.p11_13 * 3 + DEFAULT_RULES.consultant.p15);
  const managerGross = credit * (manRules.p1_10 * 10 + manRules.p11_13 * 3);
  const angelGross = angel ? credit * (DEFAULT_RULES.angel.p1_10 * 10 + DEFAULT_RULES.angel.p11_13 * 3) : 0;

  const installmentDetails: Record<string, InstallmentInfo> = {};
  for (let i = 1; i <= 15; i += 1) installmentDetails[i] = { status: 'Pendente' };

  return {
    date: row.date,
    clientName: row.clientName.trim(),
    type: row.type,
    group: row.group.trim(),
    quota: row.quota.trim(),
    consultant: row.consultant.trim(),
    managerName: row.manager.trim() || 'N/A',
    angelName: angel,
    pv: row.pv.trim() || 'Não informado',
    value: credit,
    taxRate: COMMISSION_IMPORT_TAX_RATE,
    netValue: (consultantGross + managerGross + angelGross) * taxMultiplier,
    installments: 15,
    status: 'Em Andamento',
    installmentDetails,
    consultantValue: consultantGross,
    managerValue: managerGross,
    angelValue: angelGross,
    receivedValue: 0,
  };
};
