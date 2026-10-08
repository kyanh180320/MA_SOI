import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocalGames } from '../services/gameRepository';
import type { Game, Player } from '../game/types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    setGames(getLocalGames());
  }, []);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('vi-VN');
  };

  const getName = (id: string, players: Player[]) => {
    if (id === 'none') return 'Không ai';
    const p = players.find(x => x.id === id);
    if (!p) return 'Không rõ';
    return `${p.name} (${p.role === 'wolf' ? 'Sói' : p.role === 'seer' ? 'Tiên tri' : p.role === 'witch' ? 'Phù thủy' : p.role === 'guard' ? 'Bảo vệ' : 'Dân'})`;
  };

  if (selectedGame) {
    return (
      <div className="container">
        <button className="btn-primary" style={{ padding: '8px', marginBottom: '16px', background: '#555' }} onClick={() => setSelectedGame(null)}>
          ← Quay lại
        </button>
        <h2>Chi tiết ván chơi</h2>
        <p><strong>Thời gian:</strong> {formatDate(selectedGame.createdAt)}</p>
        <p>
          <strong>Kết quả:</strong> Phe {' '}
          <span className={selectedGame.winner === 'wolf' ? 'error' : 'success'}>
            {selectedGame.winner === 'wolf' ? 'SÓI' : selectedGame.winner === 'villager' ? 'DÂN LÀNG' : 'Chưa rõ'}
          </span> thắng
        </p>
        <p><strong>Số người:</strong> {selectedGame.players.length}</p>

        <div style={{ marginTop: '24px' }}>
          {selectedGame.rounds.map(round => (
            <div key={round.number} className="card" style={{ marginBottom: '16px' }}>
              <h3>Vòng {round.number}</h3>
              
              <div style={{ marginBottom: '12px', paddingLeft: '12px', borderLeft: '3px solid #555' }}>
                <h4>🌙 Ban Đêm:</h4>
                {round.guardProtectTarget !== undefined && (
                  <p>- Bảo vệ bảo vệ: {getName(round.guardProtectTarget, selectedGame.players)}</p>
                )}
                <p>- Sói cắn: {round.wolfTarget ? getName(round.wolfTarget, selectedGame.players) : 'Chưa có dữ liệu'}</p>
                {round.seerCheck && (
                  <p>- Tiên tri soi: {getName(round.seerCheck.target, selectedGame.players)} ({round.seerCheck.isWolf ? 'Là Sói' : 'Không phải Sói'})</p>
                )}
                {round.witchSaved !== undefined && (
                  <p>- Phù thủy cứu: {round.witchSaved ? 'Có' : 'Không'}</p>
                )}
                {round.witchPoisonTarget && (
                  <p>- Phù thủy độc: {getName(round.witchPoisonTarget, selectedGame.players)}</p>
                )}
              </div>

              <div style={{ marginBottom: '12px', paddingLeft: '12px', borderLeft: '3px solid var(--primary)' }}>
                <h4>☀️ Sáng ra:</h4>
                <p>
                  Người chết: {round.nightDeaths.length > 0 
                    ? round.nightDeaths.map(id => getName(id, selectedGame.players)).join(', ') 
                    : 'Bình yên, không ai chết'}
                </p>
              </div>

              {round.vote && (
                <div style={{ paddingLeft: '12px', borderLeft: '3px solid var(--error)' }}>
                  <h4>⚖️ Bỏ phiếu (Treo cổ):</h4>
                  <p>Người bị loại: {round.vote.eliminated ? getName(round.vote.eliminated, selectedGame.players) : 'Hòa / Bỏ qua'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Lịch sử ván chơi</h2>
        <button className="btn-primary" style={{ padding: '8px 16px', background: '#333' }} onClick={() => navigate('/')}>
          Trang chủ
        </button>
      </div>

      {games.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>Chưa có ván chơi nào được lưu.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {games.map(game => (
            <div 
              key={game.id} 
              className="card" 
              style={{ cursor: 'pointer', borderLeft: `4px solid ${game.winner === 'wolf' ? 'var(--error)' : 'var(--success)'}` }}
              onClick={() => setSelectedGame(game)}
            >
              <h3>{formatDate(game.createdAt)}</h3>
              <p>Số người: {game.players.length}</p>
              <p>Phe thắng: <strong className={game.winner === 'wolf' ? 'error' : 'success'}>{game.winner === 'wolf' ? 'SÓI' : 'DÂN LÀNG'}</strong></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
