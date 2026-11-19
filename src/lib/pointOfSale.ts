/**
 * A planilha pode trazer a mesma empresa com grafias diferentes
 * (ex.: "SART INVESTIMENTOS LTDA" e "SART INVESTIMENTOS UNIFIQUE").
 * Este módulo mantém um único nome canônico para cada PV/empresa.
 */

const CANONICAL_NAMES = [
  'KR CONSORCIOS E INVESTIMENTOS LTDA',
  'NEXUS BR LTDA',
  'RVC SOLUCOES E NEGOCIOS LTDA',
  'SART INVESTIMENTOS LTDA',
  'SOLOM INVESTIMENTOS LTDA',
] as const;

const normalizeName = (value: string) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const NAME_ALIASES: Record<string, string> = {
  'kr consorcios': 'KR CONSORCIOS E INVESTIMENTOS LTDA',
  'kr consorcios e investimentos': 'KR CONSORCIOS E INVESTIMENTOS LTDA',
  'nexus br': 'NEXUS BR LTDA',
  'rvc solucoes e negocios': 'RVC SOLUCOES E NEGOCIOS LTDA',
  'sart investimentos': 'SART INVESTIMENTOS LTDA',
  'sart investimentos ltda': 'SART INVESTIMENTOS LTDA',
  'sart investimentos unifique': 'SART INVESTIMENTOS LTDA',
  'sart investimentos ltda unifique': 'SART INVESTIMENTOS LTDA',
  'solom investimentos': 'SOLOM INVESTIMENTOS LTDA',
  'solom investimentos ltda': 'SOLOM INVESTIMENTOS LTDA',
  'solom investimentos unifique': 'SOLOM INVESTIMENTOS LTDA',
  'solom investimentos ltda unifique': 'SOLOM INVESTIMENTOS LTDA',
  'nexus br unifique': 'NEXUS BR LTDA',
  'nexus br ltda unifique': 'NEXUS BR LTDA',
  'kr consorcios e investimentos unifique': 'KR CONSORCIOS E INVESTIMENTOS LTDA',
  'kr consorcios e investimentos ltda unifique': 'KR CONSORCIOS E INVESTIMENTOS LTDA',
  'rvc solucoes e negocios unifique': 'RVC SOLUCOES E NEGOCIOS LTDA',
  'rvc solucoes e negocios ltda unifique': 'RVC SOLUCOES E NEGOCIOS LTDA',
};

/** Retorna o nome único da empresa/PV, sem duplicatas por variação de escrita. */
export const canonicalizePointOfSale = (value?: string): string => {
  const name = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return '';

  const key = normalizeName(name);
  const alias = NAME_ALIASES[key] || NAME_ALIASES[key.replace(/\bunifique\b/g, '').replace(/\s+/g, ' ').trim()];
  if (alias) return alias;

  const canonical = CANONICAL_NAMES.find(
    candidate => normalizeName(candidate) === key || normalizeName(candidate) === key.replace(/\bunifique\b/g, '').replace(/\s+/g, ' ').trim(),
  );
  return canonical || name;
};
