import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { getToken } from "@/api/client";

import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import JoinClass from "./pages/JoinClass";
import ExamWords from "./pages/ExamWords";
import ExamEditor from "./pages/ExamEditor";
import Games from "./pages/Games";
import MatchingGame from "./pages/MatchingGame";
import FlashCards from "./pages/FlashCards";
import QuizGame from "./pages/QuizGame";
import Settings from "./pages/Settings";

// Redirect to /login if no token is present
function RequireAuth({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<AuthPage />} />

      {/* Protected */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/class/:id" element={<ClassDetail />} />
        <Route path="/join/:classId" element={<JoinClass />} />
        <Route path="/exam/:id/words" element={<ExamWords />} />
        <Route path="/exam/:id/editor" element={<ExamEditor />} />
        <Route path="/games" element={<Games />} />
        <Route path="/game/matching" element={<MatchingGame />} />
        <Route path="/game/flashcards" element={<FlashCards />} />
        <Route path="/game/quiz" element={<QuizGame />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;