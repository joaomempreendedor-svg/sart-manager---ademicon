import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Input } from '@/components/ui/input';

export const formatReais = (value: string | number) => {
  const str = String(value ?? '');
  if (!str.trim() || !/\d/.test(str)) return '';
  const n = Number(str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const maskCurrencyText = (raw: string) => {
  const cleaned = String(raw || '').replace(/[^\d.,]/g, '');
  if (!cleaned) return '';
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx < 0) {
    const digits = cleaned.replace(/\./g, '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const intDigits = cleaned.slice(0, commaIdx).replace(/\./g, '').replace(/\D/g, '');
  const frac = cleaned.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2);
  const grouped = intDigits ? intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '0';
  return `${grouped},${frac}`;
};

export const canonicalToMasked = (value: string) => {
  const s = String(value ?? '').trim();
  if (!s || !/\d/.test(s)) return '';
  const [int, frac] = s.split('.');
  const grouped = (int || '0').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') || '0';
  return frac ? `${grouped},${frac.replace(/\D/g, '').slice(0, 2)}` : grouped;
};

export const maskedToCanonical = (masked: string) => {
  if (!masked) return '';
  const [intRaw, ...rest] = masked.split(',');
  const int = intRaw.replace(/\D/g, '');
  const frac = rest.join(',').replace(/\D/g, '').slice(0, 2);
  if (!int && !frac) return '';
  const n = Number(`${int || '0'}${frac ? `.${frac}` : ''}`);
  return Number.isFinite(n) ? String(n) : '';
};

export const toReaisNumber = (str: string | number) => {
  const s = String(str ?? '').trim();
  if (!s || !/\d/.test(s)) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? n : 0;
};

export const CurrencyInput = ({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  inputRef,
  onEnter,
  id,
  autoFocus,
}: {
  value: string;
  onChange: (canonical: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onEnter?: () => void;
  id?: string;
  autoFocus?: boolean;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const caretRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (draft !== null && maskedToCanonical(draft) !== value) setDraft(null);
  }, [value, draft]);

  return (
    <Input
      id={id}
      autoFocus={autoFocus}
      ref={element => {
        caretRef.current = element;
        if (inputRef) inputRef.current = element;
      }}
      type="text"
      inputMode="decimal"
      value={draft !== null ? `R$ ${draft}` : value ? `R$ ${formatReais(value)}` : ''}
      placeholder={placeholder}
      onFocus={() => setDraft(canonicalToMasked(value || ''))}
      onChange={event => {
        const masked = maskCurrencyText(event.target.value);
        setDraft(masked);
        onChange(maskedToCanonical(masked));
        requestAnimationFrame(() => {
          const el = caretRef.current;
          if (!el) return;
          const end = el.value.length;
          el.setSelectionRange(end, end);
        });
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={event => { if (event.key === 'Enter' && onEnter) onEnter(); }}
      className={className}
    />
  );
};