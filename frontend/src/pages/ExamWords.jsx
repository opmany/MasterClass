import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ExamWords() {
  const examId = window.location.pathname.split("/exam/")[1]?.split("/")[0];

  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const exams = await entities.Exam.list();
      return exams.find(e => e.id === examId);
    },
    enabled: !!examId,
  });

  const { data: words = [], isLoading } = useQuery({
    queryKey: ["examWords", examId],
    queryFn: () => entities.Word.filter({ exam_id: examId }),
    enabled: !!examId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={exam ? `/class/${exam.class_id}` : "/classes"}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {exam?.name || "Exam Words"}
          </h1>
          <p className="text-muted-foreground text-sm">{words.length} words</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No words in this exam yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {words.map((word, i) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex-1">
                    <p className="font-semibold text-base">{word.word}</p>
                    {word.meaning && (
                      <p className="text-sm text-muted-foreground mt-0.5">{word.meaning}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="self-start sm:self-center text-base font-normal px-3 py-1" dir="rtl">
                    {word.translation || "—"}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}