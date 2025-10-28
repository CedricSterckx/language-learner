import { Button } from '@/components/ui/button';
import { Link, createFileRoute } from '@tanstack/react-router';
import { getUnitsMeta } from '@/lib/vocabulary';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

const vocabularyUnits = getUnitsMeta();

function RouteComponent() {
  return (
    <div className='min-h-dvh grid place-items-center p-6'>
      <div className='text-center space-y-8 max-w-2xl w-full'>
        <div className='space-y-2'>
          <h1 className='text-4xl font-semibold tracking-tight'>Korean Flashcards</h1>
          <p className='text-muted-foreground'>
            Practice your vocabulary with spaced repetition. Select a unit to begin.
          </p>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          {vocabularyUnits.map((unit) => (
            <Link key={unit.id} to='/flashcards' search={{ unit: unit.id }}>
              <Button
                variant='outline'
                className='w-full h-24 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow'
              >
                <div className='text-lg font-medium'>{unit.name}</div>
                <div className='text-sm text-muted-foreground'>{unit.description ?? 'Practice vocabulary'}</div>
              </Button>
            </Link>
          ))}
        </div>

        <div className='text-sm text-muted-foreground'>
          Each unit contains vocabulary cards with Korean-English pairs
        </div>
      </div>
    </div>
  );
}
