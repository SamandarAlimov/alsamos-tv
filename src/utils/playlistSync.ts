// Utility for synchronized playlist playback - all users hear the same song at the same time
// Works like 24/7 radio - calculates position based on current time

// Seeded random number generator for deterministic daily shuffle
function seededRandom(seed: number): () => number {
  return function() {
    seed = Math.sin(seed) * 10000;
    return seed - Math.floor(seed);
  };
}

// Get today's seed based on date (changes daily at midnight UTC)
function getDailySeed(): number {
  const now = new Date();
  // Create seed from year + month + day
  return now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
}

// Fisher-Yates shuffle with seeded random
function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Typical music video durations (in seconds) - average 3.5 minutes
const AVERAGE_SONG_DURATION = 210; // 3.5 minutes

// Calculate which video index should be playing right now
export function calculateCurrentPlaylistPosition(playlistLength: number): {
  videoIndex: number;
  seekToSeconds: number;
} {
  const now = new Date();
  
  // Get seconds since start of today (UTC)
  const secondsSinceMidnight = 
    now.getUTCHours() * 3600 + 
    now.getUTCMinutes() * 60 + 
    now.getUTCSeconds();
  
  // Total playlist duration
  const totalPlaylistDuration = playlistLength * AVERAGE_SONG_DURATION;
  
  // Current position in the playlist cycle (handles multiple loops per day)
  const positionInCycle = secondsSinceMidnight % totalPlaylistDuration;
  
  // Which video should be playing
  const videoIndex = Math.floor(positionInCycle / AVERAGE_SONG_DURATION);
  
  // How far into the current video we should be
  const seekToSeconds = positionInCycle % AVERAGE_SONG_DURATION;
  
  return {
    videoIndex: videoIndex % playlistLength,
    seekToSeconds: Math.floor(seekToSeconds)
  };
}

// Get shuffled playlist indices for today
export function getShuffledPlaylistIndices(playlistLength: number): number[] {
  const seed = getDailySeed();
  const indices = Array.from({ length: playlistLength }, (_, i) => i);
  return shuffleArray(indices, seed);
}

// Main function to get current playback position with daily shuffle
export function getSyncedPlaybackPosition(playlistLength: number): {
  videoIndex: number;
  seekToSeconds: number;
  shuffledOrder: number[];
} {
  // Get today's shuffled order
  const shuffledOrder = getShuffledPlaylistIndices(playlistLength);
  
  // Calculate position based on time
  const { videoIndex, seekToSeconds } = calculateCurrentPlaylistPosition(playlistLength);
  
  // Map to shuffled index
  const actualVideoIndex = shuffledOrder[videoIndex];
  
  return {
    videoIndex: actualVideoIndex,
    seekToSeconds,
    shuffledOrder
  };
}

// Re-sync check - call this periodically to ensure players stay in sync
export function shouldResync(lastSyncTime: number, toleranceSeconds: number = 30): boolean {
  const now = Date.now();
  const elapsedSinceSync = (now - lastSyncTime) / 1000;
  
  // If more than tolerance has passed, might need resync
  return elapsedSinceSync > toleranceSeconds;
}
