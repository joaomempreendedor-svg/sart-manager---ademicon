export const sanitizeFilename = (filename: string): string => {
  return filename
    .normalize("NFD") // Normalize para decompor caracteres combinados (ex: é -> e + ´)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos (acentos)
    .replace(/[^a-zA-Z0-9.]/g, "-") // Substitui caracteres não alfanuméricos (exceto ponto) por hífen
    .replace(/--+/g, "-") // Substitui múltiplos hífens por um único
    .replace(/^-/, "") // Remove hífen inicial
    .replace(/-\./, ".") // Corrige hífen antes do ponto (ex: arquivo-.png -> arquivo.png)
    .toLowerCase();
};