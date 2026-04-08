import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/home.tsx";
import { GamePage } from "@/pages/game.tsx";
import { BlotterPage } from "@/pages/blotter.tsx";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/blotter" element={<BlotterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
