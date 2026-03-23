import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useCurrentUser } from "@/hooks/useUserData";
import { isModerator } from "@/lib/moderators";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Users, BookOpen, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Classes() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
    queryKey: ["allClasses"],
    queryFn: () => entities.Class.list(),
  });

  const studentClassIds = memberships.filter(m => m.role === "student").map(m => m.class_id);
  const teacherClassIds = teachingClasses.map(c => c.id);
  const studentClasses = allClasses.filter(c => studentClassIds.includes(c.id));

  // For moderators, show all classes they're not already part of
  const isMod = user && isModerator(user);
  const modExtraClasses = isMod
    ? allClasses.filter(c => !studentClassIds.includes(c.id) && !teacherClassIds.includes(c.id))
    : [];

  const createClass = useMutation({
    mutationFn: async () => {
      const newClass = await entities.Class.create({
        name,
        teacher_id: user.id,
        teacher_name: user.full_name || user.email,
        description,
      });
      await entities.ClassMembership.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        class_id: newClass.id,
        role: "teacher",
        status: "approved",
      });
      return newClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTeachingClasses"] });
      queryClient.invalidateQueries({ queryKey: ["allClasses"] });
      setOpen(false);
      setName("");
      setDescription("");
      toast.success("Class created successfully!");
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your classes or join new ones</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Class Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Advanced English B2" />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" />
              </div>
              <Button onClick={() => createClass.mutate()} disabled={!name.trim() || createClass.isPending} className="w-full">
                {createClass.isPending ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teachingClasses.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Teaching
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {teachingClasses.map((cls, i) => (
              <ClassCard key={cls.id} cls={cls} role="teacher" index={i} />
            ))}
          </div>
        </section>
      )}

      {studentClasses.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Enrolled
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {studentClasses.map((cls, i) => (
              <ClassCard key={cls.id} cls={cls} role="student" index={i} />
            ))}
          </div>
        </section>
      )}

      {isMod && modExtraClasses.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            All Classes (Moderator)
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {modExtraClasses.map((cls, i) => (
              <ClassCard key={cls.id} cls={cls} role="moderator" index={i} />
            ))}
          </div>
        </section>
      )}

      {teachingClasses.length === 0 && studentClasses.length === 0 && !isMod && (
        <div className="text-center py-16">
          <Users className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No classes yet. Create one or ask a teacher for an invite link.</p>
        </div>
      )}
    </div>
  );
}

function ClassCard({ cls, role, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/class/${cls.id}`}>
        <Card className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{cls.name}</h3>
                {cls.teacher_name && (
                  <p className="text-sm text-muted-foreground mt-0.5">by {cls.teacher_name}</p>
                )}
                {cls.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{cls.description}</p>
                )}
              </div>
              <Badge variant={role === "teacher" ? "default" : role === "moderator" ? "destructive" : "secondary"} className="shrink-0">
                {role}
              </Badge>
            </div>
            <div className="flex items-center justify-end mt-3">
              <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                View class <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}