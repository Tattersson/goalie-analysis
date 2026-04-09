import { GoalieGame, PlayerOverallStatsResponse } from '../types/leijonat';

let geminiCooldownUntil = 0;

function parseRetryAfterMs(retryAfterHeader: string | null): number {
  if (!retryAfterHeader) {
    return 60_000;
  }

  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(retryAfterHeader);
  if (Number.isNaN(dateMs)) {
    return 60_000;
  }

  return Math.max(0, dateMs - Date.now());
}

export interface GoalieTrendSnapshot {
  gameCount: number;
  sampleWindow: number;
  startAvgGa: number;
  endAvgGa: number;
  startAvgSvPct: number;
  endAvgSvPct: number;
  gaDelta: number;
  svPctDelta: number;
  gaSlopePerGame: number;
  svPctSlopePerGame: number;
  gaDirection: 'up' | 'down' | 'flat';
  svDirection: 'up' | 'down' | 'flat';
}

interface ParsedGame {
  gameDate: string;
  epoch: number;
  goalsAgainst: number;
  savePct: number;
}

function parseGameDate(value: string): number {
  const numeric = Date.parse(value);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) {
    return Number.NaN;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  return new Date(year, month - 1, day).getTime();
}

function parseNumeric(value: string): number {
  const normalized = value.replace(',', '.').replace('%', '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function linearSlope(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const count = values.length;
  const meanX = (count - 1) / 2;
  const meanY = values.reduce((sum, item) => sum + item, 0) / count;

  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    const x = index - meanX;
    numerator += x * (value - meanY);
    denominator += x * x;
  });

  return denominator === 0 ? 0 : numerator / denominator;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function classifyDirection(delta: number, threshold: number): 'up' | 'down' | 'flat' {
  if (delta >= threshold) {
    return 'up';
  }

  if (delta <= -threshold) {
    return 'down';
  }

  return 'flat';
}

export function buildGoalieTrendSnapshot(games: GoalieGame[]): GoalieTrendSnapshot | null {
  const parsedGames: ParsedGame[] = games
    .map((game, index) => {
      const epoch = parseGameDate(game.GameDate);
      return {
        gameDate: game.GameDate,
        epoch: Number.isNaN(epoch) ? index : epoch,
        goalsAgainst: parseNumeric(game.GoalieGoalsAgainst),
        savePct: parseNumeric(game.GoalieSavePerc),
      };
    })
    .filter((item) => Number.isFinite(item.goalsAgainst) && Number.isFinite(item.savePct));

  if (parsedGames.length < 4) {
    return null;
  }

  const sortedGames = [...parsedGames].sort((a, b) => a.epoch - b.epoch);
  const gameCount = sortedGames.length;
  const sampleWindow = Math.max(3, Math.min(10, Math.floor(gameCount / 3)));

  const startSlice = sortedGames.slice(0, sampleWindow);
  const endSlice = sortedGames.slice(-sampleWindow);

  const startAvgGa = average(startSlice.map((game) => game.goalsAgainst));
  const endAvgGa = average(endSlice.map((game) => game.goalsAgainst));
  const startAvgSvPct = average(startSlice.map((game) => game.savePct));
  const endAvgSvPct = average(endSlice.map((game) => game.savePct));

  const gaDelta = endAvgGa - startAvgGa;
  const svPctDelta = endAvgSvPct - startAvgSvPct;

  const gaSlopePerGame = linearSlope(sortedGames.map((game) => game.goalsAgainst));
  const svPctSlopePerGame = linearSlope(sortedGames.map((game) => game.savePct));

  return {
    gameCount,
    sampleWindow,
    startAvgGa,
    endAvgGa,
    startAvgSvPct,
    endAvgSvPct,
    gaDelta,
    svPctDelta,
    gaSlopePerGame,
    svPctSlopePerGame,
    gaDirection: classifyDirection(gaDelta, 0.2),
    svDirection: classifyDirection(svPctDelta, 0.4),
  };
}

export async function generateGoalieSeasonAnalysis({
  playerName,
  association,
  season,
  trend,
  overallStats,
}: {
  playerName: string;
  association: string;
  season: string;
  trend: GoalieTrendSnapshot;
  overallStats: PlayerOverallStatsResponse | null;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (Date.now() < geminiCooldownUntil) {
    return null;
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = [
    'You are a goalie coach analyst.',
    `Write a personalized analysis for ${playerName} (${association || 'Unknown association'}) for season ${season}.`,
    'Focus on whether goals against average trend and save percentage trend have improved or worsened from season start to season end.',
    'Use only the supplied data and avoid inventing stats.',
    'Take into account that some fluctuation is normal but consistent upward or downward trends can indicate improving or worsening performance.',
    'Consider that when a save percentage rises it might indicate that the whole team defense is improving, but when goals against rises it can indicate that the goalie is allowing more goals even if the save percentage is stable.',
    'Take into account the level of the game. For example, U14 means that the players are under 14 years old. If the player is playing in a higher age group than their own age, that can indicate strong performance and potential.',
    'In youth hockey, a good save percentage (SV%) is generally considered to be .900 or higher, with elite goalies often aiming for .915 to .920+. A good goals-against average (GAA) varies by age and team defense, but a sub-2.50 GAA is considered very strong, with elite goalies often dropping below 2.00. ',
    'Output valid Markdown only (no HTML).',
    'Use this exact structure:',
    '## Trend Summary',
    'Short paragraph with concrete numbers.',
    '## Strengths And Risks',
    'Short paragraph interpreting performance.',
    '## Next Game Focus',
    'Bullet list with exactly 2 practical on-ice focuses.',
    '## Off-Ice Practices',
    'Bullet list with 2 to 3 off-ice practices based on the trends.',
    'Data follows as JSON:',
    JSON.stringify(
      {
        trend,
        overall: overallStats
          ? {
              games: overallStats.GoalieGames,
              playedGames: overallStats.GoaliePlayedGames,
              goalsAgainst: overallStats.GoalieGoalsAgainst,
              gaa: overallStats.GoalieGaa,
              toi: overallStats.GoalieToi,
            }
          : null,
      },
      null,
      2
    ),
  ].join('\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
      cache: 'no-store',
    });

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
      geminiCooldownUntil = Date.now() + retryAfterMs;
      console.warn(`Gemini rate limited (429). Retrying after ${Math.ceil(retryAfterMs / 1000)}s.`);
      return null;
    }

    if (!response.ok) {
      console.warn(`Gemini request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const textParts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(textParts)) {
      return null;
    }

    const joinedText = textParts
      .map((part: { text?: string }) => part.text ?? '')
      .join('\n')
      .trim();

    return joinedText || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function generateGoalieSeasonAnalysisFallback({
  playerName,
  association,
  season,
  trend,
}: {
  playerName: string;
  association: string;
  season: string;
  trend: GoalieTrendSnapshot;
}): string {
  const profile = association ? `${playerName} (${association})` : playerName;

  const gaTrendText =
    trend.gaDirection === 'down'
      ? 'Goals against has improved across the season.'
      : trend.gaDirection === 'up'
        ? 'Goals against has increased across the season.'
        : 'Goals against has remained fairly stable across the season.';

  const svTrendText =
    trend.svDirection === 'up'
      ? 'Save percentage has improved across the season.'
      : trend.svDirection === 'down'
        ? 'Save percentage has dropped across the season.'
        : 'Save percentage has remained fairly stable across the season.';

  const riskText =
    trend.gaDirection === 'up' || trend.svDirection === 'down'
      ? 'Current trend suggests some late-season leakage risk under sustained shot volume.'
      : 'Current trend suggests steady control and improved resilience as the season progressed.';

  const focus1 =
    trend.gaDirection === 'up'
      ? 'Prioritize rebound control and second-save recovery sequences in tight-area drills.'
      : 'Maintain crease management and post integration with high-repetition situational reps.';

  const focus2 =
    trend.svDirection === 'down'
      ? 'Add pre-shot tracking routines and east-west read drills to stabilize reaction timing.'
      : 'Continue angle and depth discipline while adding puck-handling exits to reduce defensive-zone time.';

  return [
    '## Trend Summary',
    `${profile} season ${season} trend summary: over ${trend.gameCount} games, start-window GAA was ${trend.startAvgGa.toFixed(2)} and end-window GAA is ${trend.endAvgGa.toFixed(2)} (${trend.gaDelta >= 0 ? '+' : ''}${trend.gaDelta.toFixed(2)}). Start-window SV% was ${trend.startAvgSvPct.toFixed(2)} and end-window SV% is ${trend.endAvgSvPct.toFixed(2)} (${trend.svPctDelta >= 0 ? '+' : ''}${trend.svPctDelta.toFixed(2)} pp). ${gaTrendText} ${svTrendText}`,
    '## Strengths And Risks',
    riskText,
    '## Next Game Focus',
    `- ${focus1}`,
    `- ${focus2}`,
    '## Off-Ice Practices',
    '- Add 10-15 minutes of daily visual tracking drills (ball tracking or reaction lights).',
    '- Use mobility and hip-stability work 3-4 times per week to improve crease movement efficiency.',
    '- Review 2-3 clips from recent games to map goals-against patterns and pre-shot cues.',
  ].join('\n\n');
}