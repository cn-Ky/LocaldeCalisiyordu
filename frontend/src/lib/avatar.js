const PALETTE = ['#00e6ff', '#ff2e88', '#43d17a', '#ffcf4d', '#8beaf7', '#ff7ab8', '#7c8cff'];

export function avatarColor(username = '') {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) % 997;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function avatarInitials(username = '') {
  return username.slice(0, 2).toUpperCase();
}
