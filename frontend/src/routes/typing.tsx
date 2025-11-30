import { Button } from '@/components/ui/button';
import { useKoreanKeyboard } from '@/components/KoreanKeyboardProvider';
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';

export const Route = createFileRoute('/typing')({
  component: RouteComponent,
});

function RouteComponent() {
  const [text, setText] = useState('');
  const keyboard = useKoreanKeyboard();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Connect textarea to global keyboard
  useEffect(() => {
    keyboard.connect(text, setText);
    return () => keyboard.disconnect();
  }, [text, keyboard]);

  const handleClear = () => {
    setText('');
    textareaRef.current?.focus();
  };

  const handleCopy = async () => {
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className='min-h-[calc(100dvh-3rem)] flex flex-col'>
      <main className='flex-1 mx-auto max-w-3xl w-full px-4 py-6 sm:py-8 flex flex-col'>
        <div className='space-y-2 mb-6'>
          <h1 className='text-2xl font-semibold tracking-tight'>Korean Typing Practice</h1>
          <p className='text-muted-foreground text-sm'>
            Practice typing in Korean. Use the keyboard button (bottom right) to type.
          </p>
        </div>

        <div className='flex-1 flex flex-col min-h-0'>
          <div className='flex items-center justify-between mb-2'>
            <div className='text-sm text-muted-foreground'>
              {charCount} characters • {wordCount} words
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={handleCopy} disabled={!text}>
                Copy
              </Button>
              <Button variant='outline' size='sm' onClick={handleClear} disabled={!text}>
                Clear
              </Button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='여기에 한국어를 입력하세요...&#10;(Type Korean here...)'
            className='flex-1 min-h-[300px] w-full rounded-xl border border-input bg-card px-4 py-3 text-lg shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none'
            autoFocus
          />

          <div className='mt-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground'>
            <p className='font-medium mb-2'>Tips:</p>
            <ul className='list-disc list-inside space-y-1'>
              <li>Click the ⌨️ 한글 button (bottom right) to open the Korean keyboard</li>
              <li>You can also type directly if you have a Korean keyboard installed</li>
              <li>Practice writing sentences, words, or just get familiar with Hangul</li>
            </ul>
          </div>
        </div>

        {/* Extra space for keyboard */}
        {keyboard.isOpen && <div className='h-4' />}
      </main>
    </div>
  );
}

