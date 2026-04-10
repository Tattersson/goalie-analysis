import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { searchPlayer, getGoalieGameStats, getPlayerOverallStats } from '@/lib/api';
import PrintAnalysisButton from './PrintAnalysisButton';
import {
  buildGoalieTrendSnapshot,
  generateGoalieSeasonAnalysis,
  generateGoalieSeasonAnalysisFallback,
} from '@/lib/gemini';

// This is a Server Component, meaning this code runs on the Next.js server, avoiding CORS.
export default async function GoalieDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pid?: string; pname?: string; association?: string; analyze?: string }>;
}) {
  const { q, pid, pname, association, analyze } = await searchParams;
  const query = q?.trim() ?? '';
  const selectedPid = pid?.trim() ?? '';
  const selectedPlayerNameFromParams = pname?.trim() ?? '';
  const selectedAssociationFromParams = association?.trim() ?? '';
  const shouldAnalyze = analyze === '1';

  const playerSearch = query ? await searchPlayer(query) : null;
  const players = playerSearch?.players ?? [];
  const selectedPlayer = players.find((p) => String(p.LinkID) === selectedPid) ?? null;
  const selectedPlayerName = selectedPlayer
    ? `${selectedPlayer.FirstName} ${selectedPlayer.LastName}`
    : selectedPlayerNameFromParams || 'Selected player';
  const selectedAssociation = selectedPlayer?.Association ?? selectedAssociationFromParams;

  const [overallStats, gameStats] = selectedPid
    ? await Promise.all([
        getPlayerOverallStats(selectedPid, '2026'),
        getGoalieGameStats(selectedPid, '2026'),
      ])
    : [null, null];

  const seasonTotals = (gameStats?.AllGoalieGames ?? []).reduce(
    (totals, game) => {
      const saves = Number(game.GoalieSaves);
      const goalsAgainst = Number(game.GoalieGoalsAgainst);

      return {
        saves: totals.saves + (Number.isFinite(saves) ? saves : 0),
        goalsAgainst: totals.goalsAgainst + (Number.isFinite(goalsAgainst) ? goalsAgainst : 0),
      };
    },
    { saves: 0, goalsAgainst: 0 }
  );

  const totalShotsAgainst = seasonTotals.saves + seasonTotals.goalsAgainst;
  const totalSavePct =
    totalShotsAgainst > 0 ? (seasonTotals.saves / totalShotsAgainst) * 100 : null;

  const calculatedShutouts = (gameStats?.AllGoalieGames ?? []).reduce((count, game) => {
    const goalsAgainst = Number(game.GoalieGoalsAgainst);
    const savePct = Number(game.GoalieSavePerc);

    if (Number.isFinite(goalsAgainst) && Number.isFinite(savePct) && goalsAgainst === 0 && savePct === 100) {
      return count + 1;
    }

    return count;
  }, 0);

  const shutoutsValue =
    gameStats?.AllGoalieGames && gameStats.AllGoalieGames.length > 0
      ? String(calculatedShutouts)
      : (overallStats?.GoalieZeroGames ?? '0');

  const trendSnapshot = gameStats?.AllGoalieGames
    ? buildGoalieTrendSnapshot(gameStats.AllGoalieGames)
    : null;

  const analysis = shouldAnalyze && trendSnapshot
    ? await generateGoalieSeasonAnalysis({
        playerName: selectedPlayer
          ? `${selectedPlayer.FirstName} ${selectedPlayer.LastName}`
          : selectedPlayerName,
        association: selectedAssociation,
        season: '2026',
        trend: trendSnapshot,
        overallStats,
      })
    : null;

  const fallbackAnalysis = shouldAnalyze && trendSnapshot
    ? generateGoalieSeasonAnalysisFallback({
        playerName: selectedPlayer
          ? `${selectedPlayer.FirstName} ${selectedPlayer.LastName}`
          : selectedPlayerName,
        association: selectedAssociation,
        season: '2026',
        trend: trendSnapshot,
      })
    : null;

  const analysisText = analysis ?? fallbackAnalysis;
  const analysisSource = analysis ? 'Gemini' : fallbackAnalysis ? 'Local Fallback' : null;

  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  return (
    <main className="p-8 font-sans max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Goalie Analytics Dashboard</h1>

      {/* Search Form */}
      <form className="mb-6 flex gap-4" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={query}
          className="border p-2 rounded-md flex-1 text-black"
          placeholder="Search player name..."
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">
          Search
        </button>
      </form>

      {/* Player list */}
      {players.length > 0 && (
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-2">
            {players.length} result{players.length !== 1 ? 's' : ''} — select a player to view stats
          </p>
          <ul className="divide-y divide-gray-200 border rounded-lg overflow-hidden">
            {players.map((player) => {
              const isSelected = String(player.LinkID) === selectedPid;
              return (
                <li key={player.LinkID}>
                  <Link
                    href={{
                      query: {
                        q: query,
                        pid: String(player.LinkID),
                        pname: `${player.FirstName} ${player.LastName}`,
                        association: player.Association,
                        ...(shouldAnalyze ? { analyze: '1' } : {}),
                      },
                    }}
                    className={`flex items-center justify-between p-4 text-black hover:bg-blue-50 transition-colors ${
                      isSelected ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${isSelected ? 'text-blue-800' : ''}`}>
                        {player.FirstName} {player.LastName}
                      </span>
                      <span className="text-sm text-gray-400">{player.Position}</span>
                    </div>
                    <span className="text-sm text-gray-600">{player.Association || '—'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {query && players.length === 0 && (
        <p className="text-gray-500 mb-8">No players found for &ldquo;{query}&rdquo;.</p>
      )}

      {/* Stats for selected player */}
      {selectedPid && (
        <>
          <h3 className="text-2xl font-bold mb-4">
            {selectedPlayerName}
            <span className="text-base font-normal text-gray-500 ml-3">
              {selectedAssociation ? `${selectedAssociation} — ` : ''}
              2025–2026 Game Log
            </span>
          </h3>

          {overallStats?.IsGoalieStats === '1' && (
            <section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 text-lg font-semibold text-black">Overall Goalie Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-black sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Games</p>
                  <p className="text-lg font-bold">{overallStats.GoalieGames || '0'}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Played</p>
                  <p className="text-lg font-bold">{overallStats.GoaliePlayedGames || '0'}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Goals Against</p>
                  <p className="text-lg font-bold">{overallStats.GoalieGoalsAgainst || '0'}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">GAA</p>
                  <p className="text-lg font-bold">
                    {Number(overallStats.GoalieGaa || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Total SV%</p>
                  <p className="text-lg font-bold">
                    {totalSavePct !== null ? `${totalSavePct.toFixed(2)}%` : '—'}
                  </p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Time On Ice (TOI)</p>
                  <p className="text-lg font-bold">{overallStats.GoalieToi || '0:00'}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Shutouts</p>
                  <p className="text-lg font-bold">{shutoutsValue}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Points</p>
                  <p className="text-lg font-bold">{overallStats.GoaliePoints || '0'}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <p className="text-gray-500">Penalties (min)</p>
                  <p className="text-lg font-bold">{overallStats.GoaliePenaltyMinutes || '0'}</p>
                </div>
              </div>
            </section>
          )}

          {trendSnapshot && (
            <section className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-lg font-semibold text-black">AI Season Trend Analysis</h4>
                <div className="flex items-center gap-2">
                  {analysisSource && (
                    <span className="rounded-full border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700">
                      {analysisSource}
                    </span>
                  )}
                  {analysisText && (
                    <PrintAnalysisButton
                      playerName={selectedPlayer
                        ? `${selectedPlayer.FirstName} ${selectedPlayer.LastName}`
                        : selectedPlayerName}
                      season="2026"
                      source={analysisSource ?? 'Unknown'}
                      analysisText={analysisText}
                    />
                  )}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 text-sm text-black md:grid-cols-2">
                <div className="rounded border border-emerald-200 bg-white p-3">
                  <p className="font-medium text-gray-700">Goals Against Trend</p>
                  <p className="mt-1">
                    Start avg ({trendSnapshot.sampleWindow} games):{' '}
                    <strong>{trendSnapshot.startAvgGa.toFixed(2)}</strong>
                  </p>
                  <p>
                    End avg ({trendSnapshot.sampleWindow} games):{' '}
                    <strong>{trendSnapshot.endAvgGa.toFixed(2)}</strong>
                  </p>
                  <p>
                    Change: <strong>{trendSnapshot.gaDelta.toFixed(2)}</strong> ({trendSnapshot.gaDirection})
                  </p>
                </div>

                <div className="rounded border border-emerald-200 bg-white p-3">
                  <p className="font-medium text-gray-700">Save Percentage Trend</p>
                  <p className="mt-1">
                    Start avg ({trendSnapshot.sampleWindow} games):{' '}
                    <strong>{trendSnapshot.startAvgSvPct.toFixed(2)}%</strong>
                  </p>
                  <p>
                    End avg ({trendSnapshot.sampleWindow} games):{' '}
                    <strong>{trendSnapshot.endAvgSvPct.toFixed(2)}%</strong>
                  </p>
                  <p>
                    Change: <strong>{trendSnapshot.svPctDelta.toFixed(2)} pp</strong> ({trendSnapshot.svDirection})
                  </p>
                </div>
              </div>

              {!shouldAnalyze ? (
                <form method="GET" className="mt-2">
                  <input type="hidden" name="q" value={query} />
                  <input type="hidden" name="pid" value={selectedPid} />
                  <input type="hidden" name="pname" value={selectedPlayerName} />
                  <input type="hidden" name="association" value={selectedAssociation} />
                  <input type="hidden" name="analyze" value="1" />
                  <button
                    type="submit"
                    className="rounded-md border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Analyze This Player
                  </button>
                </form>
              ) : analysisText ? (
                <div className="rounded border border-emerald-200 bg-white p-4 text-sm leading-6 text-black">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h5 className="mb-2 mt-3 text-base font-semibold">{children}</h5>,
                      h2: ({ children }) => <h5 className="mb-2 mt-3 text-base font-semibold">{children}</h5>,
                      h3: ({ children }) => <h6 className="mb-2 mt-3 text-sm font-semibold">{children}</h6>,
                      p: ({ children }) => <p className="mb-2">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {analysisText}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {isGeminiConfigured
                    ? 'Gemini analysis is currently unavailable for this player.'
                    : 'Set GEMINI_API_KEY in your environment to enable Gemini-powered player analysis.'}
                </p>
              )}
            </section>
          )}

          {gameStats?.AllGoalieGames && gameStats.AllGoalieGames.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 text-black">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Level</th>
                    <th className="p-2 border">Matchup</th>
                    <th className="p-2 border">Saves</th>
                    <th className="p-2 border">GA</th>
                    <th className="p-2 border">SV%</th>
                  </tr>
                </thead>
                <tbody>
                  {gameStats.AllGoalieGames.map((game) => (
                    <tr key={game.GameID} className="text-center border-b">
                      <td className="p-2 border">{game.GameDate}</td>
                      <td className="p-2 border">{game.LevelName}</td>
                      <td className="p-2 border">
                        {game.HomeTeamName} vs {game.AwayTeamName}
                      </td>
                      <td className="p-2 border">{game.GoalieSaves}</td>
                      <td className="p-2 border">{game.GoalieGoalsAgainst}</td>
                      <td className="p-2 border font-bold">
                        {parseFloat(game.GoalieSavePerc).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No goalie stats found for this player.</p>
          )}

        </>
      )}
    </main>
  );
}