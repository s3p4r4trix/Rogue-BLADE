export interface PlayerResources {
  credits: number;
  polymer: number;
  scrap: number;
}

export interface PlayerProfile {
  username: string;
  email: string;
}

export interface PlayerStats {
  totalPlayTime: number;
  successfulRuns: number;
  failedRuns: number;
}
