import { Button } from '@/components/ui/button';
import { getTimeChartData } from '@/lib/time';

export function KoreanTimeChartModal(props: { onClose: () => void }) {
  const { onClose } = props;
  const { hours12 } = getTimeChartData();

  const hourEntries = Object.entries(hours12).map(([num, korean]) => ({
    num: Number(num),
    korean,
  }));

  return (
    <div className='fixed inset-0 z-40 px-4 py-6 grid place-items-center' role='dialog' aria-modal='true'>
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className='relative z-10 max-w-2xl w-full rounded-xl border bg-background shadow-xl overflow-hidden'>
        <div className='flex items-center justify-between px-4 py-3 border-b'>
          <div className='font-semibold'>Korean Time (시간)</div>
          <Button size='sm' variant='outline' onClick={onClose}>
            Close
          </Button>
        </div>
        <div className='max-h-[75vh] overflow-auto p-4 space-y-6 text-sm'>
          {/* Time Format Explanation */}
          <section className='p-4 rounded-lg bg-primary/10 space-y-2'>
            <div className='font-semibold text-primary'>Time Format</div>
            <div className='text-foreground'>
              <span className='font-medium'>[hour]</span> 시{' '}
              <span className='font-medium'>[minute]</span> 분
            </div>
            <div className='text-muted-foreground text-xs'>
              Hours use Native Korean numbers, minutes use Sino-Korean numbers
            </div>
          </section>

          {/* Hours (1-12) */}
          <section className='space-y-3'>
            <div className='text-base font-semibold'>Hours (시)</div>
            <p className='text-muted-foreground text-xs'>
              Native Korean numbers (shortened forms)
            </p>
            <div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
              {hourEntries.map(({ num, korean }) => (
                <div
                  key={num}
                  className='rounded-lg border bg-card p-3 flex items-center justify-between'
                >
                  <span className='text-lg font-bold text-primary'>{num}시</span>
                  <span className='text-base font-medium'>{korean} 시</span>
                </div>
              ))}
            </div>
          </section>

          {/* 24h Format Note */}
          <section className='space-y-3'>
            <div className='text-base font-semibold'>24-Hour Format</div>
            <p className='text-muted-foreground text-xs'>
              For hours 13-23, continue with Native Korean numbers
            </p>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {[
                { num: 0, korean: '영 시', note: 'midnight' },
                { num: 13, korean: '열세 시', note: '1 PM' },
                { num: 15, korean: '열다섯 시', note: '3 PM' },
                { num: 18, korean: '열여덟 시', note: '6 PM' },
                { num: 20, korean: '스무 시', note: '8 PM' },
                { num: 23, korean: '스물세 시', note: '11 PM' },
              ].map(({ num, korean, note }) => (
                <div
                  key={num}
                  className='rounded-lg border bg-card p-2 text-center'
                >
                  <div className='font-bold text-primary'>{num}:00</div>
                  <div className='text-sm font-medium'>{korean}</div>
                  <div className='text-xs text-muted-foreground'>{note}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Minutes */}
          <section className='space-y-3'>
            <div className='text-base font-semibold'>Minutes (분)</div>
            <p className='text-muted-foreground text-xs'>
              Use Sino-Korean numbers (same as counting money, dates)
            </p>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {[
                { num: 5, korean: '오 분' },
                { num: 10, korean: '십 분' },
                { num: 15, korean: '십오 분' },
                { num: 30, korean: '삼십 분' },
                { num: 45, korean: '사십오 분' },
                { num: 59, korean: '오십구 분' },
              ].map(({ num, korean }) => (
                <div
                  key={num}
                  className='rounded-lg border bg-card p-2 flex items-center justify-between'
                >
                  <span className='font-bold text-primary'>:{num.toString().padStart(2, '0')}</span>
                  <span className='text-sm font-medium'>{korean}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Examples */}
          <section className='space-y-3'>
            <div className='text-base font-semibold'>Examples</div>
            <div className='space-y-2'>
              {[
                { time: '3:00', korean: '세 시' },
                { time: '7:30', korean: '일곱 시 삼십 분' },
                { time: '10:15', korean: '열 시 십오 분' },
                { time: '12:45', korean: '열두 시 사십오 분' },
                { time: '15:20', korean: '열다섯 시 이십 분', note: '(24h)' },
              ].map(({ time, korean, note }) => (
                <div
                  key={time}
                  className='flex items-center gap-3 p-2 rounded border bg-muted/30'
                >
                  <span className='font-mono font-bold text-primary w-14'>{time}</span>
                  <span className='font-medium'>{korean}</span>
                  {note && <span className='text-xs text-muted-foreground'>{note}</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

