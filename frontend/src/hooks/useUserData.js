import { useQuery } from "@tanstack/react-query";
import { auth, entities } from "@/api/client";
import { isModerator } from "@/lib/moderators";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => auth.me(),
  });
}

export function useUserClasses(userId) {
  return useQuery({
    queryKey: ["userClasses", userId],
    queryFn: async () => {
      if (!userId) return { memberships: [], teachingClasses: [] };
      const memberships = await entities.ClassMembership.filter({ user_id: userId, status: "approved" });
      const teachingClasses = await entities.Class.filter({ teacher_id: userId });
      return { memberships, teachingClasses };
    },
    enabled: !!userId,
  });
}

export function useIsTeacherOrMod(user, classData) {
  if (isModerator(user)) return true;
  if (!classData || !user?.id) return false;
  return classData.teacher_id === user.id;
}