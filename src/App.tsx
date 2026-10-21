import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './components/dialog';
import './index.css';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const SetupPage = React.lazy(() => import('./pages/SetupPage'));
const PlayPage = React.lazy(() => import('./pages/PlayPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RoomPage = React.lazy(() => import('./pages/RoomPage'));
const DevShowcasePage = import.meta.env.DEV
  ? React.lazy(() => import('./pages/DevShowcasePage'))
  : null;
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));

const routeFallback = (
  <div className="screen-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
    <p role="status" style={{ color: 'var(--gold-300)', fontSize: '14px', fontWeight: 600 }}>
      Đang mở màn chơi…
    </p>
  </div>
);

function App() {
  return (
    <DialogProvider>
      <AuthProvider>
        <GameProvider>
          <BrowserRouter>
            <Suspense fallback={routeFallback}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/room/:roomId" element={<RoomPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/play" element={<PlayPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/login" element={<LoginPage />} />
                {import.meta.env.DEV && DevShowcasePage && (
                  <Route path="/dev" element={<DevShowcasePage />} />
                )}
                <Route path="/admin" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </GameProvider>
      </AuthProvider>
    </DialogProvider>
  );
}

export default App;
