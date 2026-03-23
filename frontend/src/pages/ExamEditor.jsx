import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useCurrentUser } from "@/hooks/useUserData";
import { isModerator } from "@/lib/moderators";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ExcelImportDialog from "@/components/ExcelImportDialog";

export default function ExamEditor() {
  const examId = window.location.pathname.split("/exam/")[1]?.split("/")[0];
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const exams = await entities.Exam.list();
      return exams.find(e => e.id === examId);
    },
    enabled: !!examId,
  });

  const { data: classData } = useQuery({
    queryKey: ["classForExam", exam?.class_id],
    queryFn: async () => {
      const classes = await entities.Class.list();
      return classes.find(c => c.id === exam.class_id);
    },
    enabled: !!exam?.class_id,
  });

  const { data: words = [], isLoading } = useQuery({
    queryKey: ["examWords", examId],
    queryFn: () => entities.Word.filter({ exam_id: examId }),
    enabled: !!examId,
  });

  const canEdit = user && classData && (classData.teacher_id === user.id || isModerator(user));

  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const addWord = useMutation({
    mutationFn: () =>
      entities.Word.create({
        exam_id: examId,
        word: newWord,
        meaning: newMeaning,
        translation: newTranslation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examWords", examId] });
      setNewWord("");
      setNewMeaning("");
      setNewTranslation("");
      toast.success("Word added!");
    },
  });

  const updateWord = useMutation({
    mutationFn: ({ id, data }) => entities.Word.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examWords", examId] });
      toast.success("Word updated!");
    },
  });

  const deleteWord = useMutation({
    mutationFn: (id) => entities.Word.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examWords", examId] });
      toast.success("Word deleted.");
    },
  });

  const handleImportConfirm = async (importedWords) => {
    // Delete all existing words, then bulk create
    for (const w of words) {
      await entities.Word.delete(w.id);
    }
    await entities.Word.bulkCreate(
      importedWords.map(w => ({
        exam_id: examId,
        word: w.word,
        meaning: w.meaning || "",
        translation: w.translation || "",
      }))
    );
    queryClient.invalidateQueries({ queryKey: ["examWords", examId] });
    toast.success(`Imported ${importedWords.length} words!`);
  };

  if (!canEdit && !isLoading) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">You don't have permission to edit this exam.</p>
        <Link to="/classes" className="text-primary hover:underline text-sm mt-2 inline-block">Back to classes</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={exam ? `/class/${exam.class_id}` : "/classes"}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit: {exam?.name || "Exam"}</h1>
            <p className="text-muted-foreground text-sm">{words.length} words</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Import Excel
        </Button>
      </div>

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onConfirm={handleImportConfirm}
      />

      {/* Add new word */}
      <Card className="border-dashed">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Word
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Word</Label>
              <Input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="English word" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Meaning</Label>
              <Input value={newMeaning} onChange={e => setNewMeaning(e.target.value)} placeholder="Definition" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Translation (Hebrew)</Label>
              <Input value={newTranslation} onChange={e => setNewTranslation(e.target.value)} placeholder="תרגום" dir="rtl" />
            </div>
          </div>
          <Button onClick={() => addWord.mutate()} disabled={!newWord.trim() || addWord.isPending} className="gap-2">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {/* Word list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {words.map((word, i) => (
            <WordEditRow key={word.id} word={word} index={i} onUpdate={updateWord} onDelete={deleteWord} />
          ))}
        </div>
      )}
    </div>
  );
}

function WordEditRow({ word, index, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [w, setW] = useState(word.word);
  const [m, setM] = useState(word.meaning || "");
  const [t, setT] = useState(word.translation || "");

  const save = () => {
    onUpdate.mutate({ id: word.id, data: { word: w, meaning: m, translation: t } });
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card>
        <CardContent className="p-4">
          {editing ? (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Input value={w} onChange={e => setW(e.target.value)} placeholder="Word" />
                <Input value={m} onChange={e => setM(e.target.value)} placeholder="Meaning" />
                <Input value={t} onChange={e => setT(e.target.value)} placeholder="Translation" dir="rtl" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save} className="gap-1">
                  <Save className="w-3.5 h-3.5" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
                <span className="font-medium">{word.word}</span>
                <span className="text-sm text-muted-foreground">{word.meaning}</span>
                <span className="text-sm" dir="rtl">{word.translation}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}>
                  <Save className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete.mutate(word.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}