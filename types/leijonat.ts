// types/leijonat.ts

export interface Player {
  PersonID: string;
  LastName: string;
  FirstName: string;
  DateOfBirth: string;
  LinkID: string;
  Position: string;
  Association: string;
}

export interface PlayerSearchResponse {
  players: Player[];
  count: number;
}

export interface SeasonTeam {
  TeamID: string;
  AssAbbrv: string;
  TeamAbbrv: string;
}

export interface SeasonStat {
  SeasonName: string;
  SeasonNumber: string;
  LevelWebOrder: string;
  LevelName: string;
  LevelID: string;
  RoleID: string;
  LevelTeams: SeasonTeam[];
}

export interface SeasonStatsResponse {
  Skater: SeasonStat[];
  Goalkeeper: SeasonStat[];
}

export interface GoalieGame {
  GameDate: string;
  GameID: string;
  LevelID: string;
  LevelName: string;
  HomeTeamName: string;
  AwayTeamName: string;
  ReportEnabled: string;
  StatsEnabled: string;
  GoalieSaves: string;
  GoalieGoalsAgainst: string;
  GoalieSavePerc: string;
  GoaliePlayedSessions: string;
}

// Keeping it simple by focusing on the "AllGoalieGames" array which flattens the stats
export interface GameStatsResponse {
  GoalieLevels: unknown[]; // You can type this out deeper if you need level-specific aggregates
  AllGoalieGames: GoalieGame[];
  SkaterLevels: unknown[];
  AllSkaterGames: unknown[];
}

export interface SeasonTeamsEntry {
  LevelName: string;
  Teams: {
    TeamName: string[];
    TeamID: string[];
  };
}

export interface PlayerOverallStatsResponse {
  IsGoalieStats: string;
  IsSkaterStats: string;
  GoalieGames: string;
  GoaliePlayedGames: string;
  GoalieGoalsAgainst: string;
  GoalieToi: string;
  GoalieGaa: string;
  GoalieWins: string;
  GoalieLosses: string;
  GoalieZeroGames: string;
  GoaliePoints: string;
  GoaliePenaltyMinutes: string;
  SkaterGames: string;
  SkaterGoals: string;
  SkaterGoalsPP: string;
  SkaterGoalsSH: string;
  SkaterGoalsWS: string;
  SkaterAssists: string;
  SkaterPoints: string;
  SeasonTeams: SeasonTeamsEntry[];
  SkaterPenaltyMinutes: string;
  SkaterToi: string;
  SkaterShifts: string;
  SkaterToiAvg: string;
  SkaterShiftsAvg: string;
  GameLength: string;
  HasTimeOnIce: string;
  HasWinningShot: string;
}