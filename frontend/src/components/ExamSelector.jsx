import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Layers } from "lucide-react";

export default function ExamSelector({
  selectedClassId,
  setSelectedClassId,
  selectedExamId,
  setSelectedExamId,
  classes = [],
}) {
  const { data: exams = [] } = useQuery({
    queryKey: ["exams", selectedClassId],
    queryFn: () => entities.Exam.filter({ class_id: selectedClassId }),
    enabled: !!selectedClassId,
  });

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Class
        </Label>
        <Select value={selectedClassId || ""} onValueChange={(v) => {
          setSelectedClassId(v);
          setSelectedExamId(null);
        }}>
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          Exam
        </Label>
        <Select
          value={selectedExamId || ""}
          onValueChange={setSelectedExamId}
          disabled={!selectedClassId}
        >
          <SelectTrigger className="bg-card">
            <SelectValue placeholder={selectedClassId ? "Select an exam" : "Pick a class first"} />
          </SelectTrigger>
          <SelectContent>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}