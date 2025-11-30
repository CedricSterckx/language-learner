import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKoreanKeyboard } from '@/components/KoreanKeyboardProvider';
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  type NumberSystem,
  type Difficulty,
  generateQuestion,
  checkAnswer,
  getDifficultyRange,
} from '@/lib/numbers';

export const Route = createFileRoute('/numbers')({
  component: RouteComponent,
});

type AttemptRecord = {
  number: number;
  system: 'sino' | 'native';
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
};

type ExerciseState = {
  currentNumber: number;
  currentSystem: 'sino' | 'native';
  currentAnswer: string;
};

function RouteComponent() {
  const [mode, setMode] = useState<'config' | 'exercise' | 'results'>('config');
  const [numberSystem, setNumberSystem] = useState<NumberSystem>('sino');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const keyboard = useKoreanKeyboard();

  // Exercise state
  const [exercise, setExercise] = useState<ExerciseState | null>(null);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  // Connect input to global keyboard when in exercise mode
  useEffect(() => {
    if (mode === 'exercise' && feedback === 'idle') {
      keyboard.connect(userInput, setUserInput);
    }
    return () => keyboard.disconnect();
  }, [mode, feedback, userInput, keyboard]);

  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const wrongCount = attempts.filter((a) => !a.isCorrect).length;

  const startExercise = () => {
    const q = generateQuestion(difficulty, numberSystem);
    setExercise({ currentNumber: q.number, currentSystem: q.system, currentAnswer: q.answer });
    setAttempts([]);
    setUserInput('');
    setFeedback('idle');
    setMode('exercise');
  };

  const submitAnswer = () => {
    if (!exercise || !userInput.trim()) return;

    const isCorrect = checkAnswer(userInput, exercise.currentAnswer);
    const record: AttemptRecord = {
      number: exercise.currentNumber,
      system: exercise.currentSystem,
      correctAnswer: exercise.currentAnswer,
      userAnswer: userInput.trim(),
      isCorrect,
    };

    setAttempts((prev) => [...prev, record]);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // After brief feedback, generate next question (avoiding same number)
    setTimeout(() => {
      const q = generateQuestion(difficulty, numberSystem, exercise.currentNumber);
      setExercise({ currentNumber: q.number, currentSystem: q.system, currentAnswer: q.answer });
      setUserInput('');
      setFeedback('idle');
    }, isCorrect ? 500 : 5000);
  };

  const endExercise = () => {
    setMode('results');
  };

  const backToConfig = () => {
    setMode('config');
    setExercise(null);
    setAttempts([]);
    setUserInput('');
    setFeedback('idle');
  };

  const difficultyLabel = (d: Difficulty) => {
    const range = getDifficultyRange(d);
    return `${d.charAt(0).toUpperCase() + d.slice(1)} (${range.min}-${range.max.toLocaleString()})`;
  };

  return (
    <div className='min-h-[calc(100dvh-3rem)] flex flex-col'>
      <main className='flex-1 mx-auto max-w-2xl w-full px-4 py-6 sm:py-8'>
        {mode === 'exercise' && (
          <div className='mb-4 text-center text-sm text-muted-foreground'>
            ✓ {correctCount} | ✗ {wrongCount}
          </div>
        )}

        {mode === 'config' && (
          <ConfigPanel
            numberSystem={numberSystem}
            difficulty={difficulty}
            onSystemChange={setNumberSystem}
            onDifficultyChange={setDifficulty}
            onStart={startExercise}
            difficultyLabel={difficultyLabel}
          />
        )}

        {mode === 'exercise' && exercise && (
          <ExercisePanel
            exercise={exercise}
            userInput={userInput}
            feedback={feedback}
            correctCount={correctCount}
            wrongCount={wrongCount}
            onInputChange={setUserInput}
            onSubmit={submitAnswer}
            onEnd={endExercise}
          />
        )}

        {mode === 'results' && (
          <ResultsPanel attempts={attempts} onBack={backToConfig} onRestart={startExercise} />
        )}
      </main>
    </div>
  );
}

function ConfigPanel(props: {
  numberSystem: NumberSystem;
  difficulty: Difficulty;
  onSystemChange: (s: NumberSystem) => void;
  onDifficultyChange: (d: Difficulty) => void;
  onStart: () => void;
  difficultyLabel: (d: Difficulty) => string;
}) {
  const { numberSystem, difficulty, onSystemChange, onDifficultyChange, onStart, difficultyLabel } = props;

  return (
    <div className='space-y-6 sm:space-y-8'>
      <div className='text-center space-y-2'>
        <h1 className='text-2xl sm:text-3xl font-semibold tracking-tight'>Korean Numbers</h1>
        <p className='text-sm sm:text-base text-muted-foreground'>Practice Sino & Native Korean numbers</p>
      </div>

      <div className='space-y-5 sm:space-y-6'>
        <div className='space-y-2 sm:space-y-3'>
          <label className='text-sm font-medium'>Number System</label>
          <div className='grid grid-cols-3 gap-1.5 sm:gap-2'>
            {(['sino', 'native', 'both'] as NumberSystem[]).map((sys) => (
              <Button
                key={sys}
                variant={numberSystem === sys ? 'default' : 'outline'}
                onClick={() => onSystemChange(sys)}
                className='h-10 sm:h-12 text-xs sm:text-sm px-1 sm:px-3'
              >
                {sys === 'sino' && <><span className='hidden sm:inline'>한자어 </span>Sino</>}
                {sys === 'native' && <><span className='hidden sm:inline'>고유어 </span>Native</>}
                {sys === 'both' && 'Both'}
              </Button>
            ))}
          </div>
          <p className='text-xs text-muted-foreground'>
            {numberSystem === 'sino' && 'Dates, money, phone (0-999,999)'}
            {numberSystem === 'native' && 'Counting, hours, age (1-99)'}
            {numberSystem === 'both' && 'Practice both systems'}
          </p>
        </div>

        <div className='space-y-2 sm:space-y-3'>
          <label className='text-sm font-medium'>Difficulty</label>
          <div className='grid grid-cols-3 gap-1.5 sm:gap-2'>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <Button
                key={d}
                variant={difficulty === d ? 'default' : 'outline'}
                onClick={() => onDifficultyChange(d)}
                className='h-10 sm:h-12 text-xs sm:text-sm px-1 sm:px-3'
              >
                {difficultyLabel(d)}
              </Button>
            ))}
          </div>
          {numberSystem === 'native' && difficulty !== 'easy' && (
            <p className='text-xs text-amber-600 dark:text-amber-400'>
              Native Korean only goes up to 99
            </p>
          )}
        </div>

        <Button onClick={onStart} size='lg' className='w-full h-12 sm:h-14 text-base sm:text-lg'>
          Start Exercise
        </Button>
      </div>
    </div>
  );
}

function ExercisePanel(props: {
  exercise: ExerciseState;
  userInput: string;
  feedback: 'idle' | 'correct' | 'incorrect';
  correctCount: number;
  wrongCount: number;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onEnd: () => void;
}) {
  const { exercise, userInput, feedback, correctCount, wrongCount, onInputChange, onSubmit, onEnd } = props;

  const feedbackClasses =
    feedback === 'correct'
      ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
      : feedback === 'incorrect'
        ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
        : 'border-border bg-card';

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='space-y-0.5'>
          <div className='text-xs sm:text-sm text-muted-foreground'>Write in Korean</div>
          <div className='text-[10px] sm:text-xs text-muted-foreground'>
            {exercise.currentSystem === 'sino' ? 'Sino (한자어)' : 'Native (고유어)'}
          </div>
        </div>
        <div className='flex items-center gap-3 text-sm'>
          <span className='text-green-600 dark:text-green-400 font-medium'>✓{correctCount}</span>
          <span className='text-red-600 dark:text-red-400 font-medium'>✗{wrongCount}</span>
        </div>
      </div>

      <div className={`rounded-xl border-2 p-5 sm:p-8 text-center transition-colors ${feedbackClasses}`}>
        <div className='text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-primary'>
          {exercise.currentNumber.toLocaleString()}
        </div>
        <div className='mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground'>
          {exercise.currentSystem === 'sino' ? 'Sino (한자어)' : 'Native (고유어)'}
        </div>
      </div>

      {feedback === 'incorrect' && (
        <div className='p-3 sm:p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 space-y-1.5 sm:space-y-2'>
          <div className='text-xs sm:text-sm text-red-700 dark:text-red-300'>Incorrect!</div>
          <div className='text-sm sm:text-base'>
            <span className='text-muted-foreground'>Answer: </span>
            <span className='font-medium text-foreground'>{exercise.currentAnswer}</span>
          </div>
          <div className='text-xs sm:text-sm text-muted-foreground'>
            You: {userInput}
          </div>
        </div>
      )}

      {feedback === 'correct' && (
        <div className='p-3 sm:p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
          <div className='text-center text-green-700 dark:text-green-300 font-medium text-sm sm:text-base'>
            ✓ Correct!
          </div>
        </div>
      )}

      {feedback === 'idle' && (
        <div className='space-y-2 sm:space-y-3'>
          <Input
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userInput.trim()) onSubmit();
            }}
            placeholder='Type Korean number...'
            autoFocus
            className='text-base sm:text-lg h-11 sm:h-12'
          />
          <div className='flex gap-2'>
            <Button className='flex-1' onClick={onSubmit} disabled={!userInput.trim()}>
              Check
            </Button>
            <Button variant='outline' onClick={onEnd} className='text-sm'>
              End
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsPanel(props: {
  attempts: AttemptRecord[];
  onBack: () => void;
  onRestart: () => void;
}) {
  const { attempts, onBack, onRestart } = props;

  const correct = attempts.filter((a) => a.isCorrect).length;
  const total = attempts.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className='space-y-6'>
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-semibold'>Exercise Complete!</h2>
        <div className='text-4xl font-bold text-primary'>{percentage}%</div>
        <p className='text-muted-foreground'>
          {correct} correct out of {total} attempts
        </p>
      </div>

      <div className='flex gap-2'>
        <Button onClick={onRestart} className='flex-1'>
          Try Again
        </Button>
        <Button variant='outline' onClick={onBack}>
          Change Settings
        </Button>
      </div>

      {attempts.length > 0 && (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-muted-foreground'>Results</h3>
          <div className='space-y-2 max-h-96 overflow-auto'>
            {attempts.map((attempt, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  attempt.isCorrect
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <span className={`text-lg ${attempt.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {attempt.isCorrect ? '✓' : '✗'}
                    </span>
                    <div>
                      <div className='font-medium'>{attempt.number.toLocaleString()}</div>
                      <div className='text-xs text-muted-foreground'>
                        {attempt.system === 'sino' ? 'Sino-Korean' : 'Native Korean'}
                      </div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='font-medium'>{attempt.correctAnswer}</div>
                    {!attempt.isCorrect && (
                      <div className='text-sm text-red-600 dark:text-red-400'>
                        Your answer: {attempt.userAnswer}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

