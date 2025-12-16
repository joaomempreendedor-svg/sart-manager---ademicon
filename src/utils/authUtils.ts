export const formatCpf = (value: string): string => {
  if (!value) return '';
  value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
  value = value.replace(/(\d{3})(\d)/, '$1.$2'); // Adiciona ponto após o 3º dígito
  value = value.replace(/(\d{3})(\d)/, '$1.$2'); // Adiciona ponto após o 6º dígito
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); // Adiciona hífen após o 9º dígito
  return value;
};

export const generateRandomPassword = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};