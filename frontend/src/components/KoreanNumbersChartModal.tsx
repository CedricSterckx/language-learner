import { Button } from '@/components/ui/button';
import { getNumbersChartData } from '@/lib/numbers';

export function KoreanNumbersChartModal(props: { onClose: () => void }) {
  const { onClose } = props;
  const { sinoDigits, sinoPositions, nativeUnits, nativeTens } = getNumbersChartData();

  const sinoDigitEntries = Object.entries(sinoDigits);
  const sinoPositionEntries = Object.entries(sinoPositions);
  const nativeUnitEntries = Object.entries(nativeUnits);
  const nativeTensEntries = Object.entries(nativeTens);

  return (
    <div className='fixed inset-0 z-40 px-4 py-6 grid place-items-center' role='dialog' aria-modal='true'>
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className='relative z-10 max-w-3xl w-full rounded-xl border bg-background shadow-xl overflow-hidden'>
        <div className='flex items-center justify-between px-4 py-3 border-b'>
          <div className='font-semibold'>Korean Numbers (숫자)</div>
          <Button size='sm' variant='outline' onClick={onClose}>
            Close
          </Button>
        </div>
        <div className='max-h-[75vh] overflow-auto p-4 space-y-6 text-sm'>
          {/* Sino-Korean Section */}
          <section className='space-y-4'>
            <div className='text-lg font-semibold text-primary'>Sino-Korean Numbers (한자어 수)</div>
            <p className='text-muted-foreground text-sm'>
              Used for dates, money, phone numbers, addresses, and math.
            </p>
            
            <div className='space-y-2'>
              <div className='text-sm font-medium'>Digits (0-9)</div>
              <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
                {sinoDigitEntries.map(([num, korean]) => (
                  <div key={num} className='rounded-md border bg-card p-3 flex items-center justify-between'>
                    <span className='text-xl font-bold text-primary'>{num}</span>
                    <span className='text-lg font-medium'>{korean}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-medium'>Position Markers</div>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {sinoPositionEntries.map(([num, korean]) => (
                  <div key={num} className='rounded-md border bg-card p-3 flex items-center justify-between'>
                    <span className='text-lg font-bold text-primary'>{Number(num).toLocaleString()}</span>
                    <span className='text-lg font-medium'>{korean}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='p-3 rounded-lg bg-muted/50 space-y-1'>
              <div className='font-medium'>Examples:</div>
              <div className='text-muted-foreground'>
                <div>25 = 이십오 (이 + 십 + 오)</div>
                <div>143 = 백사십삼 (백 + 사 + 십 + 삼)</div>
                <div>2024 = 이천이십사</div>
              </div>
            </div>
          </section>

          {/* Native Korean Section */}
          <section className='space-y-4'>
            <div className='text-lg font-semibold text-primary'>Native Korean Numbers (고유어 수)</div>
            <p className='text-muted-foreground text-sm'>
              Used for counting objects, hours, age. Only goes up to 99.
            </p>

            <div className='space-y-2'>
              <div className='text-sm font-medium'>Units (1-10)</div>
              <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
                {nativeUnitEntries.map(([num, korean]) => (
                  <div key={num} className='rounded-md border bg-card p-3 flex items-center justify-between'>
                    <span className='text-xl font-bold text-primary'>{num}</span>
                    <span className='text-lg font-medium'>{korean}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-medium'>Tens (20-90)</div>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                {nativeTensEntries.map(([num, korean]) => (
                  <div key={num} className='rounded-md border bg-card p-3 flex items-center justify-between'>
                    <span className='text-xl font-bold text-primary'>{num}</span>
                    <span className='text-lg font-medium'>{korean}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='p-3 rounded-lg bg-muted/50 space-y-1'>
              <div className='font-medium'>Examples:</div>
              <div className='text-muted-foreground'>
                <div>15 = 열다섯 (열 + 다섯)</div>
                <div>27 = 스물일곱 (스물 + 일곱)</div>
                <div>99 = 아흔아홉 (아흔 + 아홉)</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

