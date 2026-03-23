import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useSelectedExam } from "@/hooks/useSelectedExam";
import { MATCHING_GAME_CONFIG } from "@/lib/gameConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GameResults from "@/components/games/GameResults";

const WORDS_PER_ROUND = 3;   // real match words shown per round
const DISTRACTORS = 2;        // extra translation-only distractors shown on right side
const TOTAL_COLS = WORDS_PER_ROUND + DISTRACTORS; // 5 items in translation column

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchingGame() {
  const { selectedExamId } = useSelectedExam();

  const { data: allWords = [] } = useQuery({
    queryKey: ["examWords", selectedExamId],
    queryFn: () => entities.Word.filter({ exam_id: selectedExamId }),
    enabled: !!selectedExamId,
  });

  // Game state
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [allResults, setAllResults] = useState([]);

  // Round state
  const [roundWords, setRoundWords] = useState([]);       // the 3 real words this round
  const [distractorWords, setDistractorWords] = useState([]); // 2 distractor words (translation only)
  const [shuffledTranslations, setShuffledTranslations] = useState([]); // all 5 on right side
  const [matched, setMatched] = useState([]);             // ids matched this round
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedTranslation, setSelectedTranslation] = useState(null);
  const [wrongPair, setWrongPair] = useState(null);       // { wordId, transId } flash red

  // Track which words have been "used" across rounds
  const usedWordIds = useRef(new Set());

  const startGame = () => {
    usedWordIds.current = new Set();
    setAllResults([]);
    setGameOver(false);
    setStarted(true);
    loadNextRound([], allWords);
  };

  const loadNextRound = (currentResults, words) => {
    // Pick words not yet used
    const remaining = words.filter(w => !usedWordIds.current.has(w.id));

    if (remaining.length === 0) {
      // All words done — game over
      setGameOver(true);
      return;
    }

    const roundCount = Math.min(WORDS_PER_ROUND, remaining.length);
    const picked = shuffleArray(remaining).slice(0, roundCount);
    picked.forEach(w => usedWordIds.current.add(w.id));

    // Pick distractor words from the entire pool (not in this round's picked)
    const distractorPool = words.filter(w => !picked.find(p => p.id === w.id));
    const dCount = Math.min(DISTRACTORS, distractorPool.length);
    const dWords = shuffleArray(distractorPool).slice(0, dCount);

    const allTranslations = [
      ...picked.map(w => ({ id: w.id, translation: w.translation, isDistractor: false })),
      ...dWords.map(w => ({ id: w.id + "_d", translation: w.translation, isDistractor: true })),
    ];

    setRoundWords(picked);
    setDistractorWords(dWords);
    setShuffledTranslations(shuffleArray(allTranslations));
    setMatched([]);
    setSelectedWord(null);
    setSelectedTranslation(null);
    setWrongPair(null);
  };

  // Handle pair selection
  useEffect(() => {
    if (!selectedWord || !selectedTranslation) return;

    const correct = selectedWord.id === selectedTranslation.id && !selectedTranslation.isDistractor;

    if (correct) {
      setMatched(prev => [...prev, selectedWord.id]);
      setAllResults(prev => [...prev, {
        word: selectedWord.word,
        correctAnswer: selectedWord.translation,
        userAnswer: selectedTranslation.translation,
        correct: true,
      }]);
      setSelectedWord(null);
      setSelectedTranslation(null);
    } else {
      // Flash wrong
      setWrongPair({ wordId: selectedWord.id, transId: selectedTranslation.id });
      setAllResults(prev => [...prev, {
        word: selectedWord.word,
        correctAnswer: selectedWord.translation,
        userAnswer: selectedTranslation.translation,
        correct: false,
      }]);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedWord(null);
        setSelectedTranslation(null);
      }, 700);
    }
  }, [selectedWord, selectedTranslation]);

  // When all real words in round are matched, load next round
  useEffect(() => {
    if (started && roundWords.length > 0 && matched.length === roundWords.length) {
      setTimeout(() => loadNextRound(allResults, allWords), 500);
    }
  }, [matched, roundWords]);

  if (!selectedExamId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please select an exam first.</p>
        <Link to="/games" className="text-primary hover:underline text-sm mt-2 inline-block">Go to Games</Link>
      </div>
    );
  }

  if (gameOver) {
    return <GameResults results={allResults} onRestart={startGame} gameName="Matching Game" />;
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-violet-50 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold">Matching Game</h1>
        <p className="text-muted-foreground">
          Match English words with their Hebrew translations. {WORDS_PER_ROUND} words per round with {DISTRACTORS} distractor translations — keep going until all {allWords.length} words are done!
        </p>
        <Button onClick={startGame} disabled={allWords.length < 2} size="lg" className="px-8">
          Start Game
        </Button>
        {allWords.length < 2 && (
          <p className="text-sm text-destructive">Not enough words in this exam (need at least 2).</p>
        )}
        <Link to="/games"><Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
      </div>
    );
  }

  const totalWords = allWords.length;
  const completedWords = usedWordIds.current.size - roundWords.filter(w => !matched.includes(w.id)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/games"><Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-xl font-bold">Matching Game</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Zap className="w-3 h-3" />
            {matched.length}/{roundWords.length} this round
          </Badge>
          <Badge variant="outline">{Math.min(usedWordIds.current.size, totalWords)}/{totalWords} total</Badge>
          <Button variant="outline" size="sm" onClick={() => setGameOver(true)} className="gap-1 text-destructive">
            <X className="w-3.5 h-3.5" /> End Game
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: English words */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">English Words</p>
          <AnimatePresence mode="popLayout">
            {roundWords.map((w) => {
              const isMatched = matched.includes(w.id);
              const isSelected = selectedWord?.id === w.id;
              const isWrong = wrongPair?.wordId === w.id;
              return (
                <motion.div
                  key={w.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card
                    className={`cursor-pointer transition-all select-none
                      ${isMatched ? "opacity-25 pointer-events-none bg-green-50 border-green-200" : ""}
                      ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}
                      ${isWrong ? "ring-2 ring-destructive bg-red-50" : ""}
                    `}
                    onClick={() => !isMatched && !wrongPair && setSelectedWord(w)}
                  >
                    <CardContent className="p-4 text-center">
                      <span className="font-medium">{w.word}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Right: Hebrew translations (real + distractors) */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hebrew Translations</p>
          <AnimatePresence mode="popLayout">
            {shuffledTranslations.map((t) => {
              const isMatched = !t.isDistractor && matched.includes(t.id);
              const isSelected = selectedTranslation?.id === t.id;
              const isWrong = wrongPair?.transId === t.id;
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card
                    className={`cursor-pointer transition-all select-none
                      ${isMatched ? "opacity-25 pointer-events-none bg-green-50 border-green-200" : ""}
                      ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}
                      ${isWrong ? "ring-2 ring-destructive bg-red-50" : ""}
                    `}
                    onClick={() => !isMatched && !wrongPair && setSelectedTranslation(t)}
                  >
                    <CardContent className="p-4 text-center" dir="rtl">
                      <span className="font-medium">{t.translation}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}