import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnalogClock } from '@/components/AnalogClock';
import { useKoreanKeyboard } from '@/components/KoreanKeyboardProvider';
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  type TimeDifficulty,
  generateTimeQuestion,
  checkTimeAnswer,
  getTimeDifficultyLabel,
} from '@/lib/time';

export const Route = createFileRoute('/time')({
  component: RouteComponent,
});

type AttemptRecord = {
  hour: number;
  minute: number;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
};

type ExerciseState = {
  hour: number;
  minute: number;
  answer: string;
};

function RouteComponent() {
  const [mode, setMode] = useState<'config' | 'exercise' | 'results'>('config');
  const [difficulty, setDifficulty] = useState<TimeDifficulty>('easy');
  const [is24h, setIs24h] = useState(false);
  const keyboard = useKoreanKeyboard();

  // Exercise state
  const [exercise, setExercise] = useState<ExerciseState | null>(null);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const wrongCount = attempts.filter((a) => !a.isCorrect).length;

  // Connect input to global keyboard when in exercise mode
  useEffect(() => {
    if (mode === 'exercise' && feedback === 'idle') {
      keyboard.connect(userInput, setUserInput);
    }
    return () => keyboard.disconnect();
  }, [mode, feedback, userInput, keyboard]);

  const startExercise = () => {
    const q = generateTimeQuestion(difficulty, is24h);
    setExercise({ hour: q.hour, minute: q.minute, answer: q.answer });
    setAttempts([]);
    setUserInput('');
    setFeedback('idle');
    setMode('exercise');
  };

  const submitAnswer = () => {
    if (!exercise || !userInput.trim()) return;

    const isCorrect = checkTimeAnswer(userInput, exercise.answer);
    const record: AttemptRecord = {
      hour: exercise.hour,
      minute: exercise.minute,
      correctAnswer: exercise.answer,
      userAnswer: userInput.trim(),
      isCorrect,
    };

    setAttempts((prev) => [...prev, record]);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // After feedback, generate next question
    setTimeout(() => {
      const q = generateTimeQuestion(difficulty, is24h, { hour: exercise.hour, minute: exercise.minute });
      setExercise({ hour: q.hour, minute: q.minute, answer: q.answer });
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

  const formatTime = (hour: number, minute: number) => {
    return `${hour}:${minute.toString().padStart(2, '0')}`;
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
            difficulty={difficulty}
            is24h={is24h}
            onDifficultyChange={setDifficulty}
            onFormatChange={setIs24h}
            onStart={startExercise}
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
          <ResultsPanel
            attempts={attempts}
            formatTime={formatTime}
            onBack={backToConfig}
            onRestart={startExercise}
          />
        )}
      </main>
    </div>
  );
}

function ConfigPanel(props: {
  difficulty: TimeDifficulty;
  is24h: boolean;
  onDifficultyChange: (d: TimeDifficulty) => void;
  onFormatChange: (is24h: boolean) => void;
  onStart: () => void;
}) {
  const { difficulty, is24h, onDifficultyChange, onFormatChange, onStart } = props;

  return (
    <div className='space-y-8'>
      <div className='text-center space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight'>Korean Time Practice</h1>
        <p className='text-muted-foreground'>Learn to tell time in Korean</p>
      </div>

      <div className='space-y-6'>
        <div className='space-y-3'>
          <label className='text-sm font-medium'>Time Format</label>
          <div className='grid grid-cols-2 gap-2'>
            <Button
              variant={!is24h ? 'default' : 'outline'}
              onClick={() => onFormatChange(false)}
              className='h-12'
            >
              12-hour (1-12)
            </Button>
            <Button
              variant={is24h ? 'default' : 'outline'}
              onClick={() => onFormatChange(true)}
              className='h-12'
            >
              24-hour (0-23)
            </Button>
          </div>
        </div>

        <div className='space-y-3'>
          <label className='text-sm font-medium'>Difficulty</label>
          <div className='grid grid-cols-2 gap-2'>
            {(['easy', 'medium', 'hard', 'expert'] as TimeDifficulty[]).map((d) => (
              <Button
                key={d}
                variant={difficulty === d ? 'default' : 'outline'}
                onClick={() => onDifficultyChange(d)}
                className='h-12'
              >
                {getTimeDifficultyLabel(d)}
              </Button>
            ))}
          </div>
        </div>

        <Button onClick={onStart} size='lg' className='w-full h-14 text-lg'>
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
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <div className='text-sm text-muted-foreground'>What time is it?</div>
          <div className='text-xs text-muted-foreground'>
            Write the time in Korean
          </div>
        </div>
        <div className='flex items-center gap-4 text-sm'>
          <span className='text-green-600 dark:text-green-400 font-medium'>✓ {correctCount}</span>
          <span className='text-red-600 dark:text-red-400 font-medium'>✗ {wrongCount}</span>
        </div>
      </div>

      <div className={`rounded-xl border-2 p-6 sm:p-8 flex justify-center transition-colors ${feedbackClasses}`}>
        <AnalogClock hour={exercise.hour} minute={exercise.minute} size={220} />
      </div>

      {feedback === 'incorrect' && (
        <div className='p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 space-y-2'>
          <div className='text-sm text-red-700 dark:text-red-300'>Incorrect!</div>
          <div className='text-base'>
            <span className='text-muted-foreground'>Correct answer: </span>
            <span className='font-medium text-foreground'>{exercise.answer}</span>
          </div>
          <div className='text-sm text-muted-foreground'>
            Your answer: {userInput}
          </div>
        </div>
      )}

      {feedback === 'correct' && (
        <div className='p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
          <div className='text-center text-green-700 dark:text-green-300 font-medium'>
            ✓ Correct!
          </div>
        </div>
      )}

      {feedback === 'idle' && (
        <div className='space-y-3'>
          <Input
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userInput.trim()) onSubmit();
            }}
            placeholder='예: 세 시 삼십 분'
            autoFocus
            className='text-lg h-12'
          />
          <div className='flex gap-2'>
            <Button className='flex-1' onClick={onSubmit} disabled={!userInput.trim()}>
              Check
            </Button>
            <Button variant='outline' onClick={onEnd}>
              End Exercise
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsPanel(props: {
  attempts: AttemptRecord[];
  formatTime: (hour: number, minute: number) => string;
  onBack: () => void;
  onRestart: () => void;
}) {
  const { attempts, formatTime, onBack, onRestart } = props;

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
                      <div className='font-mono font-medium'>
                        {formatTime(attempt.hour, attempt.minute)}
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

