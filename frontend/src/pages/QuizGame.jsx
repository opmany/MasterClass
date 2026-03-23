import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useSelectedExam } from "@/hooks/useSelectedExam";
import { QUIZ_CONFIG } from "@/lib/gameConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, X, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GameResults from "@/components/games/GameResults";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizGame() {
  const { selectedExamId } = useSelectedExam();
  const { questionsPerRound, choicesPerQuestion } = QUIZ_CONFIG;

  const { data: allWords = [] } = useQuery({
    queryKey: ["examWords", selectedExamId],
    queryFn: () => entities.Word.filter({ exam_id: selectedExamId }),
    enabled: !!selectedExamId,
  });

  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const startGame = () => {
    const shuffled = shuffleArray(allWords);
    const qCount = Math.min(questionsPerRound, shuffled.length);
    const qs = shuffled.slice(0, qCount).map((word) => {
      const wrongChoices = shuffleArray(allWords.filter(w => w.id !== word.id))
        .slice(0, choicesPerQuestion - 1)
        .map(w => w.translation);
      const choices = shuffleArray([word.translation, ...wrongChoices]);
      return { word, choices, correctAnswer: word.translation };
    });
    setQuestions(qs);
    setCurrentQ(0);
    setResults([]);
    setSelected(null);
    setShowFeedback(false);
    setGameOver(false);
    setStarted(true);
  };

  const handleAnswer = (choice) => {
    if (showFeedback) return;
    setSelected(choice);
    setShowFeedback(true);
    const q = questions[currentQ];
    const correct = choice === q.correctAnswer;
    setResults(prev => [
      ...prev,
      {
        word: q.word.word,
        correctAnswer: q.correctAnswer,
        userAnswer: choice,
        correct,
      },
    ]);

    setTimeout(() => {
      if (currentQ + 1 >= questions.length) {
        setGameOver(true);
      } else {
        setCurrentQ(prev => prev + 1);
        setSelected(null);
        setShowFeedback(false);
      }
    }, 1200);
  };

  const endEarly = () => {
    setGameOver(true);
  };

  if (!selectedExamId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please select an exam first.</p>
        <Link to="/games" className="text-primary hover:underline text-sm mt-2 inline-block">Go to Games</Link>
      </div>
    );
  }

  if (gameOver) {
    return <GameResults results={results} onRestart={startGame} gameName="Quiz" />;
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold">Multiple Choice Quiz</h1>
        <p className="text-muted-foreground">Answer {Math.min(questionsPerRound, allWords.length)} questions about word translations</p>
        <Button onClick={startGame} disabled={allWords.length < choicesPerQuestion} size="lg" className="px-8">
          Start Quiz
        </Button>
        {allWords.length < choicesPerQuestion && (
          <p className="text-sm text-destructive">Need at least {choicesPerQuestion} words in this exam.</p>
        )}
        <div>
          <Link to="/games"><Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/games"><Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-xl font-bold">Quiz</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{currentQ + 1}/{questions.length}</Badge>
          <Button variant="outline" size="sm" onClick={endEarly} className="gap-1 text-destructive">
            <X className="w-3.5 h-3.5" /> End
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
        >
          <Card className="mb-4">
            <CardContent className="p-8 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">What is the Hebrew translation of:</p>
              <p className="text-3xl font-bold">{q.word.word}</p>
              {q.word.meaning && (
                <p className="text-muted-foreground mt-2 text-sm">{q.word.meaning}</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            {q.choices.map((choice, i) => {
              let variant = "outline";
              let extraClass = "hover:bg-muted/50";
              if (showFeedback) {
                if (choice === q.correctAnswer) {
                  extraClass = "border-green-500 bg-green-50 text-green-700";
                } else if (choice === selected && choice !== q.correctAnswer) {
                  extraClass = "border-destructive bg-red-50 text-destructive";
                } else {
                  extraClass = "opacity-50";
                }
              }
              return (
                <Card
                  key={i}
                  className={`cursor-pointer transition-all ${extraClass} ${showFeedback ? "pointer-events-none" : ""}`}
                  onClick={() => handleAnswer(choice)}
                >
                  <CardContent className="p-4 flex items-center justify-between" dir="rtl">
                    <span className="font-medium text-base">{choice}</span>
                    {showFeedback && choice === q.correctAnswer && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {showFeedback && choice === selected && choice !== q.correctAnswer && <XCircle className="w-5 h-5 text-destructive" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}