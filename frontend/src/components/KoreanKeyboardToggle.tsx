import { Button } from '@/components/ui/button';
import { useKoreanKeyboard } from './KoreanKeyboardProvider';

export function KoreanKeyboardToggle() {
  const { isOpen, toggle } = useKoreanKeyboard();

  return (
    <Button
      variant={isOpen ? 'default' : 'outline'}
      size='sm'
      onClick={toggle}
      className='fixed bottom-4 right-4 z-40 shadow-lg'
    >
      ⌨️ 한글
    </Button>
  );
}

