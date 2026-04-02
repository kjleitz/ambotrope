import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/home.tsx";
import { GamePage } from "@/pages/game.tsx";
import { DebugPanel } from "@/components/DebugPanel.tsx";

export function App() {
  return (
    <BrowserRouter>
      <DebugPanel />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
