import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useSelectedExam } from "@/hooks/useSelectedExam";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, RotateCcw, Brain, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashCards() {
  const { selectedExamId } = useSelectedExam();

  const { data: allWords = [] } = useQuery({
    queryKey: ["examWords", selectedExamId],
    queryFn: () => entities.Word.filter({ exam_id: selectedExamId }),
    enabled: !!selectedExamId,
  });

  const [started, setStarted] = useState(false);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

  const startGame = () => {
    setCards(shuffleArray(allWords));
    setCurrentIndex(0);
    setFlipped(false);
    setStarted(true);
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setDirection(1);
      setFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const finished = started && currentIndex >= cards.length - 1 && flipped;

  if (!selectedExamId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Please select an exam first.</p>
        <Link to="/games" className="text-primary hover:underline text-sm mt-2 inline-block">Go to Games</Link>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center">
          <Brain className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">Flash Cards</h1>
        <p className="text-muted-foreground">Flip through {allWords.length} cards to study words</p>
        <Button onClick={startGame} disabled={allWords.length === 0} size="lg" className="px-8">
          Start
        </Button>
        <div>
          <Link to="/games"><Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/games"><Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-xl font-bold">Flash Cards</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{currentIndex + 1} / {cards.length}</span>
          <Link to="/games">
            <Button variant="outline" size="sm" className="gap-1 text-destructive">
              <X className="w-3.5 h-3.5" /> End
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Card */}
      <div className="perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.25 }}
          >
            <Card
              className="min-h-[280px] cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setFlipped(!flipped)}
            >
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[280px] text-center">
                <AnimatePresence mode="wait">
                  {!flipped ? (
                    <motion.div
                      key="front"
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">English</p>
                      <p className="text-3xl font-bold">{currentCard.word}</p>
                      {currentCard.meaning && (
                        <p className="text-muted-foreground mt-3 text-sm">{currentCard.meaning}</p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Hebrew</p>
                      <p className="text-3xl font-bold" dir="rtl">{currentCard.translation || "—"}</p>
                      <p className="text-muted-foreground mt-3">{currentCard.word}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-xs text-muted-foreground mt-6">Tap to flip</p>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prevCard} disabled={currentIndex === 0} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Previous
        </Button>
        {currentIndex === cards.length - 1 ? (
          <Button onClick={startGame} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Restart
          </Button>
        ) : (
          <Button onClick={nextCard} className="gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}