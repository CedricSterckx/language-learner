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
      className='fixed bottom-6 right-6 z-40 shadow-xl hover:shadow-2xl transition-all h-14 px-6 text-base font-semibold rounded-full border-2'
    >
      <span className='text-xl mr-2'>⌨️</span>
      <span>{isOpen ? 'Close Keyboard' : 'Korean Keyboard'}</span>
    </Button>
  );
}
