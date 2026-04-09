import { searchPlayer, getGoalieGameStats } from '@/lib/api';

// This is a Server Component, meaning this code runs on the Next.js server, avoiding CORS.
export default async function GoalieDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pid?: string }>;
}) {
  const { q, pid } = await searchParams;
  const query = q?.trim() ?? '';

  const playerSearch = query ? await searchPlayer(query) : null;
  const players = playerSearch?.players ?? [];
  const selectedPlayer = players.find((p) => String(p.LinkID) === pid) ?? null;

  const gameStats = pid ? await getGoalieGameStats(pid, '2026') : null;

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
              const isSelected = player.LinkID === pid;
              return (
                <li key={player.LinkID}>
                  <a
                    href={`?q=${encodeURIComponent(query)}&pid=${encodeURIComponent(player.LinkID)}`}
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
                  </a>
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
      {selectedPlayer && (
        <>
          <h3 className="text-2xl font-bold mb-4">
            {selectedPlayer.FirstName} {selectedPlayer.LastName}
            <span className="text-base font-normal text-gray-500 ml-3">
              {selectedPlayer.Association} — 2025–2026 Game Log
            </span>
          </h3>

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