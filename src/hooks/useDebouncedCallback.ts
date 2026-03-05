import { useEffect, useRef, useMemo, useCallback } from 'react';

export function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  wait: number
) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const argsRef = useRef<A>();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const debounced = useMemo(() => {
    const func = (...args: A) => {
      argsRef.current = args;
      cleanup();
      timeoutRef.current = setTimeout(() => {
        if (argsRef.current) {
          callbackRef.current(...argsRef.current);
        }
      }, wait);
    };

    func.flush = () => {
      cleanup();
      if (argsRef.current) {
        callbackRef.current(...argsRef.current);
      }
    };

    return func;
  }, [wait, cleanup]);

  return debounced;
}