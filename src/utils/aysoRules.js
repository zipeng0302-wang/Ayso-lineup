/**
 * Validates if the current lineup meets AYSO standards.
 * @param {Array} players - List of all players (excluding absent ones)
 * @param {Object} lineup - Object mapping quarters to player IDs { q1: [...ids], q2: [...] }
 */
export const validateLineup = (players, lineup) => {
  const stats = players.map(p => ({
    ...p,
    quartersPlayed: Object.values(lineup).filter(q => p.id in q).length
  }));

  const errors = [];
  const maxQuarters = Math.max(...stats.map(s => s.quartersPlayed));

  stats.forEach(player => {
    // Basic Rule: Everyone plays at least 2 quarters
    if (player.quartersPlayed < 2) {
      errors.push(`${player.name} needs at least 2 quarters.`);
    }

    // Advanced Rule: If anyone plays 4, everyone else must play at least 3
    if (maxQuarters === 4 && player.quartersPlayed < 3) {
      errors.push(`3/4 Rule: ${player.name} must play 3 quarters if others play 4.`);
    }
  });

  return errors;
};
