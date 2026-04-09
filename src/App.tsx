import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MyPapers from "./pages/MyPapers";
import SubmitPaper from "./pages/SubmitPaper";
import PaperDetail from "./pages/PaperDetail";
import Papers from "./pages/Papers";
import Journals from "./pages/Journals";
import Committees from "./pages/Committees";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Users from "./pages/Users";
import Financial from "./pages/Financial";
import Blacklist from "./pages/Blacklist";
import OperationsDashboard from "./pages/OperationsDashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-papers" element={<MyPapers />} />
              <Route path="/submit-paper" element={<SubmitPaper />} />
              <Route path="/papers/:id" element={<PaperDetail />} />
              <Route path="/papers" element={<Papers />} />
              <Route path="/journals" element={<Journals />} />
              <Route path="/committees" element={<Committees />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/users" element={<Users />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/blacklist" element={<Blacklist />} />
              <Route path="/operations" element={<OperationsDashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
