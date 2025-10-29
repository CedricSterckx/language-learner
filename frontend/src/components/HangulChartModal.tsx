import { Button } from '@/components/ui/button';

export function HangulChartModal(props: { onClose: () => void }) {
  const { onClose } = props;

  // Data derived from the provided chart
  const simpleConsonants: Array<[string, string, string]> = [
    ['ㄱ', 'g / k', 'k'],
    ['ㄴ', 'n', 'n'],
    ['ㄷ', 'd / t', 't'],
    ['ㄹ', 'r / l', 'l'],
    ['ㅁ', 'm', 'm'],
    ['ㅂ', 'b / p', 'p'],
    ['ㅅ', 's / t', 't'],
    ['ㅇ', '- / ng', 'ng'],
    ['ㅈ', 'j / t', 't'],
    ['ㅊ', 'ch / t', 't'],
    ['ㅋ', 'k', 'k'],
    ['ㅌ', 't', 't'],
    ['ㅍ', 'p', 'p'],
    ['ㅎ', 'h / t', 't'],
  ];

  const doubleConsonants: Array<[string, string, string]> = [
    ['ㄲ', 'kk', 'k'],
    ['ㄸ', 'tt', 't'],
    ['ㅃ', 'pp', 'p'],
    ['ㅆ', 'ss', 's'],
    ['ㅉ', 'jj', 'j'],
  ];

  const simpleVowels: Array<[string, string]> = [
    ['ㅏ', 'a'],
    ['ㅑ', 'ya'],
    ['ㅓ', 'eo'],
    ['ㅕ', 'yeo'],
    ['ㅗ', 'o'],
    ['ㅛ', 'yo'],
    ['ㅜ', 'u'],
    ['ㅠ', 'yu'],
    ['ㅡ', 'eu'],
    ['ㅣ', 'i'],
  ];

  const compoundVowels: Array<[string, string]> = [
    ['ㅐ', 'ae'],
    ['ㅒ', 'yae'],
    ['ㅔ', 'e'],
    ['ㅖ', 'ye'],
    ['ㅘ', 'wa'],
    ['ㅙ', 'wae'],
    ['ㅚ', 'oe'],
    ['ㅝ', 'weo'],
    ['ㅞ', 'we'],
    ['ㅟ', 'wi'],
    ['ㅢ', 'ui'],
  ];

  return (
    <div className='fixed inset-0 z-40 px-4 py-6 grid place-items-center' role='dialog' aria-modal='true'>
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className='relative z-10 max-w-3xl w-full rounded-xl border bg-background shadow-xl overflow-hidden'>
        <div className='flex items-center justify-between px-4 py-3 border-b'>
          <div className='font-semibold'>Korean alphabet (Hangul)</div>
          <Button size='sm' variant='outline' onClick={onClose}>
            Close
          </Button>
        </div>
        <div className='max-h-[75vh] overflow-auto p-4 space-y-6 text-sm'>
          <section className='space-y-2'>
            <div className='text-sm font-medium'>14 Simple consonants</div>
            <table className='w-full border-separate border-spacing-y-1'>
              <thead>
                <tr className='text-left text-muted-foreground'>
                  <th className='px-2'>Jamo</th>
                  <th className='px-2'>Romanization</th>
                  <th className='px-2'>Final</th>
                </tr>
              </thead>
              <tbody>
                {simpleConsonants.map(([j, r, f]) => (
                  <tr key={j} className='bg-muted/30'>
                    <td className='px-2 py-1 font-medium text-lg'>{j}</td>
                    <td className='px-2 py-1'>{r}</td>
                    <td className='px-2 py-1'>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className='space-y-2'>
            <div className='text-sm font-medium'>5 Double consonants</div>
            <table className='w-full border-separate border-spacing-y-1'>
              <thead>
                <tr className='text-left text-muted-foreground'>
                  <th className='px-2'>Jamo</th>
                  <th className='px-2'>Romanization</th>
                  <th className='px-2'>Final</th>
                </tr>
              </thead>
              <tbody>
                {doubleConsonants.map(([j, r, f]) => (
                  <tr key={j} className='bg-muted/30'>
                    <td className='px-2 py-1 font-medium text-lg'>{j}</td>
                    <td className='px-2 py-1'>{r}</td>
                    <td className='px-2 py-1'>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className='space-y-2'>
            <div className='text-sm font-medium'>10 Simple vowels</div>
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'>
              {simpleVowels.map(([j, r]) => (
                <div key={j} className='rounded-md border bg-card p-2 flex items-center justify-between'>
                  <span className='text-xl font-medium'>{j}</span>
                  <span className='text-muted-foreground'>{r}</span>
                </div>
              ))}
            </div>
          </section>

          <section className='space-y-2'>
            <div className='text-sm font-medium'>11 Compound vowels</div>
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'>
              {compoundVowels.map(([j, r]) => (
                <div key={j} className='rounded-md border bg-card p-2 flex items-center justify-between'>
                  <span className='text-xl font-medium'>{j}</span>
                  <span className='text-muted-foreground'>{r}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

