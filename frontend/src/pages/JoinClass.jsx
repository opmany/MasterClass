import { useQuery, useMutation } from "@tanstack/react-query";
import { entities } from "@/api/client";
import { useCurrentUser } from "@/hooks/useUserData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function JoinClass() {
  const classId = window.location.pathname.split("/join/")[1];
  const { data: user } = useCurrentUser();
  const [submitted, setSubmitted] = useState(false);

  const { data: classData, isLoading: loadingClass } = useQuery({
    queryKey: ["joinClass", classId],
    queryFn: async () => {
      const classes = await entities.Class.list();
      return classes.find(c => c.id === classId);
    },
    enabled: !!classId,
  });

  const { data: existingMembership } = useQuery({
    queryKey: ["existingMembership", classId, user?.id],
    queryFn: async () => {
      const memberships = await entities.ClassMembership.filter({
        user_id: user.id,
        class_id: classId,
      });
      return memberships[0] || null;
    },
    enabled: !!user?.id && !!classId,
  });

  const joinMutation = useMutation({
    mutationFn: () =>
      entities.ClassMembership.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        class_id: classId,
        role: "student",
        status: "pending",
      }),
    onSuccess: () => setSubmitted(true),
  });

  if (loadingClass) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Class not found.</p>
        <Link to="/" className="text-primary hover:underline text-sm mt-2 inline-block">Go home</Link>
      </div>
    );
  }

  const alreadyMember = existingMembership && existingMembership.status !== "rejected";

  return (
    <div className="max-w-md mx-auto py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{classData.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">by {classData.teacher_name}</p>
            </div>
            {classData.description && (
              <p className="text-sm text-muted-foreground">{classData.description}</p>
            )}

            {submitted || (alreadyMember && existingMembership.status === "pending") ? (
              <div className="space-y-2">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                <p className="font-medium">Request sent!</p>
                <p className="text-sm text-muted-foreground">Waiting for teacher approval.</p>
              </div>
            ) : alreadyMember && existingMembership.status === "approved" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">You're already a member of this class.</p>
                <Link to={`/class/${classId}`}>
                  <Button className="w-full">Go to Class</Button>
                </Link>
              </div>
            ) : (
              <Button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} className="w-full">
                {joinMutation.isPending ? "Sending request..." : "Request to Join"}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}