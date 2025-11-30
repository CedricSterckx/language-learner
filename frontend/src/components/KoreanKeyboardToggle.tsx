import { Button } from '@/components/ui/button';
import { useKoreanKeyboard } from './KoreanKeyboardProvider';

export function KoreanKeyboardToggle() {
  const { isOpen, toggle, isConnected } = useKoreanKeyboard();

  // Only show button when keyboard is connected to an input
  if (!isConnected) {
    return null;
  }

  return (
    <Button
      variant={isOpen ? 'default' : 'secondary'}
      size='lg'
      onClick={toggle}
      className='fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 shadow-xl hover:shadow-2xl transition-all h-11 sm:h-14 px-3 sm:px-6 text-sm sm:text-base font-semibold rounded-full border-2'
    >
      <span className='text-lg sm:text-xl mr-1.5 sm:mr-2'>⌨️</span>
      <span className='sm:hidden'>{isOpen ? 'Close' : '한글'}</span>
      <span className='hidden sm:inline'>{isOpen ? 'Close Keyboard' : 'Korean Keyboard'}</span>
    </Button>
  );
}
