import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function GameResults({ results, onRestart, gameName }) {
  const correct = results.filter(r => r.correct).length;
  const wrong = results.filter(r => !r.correct).length;
  const total = results.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  const wrongResults = results.filter(r => !r.correct);

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{gameName} Complete!</h1>
        <p className="text-muted-foreground mt-1">Here's how you did:</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <p className="text-5xl font-extrabold text-primary">{percentage}%</p>
              <p className="text-muted-foreground text-sm mt-1">Score</p>
            </div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{correct}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{wrong}</p>
                <p className="text-xs text-muted-foreground">Wrong</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {wrongResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Words to Review ({wrongResults.length})
          </h3>
          <div className="space-y-2">
            {wrongResults.map((r, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{r.word}</p>
                      <p className="text-sm text-muted-foreground">
                        Your answer: <span className="text-destructive" dir="rtl">{r.userAnswer}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Correct: <span className="text-green-600 font-medium" dir="rtl">{r.correctAnswer}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex gap-3 justify-center pt-2">
        <Button onClick={onRestart} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Play Again
        </Button>
        <Link to="/games">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Games
          </Button>
        </Link>
      </div>
    </div>
  );
}