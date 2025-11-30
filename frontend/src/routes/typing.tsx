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
      <main className='flex-1 mx-auto max-w-3xl w-full px-3 sm:px-4 py-4 sm:py-6 md:py-8 flex flex-col'>
        <div className='space-y-1 sm:space-y-2 mb-4 sm:mb-6'>
          <h1 className='text-xl sm:text-2xl font-semibold tracking-tight'>Korean Typing</h1>
          <p className='text-muted-foreground text-xs sm:text-sm'>
            Use the ⌨️ button below to type in Korean
          </p>
        </div>

        <div className='flex-1 flex flex-col min-h-0'>
          <div className='flex items-center justify-between mb-2 gap-2'>
            <div className='text-xs sm:text-sm text-muted-foreground'>
              {charCount} chars • {wordCount} words
            </div>
            <div className='flex gap-1.5 sm:gap-2'>
              <Button variant='outline' size='sm' onClick={handleCopy} disabled={!text} className='h-8 px-2 sm:px-3 text-xs sm:text-sm'>
                Copy
              </Button>
              <Button variant='outline' size='sm' onClick={handleClear} disabled={!text} className='h-8 px-2 sm:px-3 text-xs sm:text-sm'>
                Clear
              </Button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='여기에 한국어를 입력하세요...&#10;(Type Korean here...)'
            className='flex-1 min-h-[200px] sm:min-h-[300px] w-full rounded-lg sm:rounded-xl border border-input bg-card px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none'
            autoFocus
          />

          <div className='mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg bg-muted/50 text-xs sm:text-sm text-muted-foreground'>
            <p className='font-medium mb-1.5 sm:mb-2'>Tips:</p>
            <ul className='list-disc list-inside space-y-0.5 sm:space-y-1'>
              <li>Tap ⌨️ 한글 (bottom right) to type Korean</li>
              <li>Or use a Korean keyboard if installed</li>
            </ul>
          </div>
        </div>

        {/* Extra space for keyboard */}
        {keyboard.isOpen && <div className='h-4' />}
      </main>
    </div>
  );
}

