import { Link } from "react-router-dom";
import { useCurrentUser, useUserClasses } from "@/hooks/useUserData";
import { useSelectedExam } from "@/hooks/useSelectedExam";
import ExamSelector from "@/components/ExamSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain, BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/client";

const games = [
  {
    id: "matching",
    title: "Matching Game",
    description: "Match English words with their Hebrew translations",
    icon: Zap,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
    iconColor: "text-violet-600",
    path: "/game/matching",
  },
  {
    id: "flashcards",
    title: "Flash Cards",
    description: "Flip cards to memorize words and meanings",
    icon: Brain,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    path: "/game/flashcards",
  },
  {
    id: "quiz",
    title: "Multiple Choice",
    description: "Test your knowledge with a multiple choice quiz",
    icon: Sparkles,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    path: "/game/quiz",
  },
];

export default function Home() {
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
    queryKey: ["allClassesForSelector", memberships, teachingClasses],
    queryFn: async () => {
      const classIds = [...new Set([
        ...memberships.map(m => m.class_id),
        ...teachingClasses.map(c => c.id),
      ])];
      if (classIds.length === 0) return [];
      const classes = await entities.Class.list();
      return classes.filter(c => classIds.includes(c.id));
    },
    enabled: memberships.length > 0 || teachingClasses.length > 0,
  });

  const { data: selectedExam } = useQuery({
    queryKey: ["selectedExam", selectedExamId],
    queryFn: async () => {
      const exams = await entities.Exam.list();
      return exams.find(e => e.id === selectedExamId) || null;
    },
    enabled: !!selectedExamId,
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-4 pb-2"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Pick an exam and start practicing</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-dashed">
          <CardContent className="p-6">
            <ExamSelector
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
              selectedExamId={selectedExamId}
              setSelectedExamId={setSelectedExamId}
              classes={allClasses}
            />
            {selectedExam && (
              <div className="mt-4 flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="w-3 h-3" />
                  {selectedExam.name}
                </Badge>
                <span className="text-muted-foreground">{wordCount} words</span>
                <Link
                  to={`/exam/${selectedExamId}/words`}
                  className="text-primary hover:underline ml-auto flex items-center gap-1"
                >
                  View words <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-4">
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <Link
              to={selectedExamId ? game.path : "#"}
              className={!selectedExamId ? "pointer-events-none" : ""}
            >
              <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${!selectedExamId ? "opacity-50" : "cursor-pointer"}`}>
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${game.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <game.icon className={`w-6 h-6 ${game.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-lg">{game.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
                </CardContent>
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {!selectedExamId && (
        <p className="text-center text-muted-foreground text-sm">
          Select an exam above to start playing games
        </p>
      )}

      {allClasses.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8"
        >
          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">You haven't joined any classes yet.</p>
          <Link to="/classes" className="text-primary hover:underline text-sm mt-1 inline-block">
            Browse or create a class →
          </Link>
        </motion.div>
      )}
    </div>
  );
}