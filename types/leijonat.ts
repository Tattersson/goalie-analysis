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
  GoalieLevels: any[]; // You can type this out deeper if you need level-specific aggregates
  AllGoalieGames: GoalieGame[];
  SkaterLevels: any[];
  AllSkaterGames: any[];
}