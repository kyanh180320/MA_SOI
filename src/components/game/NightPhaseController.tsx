import React, { useState } from 'react';
import type { Game, Player, Role, Round } from '../../game/types';
import { isWolfTeam } from '../../game/win';
import {
  Button,
  Panel,
  PlayerTile,
  Modal,
  Toast
} from '../ui';
import { ROLE_CARD_IMAGES } from '../../constants/assets';

export interface NightPhaseControllerProps {
  game: Game;
  alivePlayers: Player[];
  currentRound: Round;
  nightStep: 'guard' | 'wolf' | 'seer' | 'witch' | 'done' | 'wait';
  showRoles: boolean;
  getRoleLabel: (role: Role) => string;
  onGuardProtect: (targetId: string | null) => void;
  onWolfTargets: (targetIds: string[]) => void;
  onSeerCheck: (targetId: string | null) => void;
  onWitchAction: (saveTargetId: string | null, poisonTargetId: string | null) => void;
  onFinishNight: () => void;
}

export const NightPhaseController: React.FC<NightPhaseControllerProps> = ({
  game,
  alivePlayers,
  currentRound,
  nightStep,
  showRoles,
  getRoleLabel,
  onGuardProtect,
  onWolfTargets,
  onSeerCheck,
  onWitchAction,
  onFinishNight
}) => {
  const [selectedGuardTarget, setSelectedGuardTarget] = useState<string | null>(null);
  const [selectedWolfTargets, setSelectedWolfTargets] = useState<string[]>([]);
  const [wolfSelectionWarning, setWolfSelectionWarning] = useState<string | null>(null);
  const [selectedSeerTarget, setSelectedSeerTarget] = useState<string | null>(null);
  const [seerResultModal, setSeerResultModal] = useState<{ targetId: string; name: string; isWolf: boolean } | null>(null);
  const [witchSaveSelection, setWitchSaveSelection] = useState<string | null>(null);
  const [witchPoisonSelection, setWitchPoisonSelection] = useState<string | null>(null);

  const hasRole = (role: Role) => alivePlayers.some(p => p.role === role);

  // 1. LƯỢT BẢO VỆ
  if (nightStep === 'guard') {
    const previousTarget = game.rounds.length > 1 ? game.rounds[game.rounds.length - 2].guardProtectTarget : null;
    const selectedPlayer = selectedGuardTarget ? game.players.find(p => p.id === selectedGuardTarget) : null;

    const toggleGuardSelect = (id: string) => {
      setSelectedGuardTarget(prev => prev === id ? null : id);
    };

    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img 
            src={ROLE_CARD_IMAGES.guard} 
            alt="Bảo Vệ" 
            style={{ 
              width: '46px', 
              height: '69px', 
              borderRadius: '6px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)', 
              border: '1.5px solid var(--green-400)',
              objectFit: 'cover'
            }} 
          />
          <div>
            <h3 style={{
              color: 'var(--green-400)',
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px'
            }}>
              🛡️ BẢO VỆ muốn bảo vệ ai?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Chọn 1 người chơi để khiên chở che đêm nay</span>
          </div>
        </div>
        {!hasRole('guard') && (
          <Toast variant="info" message="Bảo vệ đã chết hoặc không có trong ván, bấm Bỏ qua để giữ nhịp trò chơi." style={{ marginBottom: 'var(--s-3)' }} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {alivePlayers.map(p => {
            const isLocked = p.id === previousTarget && p.id !== 'none';
            const isSelected = selectedGuardTarget === p.id;

            return (
              <PlayerTile
                key={p.id}
                name={p.name}
                avatarUrl={p.avatar}
                role={showRoles ? getRoleLabel(p.role) : undefined}
                badgeLabel={isSelected ? '🛡 Sẽ bảo vệ' : (isLocked ? 'Vòng trước' : undefined)}
                badgeVariant={isSelected ? 'green' : 'ash'}
                isSelected={isSelected}
                isAlive={!isLocked}
                onClick={() => !isLocked && toggleGuardSelect(p.id)}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {selectedGuardTarget ? (
            <Button
              variant="primary"
              pulse
              fullWidth
              onClick={() => {
                onGuardProtect(selectedGuardTarget);
                setSelectedGuardTarget(null);
              }}
            >
              ✓ Xác Nhận Bảo Vệ: {selectedPlayer?.name}
            </Button>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                onGuardProtect(null);
                setSelectedGuardTarget(null);
              }}
            >
              Không bảo vệ ai (Bỏ qua)
            </Button>
          )}

          {selectedGuardTarget && (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setSelectedGuardTarget(null)}
            >
              Bỏ chọn người này
            </Button>
          )}
        </div>
      </Panel>
    );
  }

  // 2. LƯỢT SÓI
  if (nightStep === 'wolf') {
    const aliveWolves = alivePlayers.filter(p => isWolfTeam(p.role));
    const hasDemonWolf = aliveWolves.some(p => p.role === 'wolf_demon');
    const maxTargets = hasDemonWolf ? 2 : 1;
    const isWolfAlive = aliveWolves.length > 0;
    const wolfVotesMap = currentRound?.wolfVotes || {};

    // Kiểm tra đồng thuận giữa các sói thường khi có từ 2 sói trở lên
    const allWolvesVoted = aliveWolves.length > 1 && aliveWolves.every(w => (wolfVotesMap[w.id]?.length || 0) > 0);
    const votedTargetIds = aliveWolves.map(w => wolfVotesMap[w.id]?.[0]).filter(Boolean);
    const isWolfConsensus = allWolvesVoted && votedTargetIds.length === aliveWolves.length && new Set(votedTargetIds).size === 1;
    const hasDisagreement = allWolvesVoted && !isWolfConsensus;

    const toggleWolfTarget = (id: string) => {
      setWolfSelectionWarning(null);
      if (selectedWolfTargets.includes(id)) {
        setSelectedWolfTargets(prev => prev.filter(x => x !== id));
      } else {
        if (hasDemonWolf) {
          if (selectedWolfTargets.length >= 2) {
            setWolfSelectionWarning("⚠️ Có Sói Quỷ chỉ được chọn tối đa 2 người! Bạn đã chọn đủ 2 người rồi, hãy bấm bỏ chọn 1 người trước nếu muốn đổi mục tiêu.");
            return;
          }
          setSelectedWolfTargets(prev => [...prev, id]);
        } else {
          setSelectedWolfTargets([id]);
        }
      }
    };

    const selectedNames = selectedWolfTargets.map(id => game.players.find(p => p.id === id)?.name).filter(Boolean);

    return (
      <Panel variant="danger">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img 
            src={hasDemonWolf ? ROLE_CARD_IMAGES.wolf_demon : ROLE_CARD_IMAGES.wolf} 
            alt="Ma Sói" 
            style={{ 
              width: '46px', 
              height: '69px', 
              borderRadius: '6px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)', 
              border: '1.5px solid var(--red-300)',
              objectFit: 'cover'
            }} 
          />
          <div>
            <h3 style={{
              color: 'var(--red-300)',
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px'
            }}>
              🐺 BẦY SÓI muốn cắn ai?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {hasDemonWolf ? '😈 Sói Quỷ: Cắn tối đa 2 người' : 'Thống nhất chọn con mồi đêm nay'}
            </span>
          </div>
        </div>
        {hasDemonWolf && (
          <Toast
            variant="danger"
            message={`😈 SÓI QUỶ còn sống! Bầy sói được cắn tối đa 2 người (Đã chọn ${selectedWolfTargets.length}/2)`}
            style={{ marginBottom: 'var(--s-3)' }}
          />
        )}
        {wolfSelectionWarning && (
          <Toast
            variant="danger"
            message={wolfSelectionWarning}
            style={{ marginBottom: 'var(--s-3)' }}
          />
        )}
        {!hasDemonWolf && aliveWolves.length > 1 && hasDisagreement && (
          <Toast
            variant="danger"
            message="⚠️ 2 Sói đang chọn khác người! Bắt buộc tất cả sói thường phải thống nhất chọn CÙNG 1 NGƯỜI mới cắn được!"
            style={{ marginBottom: 'var(--s-3)' }}
          />
        )}
        {!hasDemonWolf && aliveWolves.length > 1 && isWolfConsensus && (
          <Toast
            variant="success"
            message={`🎉 Cả bầy sói đã ĐỒNG THUẬN chọn cắn: ${game.players.find(p => p.id === votedTargetIds[0])?.name}!`}
            style={{ marginBottom: 'var(--s-3)' }}
          />
        )}
        {!isWolfAlive && (
          <Toast variant="info" message="Không còn sói sống trong bầy, có thể bỏ qua." style={{ marginBottom: 'var(--s-3)' }} />
        )}

        {/* HIỂN THỊ Ý KIẾN TỪNG SÓI NẾU CÓ NHIỀU SÓI VÀ CHƠI ONLINE */}
        {aliveWolves.length > 1 && !hasDemonWolf && (
          <div style={{
            background: 'rgba(11, 16, 38, 0.7)',
            border: '1px solid rgba(229, 57, 53, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            marginBottom: 'var(--s-3)',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Ý KIẾN CÁC SÓI TRONG BẦY:</span>
            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {aliveWolves.map(w => {
                const targetId = wolfVotesMap[w.id]?.[0];
                const targetPlayer = targetId ? game.players.find(p => p.id === targetId) : null;
                return (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🐺 {w.name}:</span>
                    <strong style={{ color: targetPlayer ? 'var(--red-300)' : 'var(--text-dim)' }}>
                      {targetPlayer ? `👉 ${targetPlayer.name}` : '⏳ Chưa vote'}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {alivePlayers.map(p => {
            const targetIndex = selectedWolfTargets.indexOf(p.id);
            const isTarget = targetIndex !== -1;
            const isWolf = isWolfTeam(p.role);

            return (
              <PlayerTile
                key={p.id}
                name={p.name}
                avatarUrl={p.avatar}
                role={showRoles ? getRoleLabel(p.role) : undefined}
                badgeLabel={isTarget ? `🎯 Cắn ${maxTargets > 1 ? `#${targetIndex + 1}` : ''}` : (isWolf ? 'Phe Sói' : undefined)}
                badgeVariant={isTarget ? 'red' : 'ash'}
                isSelected={isTarget}
                onClick={() => toggleWolfTarget(p.id)}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {selectedWolfTargets.length > 0 ? (
            <Button
              variant="danger"
              pulse
              fullWidth
              disabled={!hasDemonWolf && aliveWolves.length > 1 && hasDisagreement}
              onClick={() => {
                onWolfTargets(selectedWolfTargets);
                setSelectedWolfTargets([]);
              }}
            >
              {!hasDemonWolf && aliveWolves.length > 1 && hasDisagreement
                ? '🔒 Cần cả 2 sói chọn cùng 1 người'
                : `✓ Xác Nhận Cắn: ${selectedNames.join(', ')}`}
            </Button>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                onWolfTargets([]);
                setSelectedWolfTargets([]);
              }}
            >
              Sói không cắn ai (Bỏ qua)
            </Button>
          )}

          {selectedWolfTargets.length > 0 && (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setSelectedWolfTargets([]);
                setWolfSelectionWarning(null);
              }}
            >
              Bỏ qua (Không cắn ai)
            </Button>
          )}
        </div>
      </Panel>
    );
  }

  // 3. LƯỢT TIÊN TRI
  if (nightStep === 'seer') {
    const selectedPlayer = selectedSeerTarget ? game.players.find(p => p.id === selectedSeerTarget) : null;

    const toggleSeerSelect = (id: string) => {
      setSelectedSeerTarget(prev => prev === id ? null : id);
      setSeerResultModal(null);
    };

    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img 
            src={ROLE_CARD_IMAGES.seer} 
            alt="Tiên Tri" 
            style={{ 
              width: '46px', 
              height: '69px', 
              borderRadius: '6px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)', 
              border: '1.5px solid var(--gold-500)',
              objectFit: 'cover'
            }} 
          />
          <div>
            <h3 style={{
              color: 'var(--gold-100)',
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px'
            }}>
              👁️ TIÊN TRI muốn soi ai?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Nhìn thấu thân phận thật sự của 1 người</span>
          </div>
        </div>
        {!hasRole('seer') && (
          <Toast variant="info" message="Tiên tri đã chết hoặc không có, bấm Bỏ qua để giữ nhịp trò chơi." style={{ marginBottom: 'var(--s-3)' }} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {alivePlayers.map(p => {
            const isSelected = selectedSeerTarget === p.id;

            return (
              <PlayerTile
                key={p.id}
                name={p.name}
                avatarUrl={p.avatar}
                role={showRoles ? getRoleLabel(p.role) : undefined}
                badgeLabel={isSelected ? '👁 Sẽ soi' : undefined}
                badgeVariant="gold"
                isSelected={isSelected}
                onClick={() => toggleSeerSelect(p.id)}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {selectedSeerTarget ? (
            <Button
              variant="primary"
              pulse
              fullWidth
              onClick={() => {
                if (selectedPlayer) {
                  setSeerResultModal({
                    targetId: selectedPlayer.id,
                    name: selectedPlayer.name,
                    isWolf: isWolfTeam(selectedPlayer.role)
                  });
                }
              }}
            >
              ✓ Xem Kết Quả Soi: {selectedPlayer?.name}
            </Button>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                onSeerCheck(null);
                setSelectedSeerTarget(null);
              }}
            >
              Bỏ qua (Không soi ai)
            </Button>
          )}

          {selectedSeerTarget && (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setSelectedSeerTarget(null)}
            >
              Bỏ chọn
            </Button>
          )}
        </div>

        {/* MODAL KẾT QUẢ SOI CỦA TIÊN TRI */}
        <Modal
          isOpen={!!seerResultModal}
          onClose={() => setSeerResultModal(null)}
          title="KẾT QUẢ SOI CHO TIÊN TRI"
          footer={
            seerResultModal ? (
              <Button
                variant="primary"
                pulse
                fullWidth
                onClick={() => {
                  onSeerCheck(seerResultModal.targetId);
                  setSeerResultModal(null);
                  setSelectedSeerTarget(null);
                }}
              >
                Xác Nhận & Tiếp Tục ➔
              </Button>
            ) : undefined
          }
        >
          {seerResultModal && (
            <div style={{ textAlign: 'center', padding: 'var(--s-2) 0' }}>
              <p style={{ fontSize: '15px', color: 'var(--text)', margin: '0 0 var(--s-2) 0' }}>
                Người chơi <strong>{seerResultModal.name}</strong>:
              </p>
              <div style={{
                fontSize: '24px',
                fontFamily: 'var(--font-title)',
                fontWeight: 'bold',
                color: seerResultModal.isWolf ? 'var(--red-300)' : 'var(--green-400)',
                letterSpacing: '0.05em',
                margin: 'var(--s-3) 0'
              }}>
                {seerResultModal.isWolf ? '🐺 LÀ SÓI!' : '👨 KHÔNG PHẢI SÓI'}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                Chỉ Quản trò và Tiên Tri biết được bí mật này.
              </p>
            </div>
          )}
        </Modal>
      </Panel>
    );
  }

  // 4. LƯỢT PHÙ THỦY
  if (nightStep === 'witch') {
    const wolfTargetsList = currentRound.wolfTargets 
      ? currentRound.wolfTargets.filter(id => id && id !== 'none') 
      : (currentRound.wolfTarget && currentRound.wolfTarget !== 'none' ? [currentRound.wolfTarget] : []);
    
    const isProtected = (id: string) => currentRound.guardProtectTarget === id;
    const dyingVictimIds = wolfTargetsList.filter(id => !isProtected(id));
    const dyingVictims = dyingVictimIds.map(id => game.players.find(p => p.id === id)).filter(Boolean) as Player[];

    const canSave = game.witchItems.saveLeft > 0 && dyingVictims.length > 0;
    const canPoison = game.witchItems.poisonLeft > 0;

    const poisonPlayer = witchPoisonSelection ? game.players.find(p => p.id === witchPoisonSelection) : null;
    const savePlayer = witchSaveSelection ? game.players.find(p => p.id === witchSaveSelection) : null;

    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img 
            src={ROLE_CARD_IMAGES.witch} 
            alt="Phù Thủy" 
            style={{ 
              width: '46px', 
              height: '69px', 
              borderRadius: '6px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)', 
              border: '1.5px solid var(--purple-400)',
              objectFit: 'cover'
            }} 
          />
          <div>
            <h3 style={{
              color: 'var(--gold-100)',
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px'
            }}>
              🧪 PHÙ THỦY muốn làm gì?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Dùng độc dược hoặc thuốc hồi sinh</span>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          margin: 'var(--s-3) 0',
          padding: 'var(--s-2)',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 'var(--radius-md)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <img src="/assets/icons/icon_potion_heal.webp" alt="Cứu" style={{ width: '22px', height: '22px' }} />
            Bình cứu: <strong style={{ color: 'var(--green-400)' }}>{game.witchItems.saveLeft}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <img src="/assets/icons/icon_potion_poison.webp" alt="Độc" style={{ width: '22px', height: '22px' }} />
            Bình độc: <strong style={{ color: 'var(--red-300)' }}>{game.witchItems.poisonLeft}</strong>
          </span>
        </div>

        {/* Bình cứu */}
        <Panel compact style={{ marginBottom: 'var(--s-3)' }}>
          <h4 style={{ margin: '0 0 var(--s-2) 0', color: 'var(--green-400)', fontSize: '14px' }}>
            💉 BÌNH CỨU (Cứu nạn nhân bị cắn đêm nay)
          </h4>
          {dyingVictims.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Đêm nay bình yên, không ai sắp chết.</p>
          ) : (
            <div>
              <p style={{ fontSize: '13px', margin: '0 0 var(--s-2) 0' }}>
                Nạn nhân sắp chết: <strong style={{ color: 'var(--red-300)' }}>{dyingVictims.map(v => v.name).join(', ')}</strong>
              </p>
              {canSave ? (
                <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                  {dyingVictims.map(v => (
                    <Button
                      key={v.id}
                      variant={witchSaveSelection === v.id ? 'primary' : 'secondary'}
                      onClick={() => setWitchSaveSelection(witchSaveSelection === v.id ? null : v.id)}
                      style={{ minHeight: '40px', padding: '0 var(--s-3)', fontSize: '12px' }}
                    >
                      {witchSaveSelection === v.id ? `✓ Cứu: ${v.name}` : `Cứu ${v.name}`}
                    </Button>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Đã hết bình cứu!</span>
              )}
            </div>
          )}
        </Panel>

        {/* Bình độc */}
        <Panel compact>
          <h4 style={{ margin: '0 0 var(--s-2) 0', color: 'var(--gold-300)', fontSize: '14px' }}>
            ☠️ BÌNH ĐỘC (Có thể đầu độc 1 người bất kỳ)
          </h4>
          {canPoison ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
              {alivePlayers.map(p => {
                const isPoisonTarget = witchPoisonSelection === p.id;
                return (
                  <PlayerTile
                    key={p.id}
                    name={p.name}
                    avatarUrl={p.avatar}
                    role={showRoles ? getRoleLabel(p.role) : undefined}
                    badgeLabel={isPoisonTarget ? '☠️ Đầu độc' : undefined}
                    badgeVariant="red"
                    isSelected={isPoisonTarget}
                    onClick={() => setWitchPoisonSelection(isPoisonTarget ? null : p.id)}
                  />
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>Đã hết bình độc!</p>
          )}
        </Panel>

        {/* Nút xác nhận Phù thủy */}
        <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <Button 
            variant="primary" 
            pulse
            fullWidth
            onClick={() => {
              onWitchAction(witchSaveSelection, witchPoisonSelection);
              setWitchSaveSelection(null);
              setWitchPoisonSelection(null);
            }}
          >
            ✓ Xác Nhận Phù Thủy {savePlayer ? `(Cứu: ${savePlayer.name})` : ''} {poisonPlayer ? `(Độc: ${poisonPlayer.name})` : ''}
          </Button>
          <Button 
            variant="secondary" 
            fullWidth
            onClick={() => {
              onWitchAction(null, null);
              setWitchSaveSelection(null);
              setWitchPoisonSelection(null);
            }}
          >
            Không dùng bình nào (Bỏ qua)
          </Button>
        </div>
      </Panel>
    );
  }

  // 5. KẾT THÚC ĐÊM
  if (nightStep === 'done') {
    return (
      <Panel style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--gold-100)', margin: '0 0 var(--s-2) 0' }}>
          ☀️ Trời Sắp Sáng Rồi
        </h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: 'var(--s-4)' }}>
          Mọi sinh vật bóng đêm đã hoàn tất hành động. Bấm để công bố kết quả đêm qua.
        </p>
        <Button variant="primary" pulse fullWidth onClick={onFinishNight}>
          ĐÁNH THỨC MỌI NGƯỜI ➔
        </Button>
      </Panel>
    );
  }

  return null;
};

export default NightPhaseController;
