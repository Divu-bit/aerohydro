import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WaterProvider } from "@/contexts/WaterContext";
import TopNav from "@/components/TopNav";
import Index from "@/pages/Index";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Onboarding from "./pages/Onboarding";
import { getUserId } from "./utils/storage";

const queryClient = new QueryClient();

const AppLayout = () => {
  const hasProfile = !!getUserId();
  const location = useLocation();
  const isOnboarding = location.pathname === "/onboarding";

  return (
    <div className="flex flex-col min-h-screen">
      {!isOnboarding && <TopNav />}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={hasProfile ? <Navigate to="/dashboard" /> : <Navigate to="/onboarding" />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WaterProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </WaterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
