// Add moderator user IDs here. These users have access to all classes and can edit everything.
export const MODERATOR_IDS = [
  // Add user IDs here, e.g.:
  // "user_abc123",
  // "user_def456",
];

// Also accepts the user object to check platform admin role
export function isModerator(userIdOrUser) {
  if (!userIdOrUser) return false;
  if (typeof userIdOrUser === "object") {
    return userIdOrUser.role === "admin" || MODERATOR_IDS.includes(userIdOrUser.id);
  }
  return MODERATOR_IDS.includes(userIdOrUser);
}