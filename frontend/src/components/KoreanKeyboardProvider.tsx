import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { KoreanKeyboard } from './KoreanKeyboard';

type KeyboardContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  // Connect an input to the keyboard
  connect: (value: string, onChange: (v: string) => void) => void;
  disconnect: () => void;
};

const KeyboardContext = createContext<KeyboardContextType | null>(null);

export function useKoreanKeyboard() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) throw new Error('useKoreanKeyboard must be used within KoreanKeyboardProvider');
  return ctx;
}

export function KoreanKeyboardProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputOnChange, setInputOnChange] = useState<((v: string) => void) | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const connect = useCallback((value: string, onChange: (v: string) => void) => {
    setInputValue(value);
    setInputOnChange(() => onChange);
  }, []);

  const disconnect = useCallback(() => {
    setInputOnChange(null);
  }, []);

  const handleChange = useCallback((v: string) => {
    setInputValue(v);
    inputOnChange?.(v);
  }, [inputOnChange]);

  // Sync external value changes
  const value: KeyboardContextType = {
    isOpen,
    open,
    close,
    toggle,
    connect,
    disconnect,
  };

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      {/* Spacer to allow scrolling when keyboard is open */}
      {isOpen && <div className='h-60' />}
      {isOpen && inputOnChange && (
        <KoreanKeyboard
          value={inputValue}
          onChange={handleChange}
          onClose={close}
        />
      )}
    </KeyboardContext.Provider>
  );
}

