import { Button } from '@/components/ui/button';
import { useKoreanKeyboard } from './KoreanKeyboardProvider';

export function KoreanKeyboardToggle() {
  const { isOpen, toggle } = useKoreanKeyboard();

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
