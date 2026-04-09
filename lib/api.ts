// lib/api.ts
import { 
  PlayerSearchResponse, 
  SeasonStatsResponse, 
  GameStatsResponse 
} from '../types/leijonat';

const BASE_URL = 'https://www.leijonat.fi/modules';

export async function searchPlayer(name: string): Promise<PlayerSearchResponse | null> {
  const url = `${BASE_URL}/mod_searchplayersstats/helper/searchplayers.php`;

  const body = new URLSearchParams({
    schplrs: name,
    schtms: '',
    schass: '',
    initial: '',
    level: '',
    pid: '0',
    index: '0',
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        'origin': 'https://www.leijonat.fi',
        'referer': 'https://www.leijonat.fi/pelaajat',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Failed to fetch player data: ${res.status} ${res.statusText} — ${url}`);
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getSeasonStats(linkId: string): Promise<SeasonStatsResponse | null> {
  // Assuming linkId is passed as a query param based on typical Leijonat architecture
  const url = `${BASE_URL}/mod_playercardmain/helper/getseasonstatsdata.php?lkq=${linkId}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch season stats');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getGoalieGameStats(
  linkId: string, 
  season: string = '2026'
): Promise<GameStatsResponse | null> {
  const url = `${BASE_URL}/mod_playercardseriestats/helper/getplayerseriestats5.php?lkq=${linkId}&age=0&season=${season}&isgoalie=1&isskater=0`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch game stats');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}