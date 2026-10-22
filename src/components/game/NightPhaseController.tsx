import React, { useState } from 'react';
import type { Game, NightRoleStep, Player, Role, Round } from '../../game/types';
import { getWolfTargetLimit, hasLivingNightRole, type NightStep } from '../../game/night';
import { isWolfAligned } from '../../game/win';
import { getWolfLeaderId } from '../../game/wolfLeadership';
import {
  Button,
  Panel,
  PlayerTile,
  Modal,
  Toast
} from '../ui';
import { ROLE_CARD_IMAGES } from '../../constants/assets';
import {
  createDetectiveCheck,
  getDetectiveTargetLimit,
  isDetectiveLockedForRound,
} from '../../game/detective';
import { createWolfSeerCheck } from '../../game/wolfSeer';

export interface NightPhaseControllerProps {
  game: Game;
  alivePlayers: Player[];
  currentRound: Round;
  nightStep: NightStep;
  showRoles: boolean;
  getRoleLabel: (role: Role) => string;
  onGuardProtect: (targetId: string | null) => void;
  onHalfWolfAcknowledge: (playerId: string) => void;
  onWolfTargets: (targetIds: string[]) => void;
  onWolfSeerCheck: (wolfSeerId: string, targetId: string) => void;
  onSeerCheck: (targetId: string | null) => void;
  onDetectiveCheck: (detectiveId: string, targetIds: string[], locked?: boolean) => void;
  onWitchAction: (saveTargetId: string | null, poisonTargetId: string | null) => void;
  onHunterTarget: (hunterId: string, targetId: string | null) => void;
  onSkipDeadRole: (step: NightRoleStep) => void;
  onFinishNight: () => void;
}

const DEAD_ROLE_COPY: Record<NightRoleStep, {
  label: string;
  callInstruction: string;
  accent: string;
}> = {
  guard: {
    label: 'BẢO VỆ',
    callInstruction: '“Bảo Vệ thức dậy và chọn người muốn bảo vệ.”',
    accent: 'var(--green-400)',
  },
  half_wolf: {
    label: 'BÁN SÓI',
    callInstruction: '“Bán Sói thức dậy, kiểm tra điện thoại rồi đi ngủ.”',
    accent: 'var(--gold-300)',
  },
  wolf: {
    label: 'BẦY SÓI',
    callInstruction: '“Bầy Sói thức dậy và chọn người muốn cắn.”',
    accent: 'var(--red-300)',
  },
  wolf_seer: {
    label: 'SÓI TIÊN TRI',
    callInstruction: '“Sói Tiên Tri thức dậy và chọn người muốn soi chức năng.”',
    accent: 'var(--purple-400)',
  },
  seer: {
    label: 'TIÊN TRI',
    callInstruction: '“Tiên Tri thức dậy và chọn người muốn soi.”',
    accent: 'var(--gold-100)',
  },
  detective: {
    label: 'THÁM TỬ',
    callInstruction: '“Thám Tử thức dậy và chọn ba người muốn điều tra.”',
    accent: 'var(--gold-300)',
  },
  witch: {
    label: 'PHÙ THỦY',
    callInstruction: '“Phù Thủy thức dậy và quyết định có dùng bình hay không.”',
    accent: 'var(--purple-400)',
  },
  hunter: {
    label: 'THỢ SĂN',
    callInstruction: '“Thợ Săn thức dậy và chọn người muốn chết cùng.”',
    accent: 'var(--gold-100)',
  },
};

export const NightPhaseController: React.FC<NightPhaseControllerProps> = ({
  game,
  alivePlayers,
  currentRound,
  nightStep,
  showRoles,
  getRoleLabel,
  onGuardProtect,
  onHalfWolfAcknowledge,
  onWolfTargets,
  onWolfSeerCheck,
  onSeerCheck,
  onDetectiveCheck,
  onWitchAction,
  onHunterTarget,
  onSkipDeadRole,
  onFinishNight
}) => {
  const [selectedGuardTarget, setSelectedGuardTarget] = useState<string | null>(null);
  const [wolfSelectionDraft, setWolfSelectionDraft] = useState<{
    scope: string;
    targetIds: string[];
  } | null>(null);
  const [selectedWolfSeerTarget, setSelectedWolfSeerTarget] = useState<string | null>(null);
  const [wolfSeerResult, setWolfSeerResult] = useState<{
    wolfSeerId: string;
    targetId: string;
    hasAbility: boolean;
  } | null>(null);
  const [selectedSeerTarget, setSelectedSeerTarget] = useState<string | null>(null);
  const [seerResultModal, setSeerResultModal] = useState<{ targetId: string; name: string; isWolf: boolean } | null>(null);
  const [selectedDetectiveTargets, setSelectedDetectiveTargets] = useState<string[]>([]);
  const [detectiveResult, setDetectiveResult] = useState<boolean | null>(null);
  const [witchSaveSelection, setWitchSaveSelection] = useState<string | null>(null);
  const [witchPoisonSelection, setWitchPoisonSelection] = useState<string | null>(null);
  const [selectedHunterChoice, setSelectedHunterChoice] = useState<{ hunterId: string; targetId: string } | null>(null);

  if (nightStep !== 'done' && nightStep !== 'wait' && !hasLivingNightRole(game.players, nightStep)) {
    const roleCopy = DEAD_ROLE_COPY[nightStep];

    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img
            src={ROLE_CARD_IMAGES[nightStep]}
            alt={roleCopy.label}
            style={{
              width: '46px',
              height: '69px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              border: `1.5px solid ${roleCopy.accent}`,
              objectFit: 'cover',
            }}
          />
          <div>
            <h3 style={{
              color: roleCopy.accent,
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px',
            }}>
              {roleCopy.label} KHÔNG CÒN SỐNG
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Chỉ Quản trò thấy thông báo này
            </span>
          </div>
        </div>

        <Toast
          variant="info"
          message={`Để không lộ vai, vẫn đọc ${roleCopy.callInstruction} Chờ một nhịp như bình thường rồi mới tiếp tục.`}
          style={{ marginBottom: 'var(--s-3)' }}
        />
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 var(--s-3)' }}>
          Không nói role này đã chết. Người chơi đã chết sẽ không có nút chọn hay hành động nào trên máy của họ.
        </p>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => onSkipDeadRole(nightStep)}
        >
          ĐÃ GỌI {roleCopy.label} — TIẾP TỤC ➔
        </Button>
      </Panel>
    );
  }

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
                badgeLabel={isSelected ? '🛡 Sẽ bảo vệ' : (isLocked ? '🔒 Vòng trước' : undefined)}
                badgeVariant={isSelected ? 'green' : 'ash'}
                isSelected={isSelected}
                disabled={isLocked}
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
  if (nightStep === 'half_wolf') {
    const aliveHalfWolves = alivePlayers.filter(player => player.role === 'half_wolf');
    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img
            src={ROLE_CARD_IMAGES.half_wolf}
            alt="Bán Sói"
            style={{ width: '46px', height: '69px', borderRadius: '6px', objectFit: 'cover', border: '1.5px solid var(--gold-300)' }}
          />
          <div>
            <h3 style={{ color: 'var(--gold-300)', fontFamily: 'var(--font-title)', margin: '0 0 4px', fontSize: '18px' }}>
              🌗 BÁN SÓI KIỂM TRA ĐIỆN THOẠI
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Đọc: “Bán Sói thức dậy, kiểm tra điện thoại rồi đi ngủ.”
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {aliveHalfWolves.map(player => {
            const acknowledged = currentRound.halfWolfAcknowledgements?.includes(player.id) ?? false;
            return (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)', padding: '10px 12px', border: '1px solid rgba(201, 162, 74, 0.35)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <strong>{player.name}</strong>
                  <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '2px' }}>
                    {acknowledged ? '✓ Đã kiểm tra và đi ngủ' : 'Đang chờ xác nhận trên điện thoại'}
                  </div>
                </div>
                <Button
                  variant={acknowledged ? 'ghost' : 'secondary'}
                  disabled={acknowledged}
                  onClick={() => onHalfWolfAcknowledge(player.id)}
                >
                  {acknowledged ? 'ĐÃ XONG' : 'XÁC NHẬN HỘ'}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>
    );
  }

  if (nightStep === 'wolf') {
    const aliveWolves = alivePlayers.filter(isWolfAligned);
    const hasDemonWolf = aliveWolves.some(p => p.role === 'wolf_demon');
    const maxTargets = getWolfTargetLimit(game.players);
    const wolfVotesMap = currentRound?.wolfVotes || {};
    const wolfLeaderId = getWolfLeaderId(game.players, game.wolfLeadershipOrder);
    const wolfLeader = aliveWolves.find(wolf => wolf.id === wolfLeaderId);
    const validTargetIds = new Set(
      alivePlayers.filter(player => !isWolfAligned(player)).map(player => player.id),
    );
    const rawLeaderTargets = wolfLeaderId ? (wolfVotesMap[wolfLeaderId] ?? []) : [];
    const leaderTargets = [...new Set(rawLeaderTargets.filter(targetId => validTargetIds.has(targetId)))];
    const hasInvalidLeaderSelection = leaderTargets.length > maxTargets;
    const wolfSelectionScope = `${game.id}:${currentRound.number}`;
    const moderatorTargets = wolfSelectionDraft?.scope === wolfSelectionScope
      ? wolfSelectionDraft.targetIds
      : null;
    const wolfTargetsToConfirm = moderatorTargets ?? leaderTargets;

    const toggleWolfTarget = (id: string) => {
      const targetPlayer = game.players.find(p => p.id === id);
      if (!targetPlayer || isWolfAligned(targetPlayer)) return;

      if (wolfTargetsToConfirm.includes(id)) {
        setWolfSelectionDraft({
          scope: wolfSelectionScope,
          targetIds: wolfTargetsToConfirm.filter(targetId => targetId !== id),
        });
        return;
      }

      if (maxTargets === 1) {
        setWolfSelectionDraft({ scope: wolfSelectionScope, targetIds: [id] });
        return;
      }
      if (wolfTargetsToConfirm.length >= maxTargets) return;
      setWolfSelectionDraft({
        scope: wolfSelectionScope,
        targetIds: [...wolfTargetsToConfirm, id],
      });
    };

    const selectedNames = wolfTargetsToConfirm.map(id => game.players.find(p => p.id === id)?.name).filter(Boolean);

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
              Quản trò có thể dùng quyết định của đầu đàn hoặc chọn lại mục tiêu
            </span>
          </div>
        </div>
        <Toast
          variant="info"
          message={wolfLeader
            ? `👑 ${wolfLeader.name} là Sói Đầu Đàn và là người xác nhận mục tiêu cuối cùng.`
            : 'Chưa xác định được Sói Đầu Đàn còn sống. Quản trò hãy chọn mục tiêu thay cho bầy.'}
          style={{ marginBottom: 'var(--s-3)' }}
        />
        {hasDemonWolf && (
          <Toast
            variant="danger"
            message={`😈 Sói Quỷ còn sống: đầu đàn được xác nhận tối đa 2 người (đang chọn ${wolfTargetsToConfirm.length}/2).`}
            style={{ marginBottom: 'var(--s-3)' }}
          />
        )}
        {hasInvalidLeaderSelection && moderatorTargets === null && (
          <Toast
            variant="danger"
            message={`Dữ liệu đề xuất của đầu đàn vượt giới hạn ${maxTargets} người. Quản trò hãy chọn lại mục tiêu trước khi xác nhận.`}
            style={{ marginBottom: 'var(--s-3)' }}
          />
        )}
        {aliveWolves.length > 1 && (
          <div style={{
            background: 'rgba(11, 16, 38, 0.7)',
            border: '1px solid rgba(229, 57, 53, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            marginBottom: 'var(--s-3)',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>ĐỀ XUẤT CỦA BẦY SÓI:</span>
            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {aliveWolves.map(w => {
                const targetNames = (wolfVotesMap[w.id] ?? [])
                  .map(targetId => game.players.find(player => player.id === targetId)?.name)
                  .filter(Boolean);
                return (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{w.id === wolfLeaderId ? '👑' : '🐺'} {w.name}:</span>
                    <strong style={{ color: targetNames.length > 0 ? 'var(--red-300)' : 'var(--text-dim)' }}>
                      {targetNames.length > 0 ? `👉 ${targetNames.join(', ')}` : '⏳ Chưa đề xuất'}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {alivePlayers.map(p => {
            const targetIndex = wolfTargetsToConfirm.indexOf(p.id);
            const isTarget = targetIndex !== -1;
            const isWolf = isWolfAligned(p);
            const isAtLimit = maxTargets > 1 && !isTarget && wolfTargetsToConfirm.length >= maxTargets;

            return (
              <PlayerTile
                key={p.id}
                name={p.name}
                avatarUrl={p.avatar}
                role={showRoles ? getRoleLabel(p.role) : undefined}
                badgeLabel={isTarget ? `🎯 Cắn ${maxTargets > 1 ? `#${targetIndex + 1}` : ''}` : (isWolf ? '🐺 Phe Sói' : undefined)}
                badgeVariant={isTarget ? 'red' : 'ash'}
                isSelected={isTarget}
                disabled={isWolf || isAtLimit}
                onClick={() => toggleWolfTarget(p.id)}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {wolfTargetsToConfirm.length > 0 ? (
            <Button
              variant="danger"
              pulse
              fullWidth
              disabled={wolfTargetsToConfirm.length > maxTargets}
              onClick={() => {
                onWolfTargets(wolfTargetsToConfirm);
                setWolfSelectionDraft(null);
              }}
            >
              {wolfTargetsToConfirm.length > maxTargets
                ? '⚠️ Hãy chọn lại mục tiêu hợp lệ'
                : `✓ Xác Nhận Cắn: ${selectedNames.join(', ')}`}
            </Button>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                onWolfTargets([]);
                setWolfSelectionDraft(null);
              }}
            >
              Sói không cắn ai (Bỏ qua)
            </Button>
          )}

          {moderatorTargets !== null && moderatorTargets.length > 0 && (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setWolfSelectionDraft({ scope: wolfSelectionScope, targetIds: [] });
              }}
            >
              Bỏ chọn mục tiêu
            </Button>
          )}
        </div>
      </Panel>
    );
  }

  // 3. LƯỢT SÓI TIÊN TRI
  if (nightStep === 'wolf_seer') {
    const aliveWolfSeers = alivePlayers.filter(player => player.role === 'wolf_seer');
    const currentWolfSeer = aliveWolfSeers.find(
      wolfSeer => currentRound.wolfSeerChecks?.[wolfSeer.id] === undefined,
    );

    if (!currentWolfSeer) {
      return (
        <Panel>
          <Toast variant="info" message="Đang chờ đồng bộ kết quả của Sói Tiên Tri…" />
        </Panel>
      );
    }

    const selectedPlayer = selectedWolfSeerTarget
      ? game.players.find(player => player.id === selectedWolfSeerTarget)
      : null;

    return (
      <Panel variant="danger">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img
            src={ROLE_CARD_IMAGES.wolf_seer}
            alt="Sói Tiên Tri"
            style={{
              width: '46px',
              height: '69px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              border: '1.5px solid var(--purple-400)',
              objectFit: 'cover',
            }}
          />
          <div>
            <h3 style={{
              color: 'var(--purple-400)',
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px',
            }}>
              👁️🐺 {currentWolfSeer.name} muốn soi ai?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Chọn 1 người ngoài phe Sói để biết họ có chức năng hay không
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {alivePlayers.filter(player => !isWolfAligned(player)).map(player => {
            const isSelected = selectedWolfSeerTarget === player.id;
            return (
              <PlayerTile
                key={player.id}
                name={player.name}
                avatarUrl={player.avatar}
                role={showRoles ? getRoleLabel(player.role) : undefined}
                badgeLabel={isSelected ? '👁 Sẽ soi' : undefined}
                badgeVariant="red"
                isSelected={isSelected}
                onClick={() => {
                  setSelectedWolfSeerTarget(current => current === player.id ? null : player.id);
                  setWolfSeerResult(null);
                }}
              />
            );
          })}
        </div>

        <Button
          variant="danger"
          pulse={!!selectedPlayer}
          fullWidth
          disabled={!selectedPlayer}
          style={{ marginTop: 'var(--s-4)' }}
          onClick={() => {
            if (!selectedPlayer) return;
            const check = createWolfSeerCheck(game.players, selectedPlayer.id);
            if (!check) return;
            setWolfSeerResult({
              wolfSeerId: currentWolfSeer.id,
              targetId: check.target,
              hasAbility: check.hasAbility,
            });
          }}
        >
          {selectedPlayer ? `XEM KẾT QUẢ SOI: ${selectedPlayer.name}` : 'HÃY CHỌN 1 NGƯỜI ĐỂ SOI'}
        </Button>

        <Modal
          isOpen={wolfSeerResult !== null}
          onClose={() => setWolfSeerResult(null)}
          title="KẾT QUẢ CỦA SÓI TIÊN TRI"
          footer={wolfSeerResult ? (
            <Button
              variant="danger"
              pulse
              fullWidth
              onClick={() => {
                onWolfSeerCheck(wolfSeerResult.wolfSeerId, wolfSeerResult.targetId);
                setWolfSeerResult(null);
                setSelectedWolfSeerTarget(null);
              }}
            >
              XÁC NHẬN & TIẾP TỤC ➔
            </Button>
          ) : undefined}
        >
          {wolfSeerResult && (
            <div style={{ textAlign: 'center', padding: 'var(--s-4) 0' }}>
              <div style={{
                fontSize: '28px',
                fontFamily: 'var(--font-title)',
                fontWeight: 800,
                color: wolfSeerResult.hasAbility ? 'var(--purple-400)' : 'var(--text-dim)',
                letterSpacing: '0.06em',
              }}>
                {wolfSeerResult.hasAbility ? '👁 CÓ CHỨC NĂNG' : '○ KHÔNG CÓ CHỨC NĂNG'}
              </div>
            </div>
          )}
        </Modal>
      </Panel>
    );
  }

  // 4. LƯỢT TIÊN TRI
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
                    isWolf: isWolfAligned(selectedPlayer)
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

  // 5. LƯỢT THÁM TỬ
  if (nightStep === 'detective') {
    const aliveDetectives = alivePlayers.filter(player => player.role === 'detective');
    const currentDetective = aliveDetectives.find(
      detective => currentRound.detectiveChecks?.[detective.id] === undefined,
    );

    if (!currentDetective) {
      return (
        <Panel>
          <Toast variant="info" message="Đang chờ đồng bộ kết quả của Thám Tử…" />
        </Panel>
      );
    }

    const isLocked = isDetectiveLockedForRound(game, currentDetective.id);
    const targetLimit = getDetectiveTargetLimit(game.players, currentDetective.id);
    const eligiblePlayers = alivePlayers.filter(player => player.id !== currentDetective.id);
    const result = createDetectiveCheck(game.players, currentDetective.id, selectedDetectiveTargets);

    const toggleDetectiveTarget = (targetId: string) => {
      setDetectiveResult(null);
      setSelectedDetectiveTargets(current => {
        if (current.includes(targetId)) return current.filter(id => id !== targetId);
        if (current.length >= targetLimit) return current;
        return [...current, targetId];
      });
    };

    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img
            src={ROLE_CARD_IMAGES.detective}
            alt="Thám Tử"
            style={{
              width: '46px',
              height: '69px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              border: '1.5px solid var(--gold-400)',
              objectFit: 'cover',
            }}
          />
          <div>
            <h3 style={{
              color: 'var(--gold-100)',
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px',
            }}>
              🔎 {currentDetective.name} điều tra nhóm nào?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Kết quả chỉ cho biết trong nhóm có ít nhất một Sói hay không
            </span>
          </div>
        </div>

        {isLocked ? (
          <>
            <Toast
              variant="info"
              message="Vòng trước Thám Tử đã soi đủ 3 người và không gặp Sói, nên năng lực bị khóa trong vòng này."
              style={{ marginBottom: 'var(--s-3)' }}
            />
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onDetectiveCheck(currentDetective.id, [], true)}
            >
              XÁC NHẬN THÁM TỬ BỊ KHÓA — TIẾP TỤC ➔
            </Button>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 var(--s-3)', fontSize: '13px', color: 'var(--text)' }}>
              Chọn <strong>{targetLimit} người</strong> để điều tra ({selectedDetectiveTargets.length}/{targetLimit}).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
              {eligiblePlayers.map(player => {
                const isSelected = selectedDetectiveTargets.includes(player.id);
                return (
                  <PlayerTile
                    key={player.id}
                    name={player.name}
                    avatarUrl={player.avatar}
                    role={showRoles ? getRoleLabel(player.role) : undefined}
                    badgeLabel={isSelected ? `🔎 #${selectedDetectiveTargets.indexOf(player.id) + 1}` : undefined}
                    badgeVariant="gold"
                    isSelected={isSelected}
                    disabled={!isSelected && selectedDetectiveTargets.length >= targetLimit}
                    onClick={() => toggleDetectiveTarget(player.id)}
                  />
                );
              })}
            </div>
            <Button
              variant="primary"
              pulse={selectedDetectiveTargets.length === targetLimit}
              fullWidth
              disabled={targetLimit === 0 || selectedDetectiveTargets.length !== targetLimit}
              style={{ marginTop: 'var(--s-4)' }}
              onClick={() => setDetectiveResult(result.hasWolf)}
            >
              XEM KẾT QUẢ ĐIỀU TRA
            </Button>
          </>
        )}

        <Modal
          isOpen={detectiveResult !== null}
          onClose={() => setDetectiveResult(null)}
          title="KẾT QUẢ CỦA THÁM TỬ"
          footer={detectiveResult !== null ? (
            <Button
              variant="primary"
              pulse
              fullWidth
              onClick={() => {
                onDetectiveCheck(currentDetective.id, selectedDetectiveTargets);
                setDetectiveResult(null);
                setSelectedDetectiveTargets([]);
              }}
            >
              XÁC NHẬN & TIẾP TỤC ➔
            </Button>
          ) : undefined}
        >
          {detectiveResult !== null && (
            <div style={{ textAlign: 'center', padding: 'var(--s-4) 0' }}>
              <div style={{
                fontSize: '28px',
                fontFamily: 'var(--font-title)',
                fontWeight: 800,
                color: detectiveResult ? 'var(--red-300)' : 'var(--green-400)',
                letterSpacing: '0.06em',
              }}>
                {detectiveResult ? '🐺 CÓ SÓI' : '✓ KHÔNG CÓ SÓI'}
              </div>
            </div>
          )}
        </Modal>
      </Panel>
    );
  }

  // 6. LƯỢT PHÙ THỦY
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
                const isWitch = p.role === 'witch';

                return (
                  <PlayerTile
                    key={p.id}
                    name={p.name}
                    avatarUrl={p.avatar}
                    role={showRoles ? getRoleLabel(p.role) : undefined}
                    badgeLabel={isPoisonTarget ? '☠️ Đầu độc' : (isWitch ? '🧪 Phù Thủy' : undefined)}
                    badgeVariant={isPoisonTarget ? 'red' : 'ash'}
                    isSelected={isPoisonTarget}
                    disabled={isWitch}
                    onClick={() => {
                      if (isWitch) return;
                      setWitchPoisonSelection(isPoisonTarget ? null : p.id);
                    }}
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

  // 7. LƯỢT THỢ SĂN
  if (nightStep === 'hunter') {
    const aliveHunters = alivePlayers.filter(player => player.role === 'hunter');
    const currentHunter = aliveHunters.find(hunter => currentRound.hunterTargets?.[hunter.id] === undefined);
    const selectedHunterTarget = selectedHunterChoice && selectedHunterChoice.hunterId === currentHunter?.id
      ? selectedHunterChoice.targetId
      : null;
    const selectedPlayer = selectedHunterTarget
      ? alivePlayers.find(player => player.id === selectedHunterTarget)
      : null;

    if (!currentHunter) {
      return (
        <Panel>
          <Toast variant="info" message="Đang chờ đồng bộ lựa chọn của Thợ săn…" />
        </Panel>
      );
    }

    return (
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-3)' }}>
          <img
            src={ROLE_CARD_IMAGES.hunter}
            alt="Thợ Săn"
            style={{
              width: '46px',
              height: '69px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              border: '1.5px solid var(--gold-500)',
              objectFit: 'cover',
            }}
          />
          <div>
            <h3 style={{
              color: 'var(--gold-100)',
              fontFamily: 'var(--font-title)',
              margin: '0 0 4px 0',
              fontSize: '18px',
            }}>
              🏹 {currentHunter.name} muốn ai chết cùng?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Nếu Thợ săn bị loại trong vòng này, mục tiêu sẽ bị kéo theo
            </span>
          </div>
        </div>

        {aliveHunters.length > 1 && (
          <Toast
            variant="info"
            message={`Đang chọn cho ${currentHunter.name}. Còn ${aliveHunters.filter(hunter => currentRound.hunterTargets?.[hunter.id] === undefined).length} Thợ săn chưa hoàn tất.`}
            style={{ marginBottom: 'var(--s-3)' }}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-2)' }}>
          {alivePlayers.filter(player => player.id !== currentHunter.id).map(player => {
            const isSelected = selectedHunterTarget === player.id;
            return (
              <PlayerTile
                key={player.id}
                name={player.name}
                avatarUrl={player.avatar}
                role={showRoles ? getRoleLabel(player.role) : undefined}
                badgeLabel={isSelected ? '🎯 Chết cùng' : undefined}
                badgeVariant="red"
                isSelected={isSelected}
                onClick={() => setSelectedHunterChoice(previous => (
                  previous?.hunterId === currentHunter.id && previous.targetId === player.id
                    ? null
                    : { hunterId: currentHunter.id, targetId: player.id }
                ))}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <Button
            variant="danger"
            pulse={!!selectedPlayer}
            fullWidth
            disabled={!selectedPlayer}
            onClick={() => {
              onHunterTarget(currentHunter.id, selectedPlayer?.id || null);
              setSelectedHunterChoice(null);
            }}
          >
            {selectedPlayer ? `✓ Chọn chết cùng: ${selectedPlayer.name}` : 'Hãy chọn 1 người chết cùng'}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              onHunterTarget(currentHunter.id, null);
              setSelectedHunterChoice(null);
            }}
          >
            Không bắn ai nếu chết (Bỏ qua)
          </Button>
        </div>
      </Panel>
    );
  }

  // 8. KẾT THÚC ĐÊM
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
