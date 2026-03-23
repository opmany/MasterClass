import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useCurrentUser } from "@/hooks/useUserData";
import { isModerator } from "@/lib/moderators";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { Users, BookOpen, Crown, Link2, Plus, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ClassDetail() {
  const classId = new URLSearchParams(window.location.search).get("id") || window.location.pathname.split("/class/")[1];
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [newExamName, setNewExamName] = useState("");
  const [examDialogOpen, setExamDialogOpen] = useState(false);

  const { data: classData } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const classes = await entities.Class.list();
      return classes.find(c => c.id === classId);
    },
    enabled: !!classId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["classMembers", classId],
    queryFn: () => entities.ClassMembership.filter({ class_id: classId }),
    enabled: !!classId,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["classExams", classId],
    queryFn: () => entities.Exam.filter({ class_id: classId }),
    enabled: !!classId,
  });

  const isTeacher = user && classData && classData.teacher_id === user.id;
  const isMod = user && isModerator(user);
  const canManage = isTeacher || isMod;

  const approvedMembers = members.filter(m => m.status === "approved");
  const pendingMembers = members.filter(m => m.status === "pending");

  const approveMember = useMutation({
    mutationFn: (member) => entities.ClassMembership.update(member.id, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classMembers", classId] });
      toast.success("Student approved!");
    },
  });

  const rejectMember = useMutation({
    mutationFn: (member) => entities.ClassMembership.update(member.id, { status: "rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classMembers", classId] });
      toast.success("Request rejected.");
    },
  });

  const createExam = useMutation({
    mutationFn: () => entities.Exam.create({ name: newExamName, class_id: classId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classExams", classId] });
      setNewExamName("");
      setExamDialogOpen(false);
      toast.success("Exam created!");
    },
  });

  const deleteExam = useMutation({
    mutationFn: (examId) => entities.Exam.delete(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classExams", classId] });
      toast.success("Exam deleted.");
    },
  });

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${classId}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  if (!classData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{classData.name}</h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Teacher: {classData.teacher_name || "Unknown"}
            </p>
          </div>
          {canManage && (
            <Button variant="outline" onClick={copyInviteLink} className="gap-2 shrink-0">
              <Link2 className="w-4 h-4" />
              Copy Invite Link
            </Button>
          )}
        </div>
        {classData.description && (
          <p className="text-muted-foreground mt-3">{classData.description}</p>
        )}
      </motion.div>

      {/* Pending requests */}
      {canManage && pendingMembers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pending Requests ({pendingMembers.length})
          </h2>
          <div className="space-y-2">
            {pendingMembers.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{m.user_name || m.user_email}</p>
                    <p className="text-xs text-muted-foreground">{m.user_email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => approveMember.mutate(m)}>
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => rejectMember.mutate(m)}>
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Exams */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Exams ({exams.length})
          </h2>
          {canManage && (
            <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Exam
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Exam</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Exam Name</Label>
                    <Input value={newExamName} onChange={e => setNewExamName(e.target.value)} placeholder="e.g. Unit 3 Vocabulary" />
                  </div>
                  <Button onClick={() => createExam.mutate()} disabled={!newExamName.trim()} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="group">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <Link to={`/exam/${exam.id}/words`} className="font-medium hover:text-primary transition-colors">
                    {exam.name}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <Link to={`/exam/${exam.id}/editor`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteExam.mutate(exam.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {exams.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-2">No exams yet.</p>
          )}
        </div>
      </section>

      {/* Members */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Members ({approvedMembers.length})
        </h2>
        <div className="space-y-2">
          {approvedMembers.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {(m.user_name || m.user_email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.user_name || m.user_email}</p>
                    <p className="text-xs text-muted-foreground">{m.user_email}</p>
                  </div>
                </div>
                <Badge variant={m.role === "teacher" ? "default" : "secondary"}>{m.role}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}