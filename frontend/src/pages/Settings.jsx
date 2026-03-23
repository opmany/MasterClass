import { useState } from "react";
import { useCurrentUser } from "@/hooks/useUserData";
import { auth } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { User, Mail, Shield, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { isModerator } from "@/lib/moderators";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { data: user } = useCurrentUser();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleLogout = () => {
    auth.logout("/login");
  };

  const handleDeleteAccount = async () => {
    // This would typically involve a backend function to delete the user and all their data.
    // For now we log out.
    toast.error("Account deletion requires administrator action. Please contact support.");
    setDeleteConfirmOpen(false);
  };

  if (!user) return null;

  const isMod = isModerator(user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and account</p>
      </motion.div>

      {/* Profile Info */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {(user.full_name || user.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-lg">{user.full_name || "—"}</p>
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">{user.role || "user"}</Badge>
                  {isMod && <Badge className="bg-purple-100 text-purple-700 border-purple-200">Moderator</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Log Out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" /> Log Out
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Account?</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone. Type <strong>DELETE</strong> to confirm.
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='Type "DELETE"'
                  />
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      disabled={confirmText !== "DELETE"}
                      onClick={handleDeleteAccount}
                    >
                      Delete My Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}