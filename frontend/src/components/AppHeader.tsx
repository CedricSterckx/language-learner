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
  const [showRefMenu, setShowRefMenu] = useState(false);
  
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navItems = [
    { path: '/', label: 'Vocab', fullLabel: 'Vocabulary' },
    { path: '/numbers', label: 'Num', fullLabel: 'Numbers' },
    { path: '/time', label: 'Time', fullLabel: 'Time' },
    { path: '/typing', label: 'Type', fullLabel: 'Typing' },
  ];

  return (
    <>
      <header className='sticky top-0 z-30 border-b bg-background/80 backdrop-blur'>
        <div className='mx-auto max-w-4xl px-2 sm:px-4 py-2 flex items-center justify-between gap-1 sm:gap-2'>
          {/* Navigation */}
          <nav className='flex items-center gap-0.5 sm:gap-1 overflow-x-auto'>
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={currentPath === item.path ? 'default' : 'ghost'}
                  size='sm'
                  className='text-xs sm:text-sm px-2 sm:px-3 shrink-0'
                >
                  <span className='sm:hidden'>{item.label}</span>
                  <span className='hidden sm:inline'>{item.fullLabel}</span>
                </Button>
              </Link>
            ))}
          </nav>

          {/* Reference Charts - Desktop */}
          <div className='hidden sm:flex items-center gap-1'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowHangul(true)}
              className='text-xs sm:text-sm'
            >
              📚 Hangul
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowNumbers(true)}
              className='text-xs sm:text-sm'
            >
              🔢 Numbers
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowTime(true)}
              className='text-xs sm:text-sm'
            >
              🕐 Time
            </Button>
          </div>

          {/* Reference Charts - Mobile dropdown */}
          <div className='relative sm:hidden'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowRefMenu(!showRefMenu)}
              className='text-xs px-2'
            >
              📖 Ref
            </Button>
            {showRefMenu && (
              <>
                <div className='fixed inset-0 z-40' onClick={() => setShowRefMenu(false)} />
                <div className='absolute right-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg p-1 min-w-[120px]'>
                  <button
                    onClick={() => { setShowHangul(true); setShowRefMenu(false); }}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-accent rounded'
                  >
                    📚 Hangul
                  </button>
                  <button
                    onClick={() => { setShowNumbers(true); setShowRefMenu(false); }}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-accent rounded'
                  >
                    🔢 Numbers
                  </button>
                  <button
                    onClick={() => { setShowTime(true); setShowRefMenu(false); }}
                    className='w-full text-left px-3 py-2 text-sm hover:bg-accent rounded'
                  >
                    🕐 Time
                  </button>
                </div>
              </>
            )}
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

