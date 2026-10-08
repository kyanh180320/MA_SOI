import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { getRoleDistribution, assignRoles } from '../game/roles';
import { RULES } from '../game/config';
import type { Role } from '../game/types';

export default function SetupPage() {
  const navigate = useNavigate();
  const { setGame } = useGame();
  
  const [playerCountInput, setPlayerCountInput] = useState<string>(String(RULES.minPlayers));
  const playerCount = parseInt(playerCountInput) || 0;
  
  const [names, setNames] = useState<string[]>(Array(RULES.minPlayers).fill(""));
  const [distribution, setDistribution] = useState<Record<Role, number>>({ wolf: 0, seer: 0, witch: 0, guard: 0, villager: 0 });

  // Update default distribution when count changes
  useEffect(() => {
    if (playerCount >= RULES.minPlayers && playerCount <= RULES.maxPlayers) {
      setDistribution(getRoleDistribution(playerCount));
      setNames(prev => {
        const newNames = [...prev];
        if (newNames.length < playerCount) {
          return [...newNames, ...Array(playerCount - newNames.length).fill("")];
        }
        return newNames.slice(0, playerCount);
      });
    }
  }, [playerCount]);

  const totalRoles = Object.values(distribution).reduce((a, b) => a + b, 0);
  const isValid = totalRoles === playerCount && distribution.wolf > 0 && distribution.wolf < playerCount;

  const handleStart = () => {
    if (!isValid) return;

    const players = names.map((name, i) => ({
      id: `p_${Date.now()}_${i}`,
      name: name.trim() || `Người chơi ${i + 1}`,
    }));

    const assignedPlayers = assignRoles(players, distribution);

    setGame({
      id: `game_${Date.now()}`,
      createdAt: Date.now(),
      players: assignedPlayers,
      rounds: [{ number: 1, nightDeaths: [] }],
      phase: "night",
      witchItems: { saveLeft: RULES.witch.saveCount, poisonLeft: RULES.witch.poisonCount }
    });

    navigate('/play');
  };

  const handleRoleChange = (role: Role, delta: number) => {
    setDistribution(prev => ({
      ...prev,
      [role]: Math.max(0, prev[role] + delta)
    }));
  };

  return (
    <div className="container">
      <h1>Thiết lập ván chơi</h1>

      <div className="card">
        <label>
          Số người chơi ({RULES.minPlayers} - {RULES.maxPlayers}):
          <input 
            type="number" 
            min={RULES.minPlayers} 
            max={RULES.maxPlayers} 
            value={playerCountInput}
            onChange={e => setPlayerCountInput(e.target.value)}
            onBlur={() => {
              if (playerCount < RULES.minPlayers) setPlayerCountInput(String(RULES.minPlayers));
              if (playerCount > RULES.maxPlayers) setPlayerCountInput(String(RULES.maxPlayers));
            }}
          />
        </label>
      </div>

      <div className="card">
        <h3>Điều chỉnh vai</h3>
        <p className={totalRoles !== playerCount ? 'error' : 'success'}>
          Đã chia {totalRoles}/{playerCount} vai
        </p>
        <div className="role-grid">
          {(["wolf", "seer", "witch", "guard", "villager"] as Role[]).map(role => (
            <div key={role} className="role-row">
              <span>{role === 'wolf' ? '🐺 Sói' : role === 'seer' ? '👁 Tiên tri' : role === 'witch' ? '🧪 Phù thủy' : role === 'guard' ? '🛡 Bảo vệ' : '👨 Dân làng'}</span>
              <div className="controls">
                <button onClick={() => handleRoleChange(role, -1)}>-</button>
                <span>{distribution[role]}</span>
                <button onClick={() => handleRoleChange(role, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Tên người chơi</h3>
        <div className="player-grid">
          {names.map((name, i) => (
            <div key={i} className="player-square">
              <input
                type="text"
                className="player-input"
                placeholder={`Người ${i + 1}`}
                value={name}
                onChange={e => {
                  const newNames = [...names];
                  newNames[i] = e.target.value;
                  setNames(newNames);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <button className="btn-primary large-btn" disabled={!isValid} onClick={handleStart}>
        Chia Vai & Bắt Đầu
      </button>
    </div>
  );
}
