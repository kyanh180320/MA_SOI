import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import PlayPage from './pages/PlayPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import RoomPage from './pages/RoomPage';
import { GameProvider } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
