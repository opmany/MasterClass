import { Link } from "react-router-dom";
import { useSelectedExam } from "@/hooks/useSelectedExam";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useCurrentUser } from "@/hooks/useUserData";
import ExamSelector from "@/components/ExamSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Brain, Sparkles, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const games = [
  {
    id: "matching",
    title: "Matching Game",
    description: "Match words to their Hebrew translations against the clock",
    icon: Zap,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-600",
    gradient: "from-violet-500 to-purple-600",
    path: "/game/matching",
  },
  {
    id: "flashcards",
    title: "Flash Cards",
    description: "Flip through cards to memorize words, meanings, and translations",
    icon: Brain,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    gradient: "from-emerald-500 to-teal-600",
    path: "/game/flashcards",
  },
  {
    id: "quiz",
    title: "Multiple Choice Quiz",
    description: "Test yourself with multiple choice questions",
    icon: Sparkles,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    gradient: "from-amber-500 to-orange-600",
    path: "/game/quiz",
  },
];

export default function Games() {
  const { data: user } = useCurrentUser();
  const { selectedClassId, setSelectedClassId, selectedExamId, setSelectedExamId } = useSelectedExam();

  const { data: memberships = [] } = useQuery({
    queryKey: ["myMemberships", user?.id],
    queryFn: () => entities.ClassMembership.filter({ user_id: user.id, status: "approved" }),
    enabled: !!user?.id,
  });

  const { data: teachingClasses = [] } = useQuery({
    queryKey: ["myTeachingClasses", user?.id],
    queryFn: () => entities.Class.filter({ teacher_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ["allClassesForGames", memberships, teachingClasses],
    queryFn: async () => {
      const classIds = [...new Set([...memberships.map(m => m.class_id), ...teachingClasses.map(c => c.id)])];
      if (classIds.length === 0) return [];
      const classes = await entities.Class.list();
      return classes.filter(c => classIds.includes(c.id));
    },
    enabled: memberships.length > 0 || teachingClasses.length > 0,
  });

  const { data: wordCount = 0 } = useQuery({
    queryKey: ["wordCount", selectedExamId],
    queryFn: async () => {
      const words = await entities.Word.filter({ exam_id: selectedExamId });
      return words.length;
    },
    enabled: !!selectedExamId,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Practice Games</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose an exam and start learning</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-5">
          <ExamSelector
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            selectedExamId={selectedExamId}
            setSelectedExamId={setSelectedExamId}
            classes={allClasses}
          />
          {selectedExamId && (
            <p className="text-sm text-muted-foreground mt-3">
              <Badge variant="secondary">{wordCount} words</Badge> available for practice
            </p>
          )}
        </CardContent>
      </Card>

      {!selectedExamId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Select a class and exam to unlock the games.
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              to={selectedExamId ? game.path : "#"}
              className={!selectedExamId ? "pointer-events-none" : ""}
            >
              <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${!selectedExamId ? "opacity-40" : "cursor-pointer"}`}>
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl ${game.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <game.icon className={`w-7 h-7 ${game.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-lg">{game.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">{game.description}</p>
                </CardContent>
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${game.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}