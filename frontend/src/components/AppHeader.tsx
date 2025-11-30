import { Button } from '@/components/ui/button';
import { Link, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { HangulChartModal } from './HangulChartModal';
import { KoreanNumbersChartModal } from './KoreanNumbersChartModal';
import { KoreanTimeChartModal } from './KoreanTimeChartModal';

export function AppHeader() {
  const [showHangul, setShowHangul] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [showTime, setShowTime] = useState(false);
  
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navItems = [
    { path: '/', label: 'Vocabulary' },
    { path: '/numbers', label: 'Numbers' },
    { path: '/time', label: 'Time' },
  ];

  return (
    <>
      <header className='sticky top-0 z-30 border-b bg-background/80 backdrop-blur'>
        <div className='mx-auto max-w-4xl px-4 py-2 flex items-center justify-between gap-2'>
          {/* Navigation */}
          <nav className='flex items-center gap-1'>
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={currentPath === item.path ? 'default' : 'ghost'}
                  size='sm'
                  className='text-sm'
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Reference Charts */}
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowHangul(true)}
              className='text-xs sm:text-sm'
            >
              <span className='hidden sm:inline'>📚 </span>Hangul
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowNumbers(true)}
              className='text-xs sm:text-sm'
            >
              <span className='hidden sm:inline'>🔢 </span>Numbers
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowTime(true)}
              className='text-xs sm:text-sm'
            >
              <span className='hidden sm:inline'>🕐 </span>Time
            </Button>
          </div>
        </div>
      </header>

      {/* Modals */}
      {showHangul && <HangulChartModal onClose={() => setShowHangul(false)} />}
      {showNumbers && <KoreanNumbersChartModal onClose={() => setShowNumbers(false)} />}
      {showTime && <KoreanTimeChartModal onClose={() => setShowTime(false)} />}
    </>
  );
}

