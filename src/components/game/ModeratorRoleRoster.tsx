import type { Player, Role } from '../../game/types';
import { ROLE_MEDALLION_ICONS } from '../../constants/assets';
import styles from './ModeratorRoleRoster.module.css';

interface ModeratorRoleRosterProps {
  players: Player[];
  getRoleLabel: (role: Role) => string;
}

export function ModeratorRoleRoster({ players, getRoleLabel }: ModeratorRoleRosterProps) {
  return (
    <section className={styles.roster} aria-label="Danh sách vai trò dành cho Quản trò">
      <div className={styles.header}>
        <div>
          <strong>SỔ VAI CỦA QUẢN TRÒ</strong>
          <span>Chỉ dùng để đối chiếu khi đọc lượt</span>
        </div>
        <span className={styles.count}>{players.length} người</span>
      </div>

      <div className={styles.list}>
        {players.map(player => (
          <div className={`${styles.row} ${player.alive ? '' : styles.dead}`} key={player.id}>
            <img src={ROLE_MEDALLION_ICONS[player.role]} alt="" width="34" height="34" />
            <div className={styles.identity}>
              <strong>{player.name}</strong>
              <span>{player.alive ? 'Đang sống' : 'Đã chết'}</span>
            </div>
            <span className={styles.role}>{getRoleLabel(player.role)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
