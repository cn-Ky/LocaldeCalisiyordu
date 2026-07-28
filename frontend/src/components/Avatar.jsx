import { avatarColor, avatarInitials } from '../lib/avatar.js';

export default function Avatar({ username, size = 40 }) {
  const color = avatarColor(username);
  return (
    <div
      className="avatar-circle"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(160deg, ${color}55, ${color}22)`,
        color,
        borderColor: color,
      }}
    >
      {avatarInitials(username)}
    </div>
  );
}
