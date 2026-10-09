import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCloudGames, getLocalGames } from '../services/gameRepository';
import { useAuth } from '../context/AuthContext';
import type { Game, Player, Role } from '../game/types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>(getLocalGames());
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    getCloudGames(user?.uid).then(setGames);
  }, [user]);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('vi-VN');
  };

  const getRoleTitle = (role: Role) => {
    switch (role) {
      case 'wolf': return 'Sói thường';
      case 'wolf_demon': return 'Sói quỷ';
      case 'seer': return 'Tiên tri';
      case 'witch': return 'Phù thủy';
      case 'guard': return 'Bảo vệ';
      case 'hunter': return 'Thợ săn';
      default: return 'Dân làng';
    }
  };

  const formatPlayer = (id?: string | null, players: Player[] = []) => {
    if (!id || id === 'none') return 'Không ai';
    const p = players.find(x => x.id === id);
    if (!p) return 'Không rõ';
    return `${p.name} (${getRoleTitle(p.role)})`;
  };

  const getPlayersByRole = (role: Role, players: Player[]) => {
    return players.filter(p => p.role === role);
  };

  if (selectedGame) {
    return (
      <div className="container">
        <button className="btn-secondary" style={{ padding: '8px 16px', marginBottom: '16px', width: 'auto' }} onClick={() => setSelectedGame(null)}>
          ← Danh sách lịch sử
        </button>
        <h2>Chi tiết ván chơi</h2>
        <div className="card">
          <p><strong>Thời gian tạo:</strong> {formatDate(selectedGame.createdAt)}</p>
          <p>
            <strong>Kết quả chung cuộc:</strong> Phe {' '}
            <span className={selectedGame.winner === 'wolf' ? 'error' : 'success'} style={{ fontWeight: 'bold' }}>
              {selectedGame.winner === 'wolf' ? 'SÓI 🐺' : selectedGame.winner === 'villager' ? 'DÂN LÀNG 👨' : 'Chưa rõ'}
            </span> chiến thắng
          </p>
          <p><strong>Tổng số người chơi:</strong> {selectedGame.players.length}</p>
        </div>

        {/* Bảng phân vai ban đầu */}
        <div className="card" style={{ marginTop: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary)', textAlign: 'left' }}>
            👥 Phân vai ban đầu ({selectedGame.players.length} người):
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
            {selectedGame.players.map((p, idx) => (
              <div key={p.id} style={{ padding: '8px', background: 'var(--secondary)', borderRadius: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginRight: '4px' }}>#{idx + 1}</span>
                <strong>{p.name}</strong>
                <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px', fontWeight: '500' }}>
                  {getRoleTitle(p.role)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diễn biến từng vòng */}
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ textAlign: 'left', marginBottom: '16px' }}>📜 Diễn biến từng vòng:</h3>
          {selectedGame.rounds.map(round => (
            <div key={round.number} className="card" style={{ marginBottom: '20px', padding: '16px' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '12px' }}>
                Vòng {round.number}
              </h3>
              
              <div style={{ marginBottom: '14px', paddingLeft: '12px', borderLeft: '3px solid #7E57C2' }}>
                <h4 style={{ textAlign: 'left', margin: '0 0 8px 0', color: '#B39DDB' }}>🌙 Ban Đêm:</h4>
                
                {/* 1. Bảo vệ */}
                {round.guardProtectTarget !== undefined && (() => {
                  const guards = getPlayersByRole('guard', selectedGame.players);
                  const guardNames = guards.length > 0 ? guards.map(g => `${g.name} (Bảo vệ)`).join(', ') : 'Bảo vệ';
                  return (
                    <p style={{ margin: '6px 0', fontSize: '14px' }}>
                      🛡 <strong>{guardNames}</strong> {round.guardProtectTarget === 'none' 
                        ? 'chọn không bảo vệ ai' 
                        : <>đã bảo vệ <strong>{formatPlayer(round.guardProtectTarget, selectedGame.players)}</strong></>}
                    </p>
                  );
                })()}

                {/* 2. Bầy sói */}
                {(() => {
                  const wolves = selectedGame.players.filter(p => p.role === 'wolf' || p.role === 'wolf_demon');
                  const wolfNames = wolves.length > 0 
                    ? wolves.map(w => `${w.name} (${w.role === 'wolf_demon' ? 'Sói quỷ' : 'Sói'})`).join(', ') 
                    : 'Bầy sói';

                  const targets = round.wolfTargets && round.wolfTargets.length > 0 
                    ? round.wolfTargets 
                    : (round.wolfTarget ? [round.wolfTarget] : []);
                  
                  const validTargets = targets.filter(t => t && t !== 'none');

                  return (
                    <p style={{ margin: '6px 0', fontSize: '14px' }}>
                      🐺 <strong>Bầy sói ({wolfNames})</strong> {validTargets.length > 0 
                        ? <>đã chọn cắn <strong>{validTargets.map(t => formatPlayer(t, selectedGame.players)).join(', ')}</strong></>
                        : 'không cắn ai'}
                    </p>
                  );
                })()}

                {/* 3. Tiên tri */}
                {round.seerCheck && (() => {
                  const seers = getPlayersByRole('seer', selectedGame.players);
                  const seerNames = seers.length > 0 ? seers.map(s => `${s.name} (Tiên tri)`).join(', ') : 'Tiên tri';
                  if (round.seerCheck.target === 'none') {
                    return <p style={{ margin: '6px 0', fontSize: '14px' }}>👁 <strong>{seerNames}</strong> chọn bỏ qua, không soi ai</p>;
                  }
                  return (
                    <p style={{ margin: '6px 0', fontSize: '14px' }}>
                      👁 <strong>{seerNames}</strong> đã soi <strong>{formatPlayer(round.seerCheck.target, selectedGame.players)}</strong> ➔ Kết quả: <span style={{ color: round.seerCheck.isWolf ? 'var(--error)' : 'var(--success)', fontWeight: 'bold' }}>{round.seerCheck.isWolf ? 'Là Sói 🐺' : 'Không phải Sói 👨'}</span>
                    </p>
                  );
                })()}

                {/* 4. Phù thủy */}
                {(() => {
                  const witches = getPlayersByRole('witch', selectedGame.players);
                  const witchNames = witches.length > 0 ? witches.map(w => `${w.name} (Phù thủy)`).join(', ') : 'Phù thủy';

                  const savedTarget = round.witchSavedTarget || (round.witchSaved && round.wolfTarget ? round.wolfTarget : null);
                  const hasSaved = round.witchSaved || !!round.witchSavedTarget;

                  return (
                    <div style={{ margin: '6px 0', fontSize: '14px' }}>
                      <p style={{ margin: '4px 0' }}>
                        🧪 <strong>{witchNames}</strong>:
                      </p>
                      <ul style={{ margin: '4px 0 4px 20px', padding: 0 }}>
                        <li>
                          Bình cứu: {hasSaved 
                            ? <>Đã dùng bình cứu để cứu <strong>{formatPlayer(savedTarget, selectedGame.players)}</strong></> 
                            : 'Không dùng bình cứu'}
                        </li>
                        <li>
                          Bình độc: {round.witchPoisonTarget && round.witchPoisonTarget !== 'none'
                            ? <>Đã dùng bình độc hạ gục <strong>{formatPlayer(round.witchPoisonTarget, selectedGame.players)}</strong></>
                            : 'Không dùng bình độc'}
                        </li>
                      </ul>
                    </div>
                  );
                })()}
              </div>

              {/* Kết quả sáng ra */}
              <div style={{ marginBottom: '14px', paddingLeft: '12px', borderLeft: '3px solid var(--primary)' }}>
                <h4 style={{ textAlign: 'left', margin: '0 0 6px 0', color: 'var(--primary)' }}>☀️ Kết quả sáng hôm sau:</h4>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  {round.nightDeaths.length > 0 ? (
                    <>Người chết đêm qua: <strong style={{ color: 'var(--error)' }}>{round.nightDeaths.map(id => formatPlayer(id, selectedGame.players)).join(', ')}</strong></>
                  ) : (
                    <span style={{ color: 'var(--success)' }}>Đêm qua bình yên, không có ai chết</span>
                  )}
                </p>

                {/* Thợ săn nổ súng */}
                {round.hunterShotTarget && (() => {
                  const hunters = getPlayersByRole('hunter', selectedGame.players);
                  const hunterNames = hunters.length > 0 ? hunters.map(h => `${h.name} (Thợ săn)`).join(', ') : 'Thợ săn';
                  return (
                    <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--hunter)' }}>
                      🏹 <strong>{hunterNames}</strong> bị hạ gục và nổ súng kéo theo: <strong>{formatPlayer(round.hunterShotTarget, selectedGame.players)}</strong>
                    </p>
                  );
                })()}
              </div>

              {/* Bỏ phiếu biểu quyết ban ngày */}
              {round.vote && (
                <div style={{ paddingLeft: '12px', borderLeft: '3px solid var(--error)' }}>
                  <h4 style={{ textAlign: 'left', margin: '0 0 6px 0', color: 'var(--error)' }}>⚖️ Biểu quyết ban ngày (Treo cổ):</h4>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    {round.vote.eliminated ? (
                      <>Dân làng biểu quyết treo cổ loại: <strong style={{ color: 'var(--error)' }}>{formatPlayer(round.vote.eliminated, selectedGame.players)}</strong></>
                    ) : (
                      'Hòa phiếu hoặc bỏ qua, không ai bị treo cổ'
                    )}
                  </p>
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
        <h2 style={{ margin: 0 }}>Lịch sử ván chơi</h2>
        <button className="btn-secondary" style={{ padding: '8px 16px', width: 'auto' }} onClick={() => navigate('/')}>
          ← Trang chủ
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
              <p>Phe thắng: <strong className={game.winner === 'wolf' ? 'error' : 'success'}>{game.winner === 'wolf' ? 'SÓI 🐺' : 'DÂN LÀNG 👨'}</strong></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
