const CLIENT_ID = "d4f362004cd94a38a22f92895baee1b1";
const CLIENT_SECRET = "27ad8338285f4efab59212a1cc32a8fc";

const moodPlaylists = {
  happy:    "3Aas89XBxUj0Gp0U5b3XtN",
  sad:      "PLAYLIST_ID_SAD",
  neutral:  "PLAYLIST_ID_NEUTRAL"
};

function discoverMoodFromLocalStorage() {
  // Try common keys first
  const candidates = [
    "souldrift_mood"
  ];

  for (const key of Object.keys(localStorage)) {
    if (!candidates.includes(key) && /mood|journal/i.test(key)) {
      candidates.push(key);
    }
  }

  const today = new Date();
  const dayNum = String(today.getDate());
  const isoDate = today.toISOString().split("T")[0];

  // Helper: try parse and resolve mood
  function tryParse(raw) {
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      if (typeof obj === "string") return obj; // direct string stored
      if (typeof obj === "object") {
        // direct keyed by day number
        if (obj[dayNum]) return obj[dayNum];
        // keyed by ISO full date
        if (obj[isoDate]) return obj[isoDate];
        // sometimes stored as { dateKey: { mood: 'happy' } }
        if (obj[dayNum] && typeof obj[dayNum] === "object" && obj[dayNum].mood) return obj[dayNum].mood;
        if (obj[isoDate] && typeof obj[isoDate] === "object" && obj[isoDate].mood) return obj[isoDate].mood;
        // sometimes stored as { "entries":[{date:'2025-11-18', mood:'happy'}] }
        if (Array.isArray(obj.entries)) {
          const found = obj.entries.find(e => e.date === isoDate || e.date === dayNum);
          if (found && found.mood) return found.mood;
        }
      }
    } catch (e) {
      // not JSON — maybe raw string
      const rawTrim = raw.trim();
      if (rawTrim.length && /happy|sad|neutral|calm|stressed|angry/i.test(rawTrim)) {
        return rawTrim.toLowerCase();
      }
    }
    return null;
  }

  // 1) Check explicit candidates
  for (const k of candidates) {
    const raw = localStorage.getItem(k);
    const r = tryParse(raw);
    if (r) return r.toLowerCase();
  }

  // 2) As last resort, scan all keys and try to find the mood string inside any JSON
  for (const k of Object.keys(localStorage)) {
    const raw = localStorage.getItem(k);
    const r = tryParse(raw);
    if (r) return r.toLowerCase();
  }

  // nothing found
  return null;
}

let spotifyToken = null;
let tokenExpiry = 0;

async function fetchSpotifyToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn("Spotify CLIENT_ID/SECRET not provided. Playlist metadata fetching will fail until you add them.");
    return null;
  }

  const now = Date.now();
  if (spotifyToken && tokenExpiry - 60000 > now) return spotifyToken; // still valid (with 60s buffer)

  const encoded = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + encoded,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!resp.ok) {
    console.error("Failed to get Spotify token", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return spotifyToken;
}

async function fetchPlaylistTracks(playlistId) {
  if (!playlistId) return [];

  const token = await fetchSpotifyToken();
  if (!token) return [];

  const limit = 100;
  let offset = 0;
  let all = [];
  let more = true;

  while (more) {
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      console.error("Failed to fetch playlist tracks:", res.status, await res.text());
      return all;
    }
    const json = await res.json();
    (json.items || []).forEach(item => {
      const t = item.track;
      if (!t) return;
      all.push({
        title: t.name,
        artist: (t.artists || []).map(a => a.name).join(", "),
        album: t.album?.name || "",
        art: t.album?.images?.[0]?.url || "",
        preview_url: t.preview_url, // may be null
        uri: t.uri,
        track_id: t.id
      });
    });
    offset += (json.items || []).length;
    more = (json.next !== null);
  }

  return all;
}

/* ---------------------------
  Player state & DOM references
--------------------------- */
const state = {
  tracks: [],
  index: 0,
  playing: false,
  shuffled: false,
  order: [] // indexes
};

const dom = {
  moodStatus: document.getElementById("moodStatus"),
  albumArt: document.getElementById("albumArt"),
  trackTitle: document.getElementById("trackTitle"),
  trackArtist: document.getElementById("trackArtist"),
  upNextList: document.getElementById("upNextList"),
  playBtn: document.getElementById("playBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  progress: document.getElementById("progress"),
  pos: document.getElementById("pos"),
  dur: document.getElementById("dur"),
  spotifyEmbed: document.getElementById("spotifyEmbed")
};

const audio = new Audio();
audio.preload = "auto";

/* ---------------------------
  Helpers: update UI, load track, play/pause
--------------------------- */
function setMoodText(mood) {
  dom.moodStatus.textContent = mood ? `Today's mood: ${mood}` : "No mood detected";
}

function renderUpNext() {
  const len = state.order.length;
  dom.upNextList.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const idx = state.order[(state.order.indexOf(state.index) + i) % len];
    if (typeof idx === "undefined") break;
    const t = state.tracks[idx];
    const li = document.createElement("li");
    li.textContent = t ? `${t.title} — ${t.artist}` : "—";
    dom.upNextList.appendChild(li);
  }
}

function updateTrackInfo() {
  const t = state.tracks[state.index];
  if (!t) {
    dom.albumArt.src = "";
    dom.trackTitle.textContent = "No tracks";
    dom.trackArtist.textContent = "";
    return;
  }

  dom.albumArt.src = t.art || "";
  dom.trackTitle.textContent = t.title;
  dom.trackArtist.textContent = t.artist;
  // progress reset
  dom.progress.value = 0;
  dom.pos.textContent = "0:00";
  dom.dur.textContent = t.preview_url ? "0:30" : "—";

  renderUpNext();
}

/* Load track: if preview_url available, use audio element; else fallback to embed playlist */
function loadCurrentTrack() {
  const t = state.tracks[state.index];
  if (!t) return;

  if (t.preview_url) {
    // show audio controls via our UI
    audio.src = t.preview_url;
    audio.currentTime = 0;
    audio.play().then(() => {
      state.playing = true;
      dom.playBtn.textContent = "⏸";
    }).catch(() => {
      state.playing = false;
      dom.playBtn.textContent = "▶";
    });

    // hide embed
    dom.spotifyEmbed.classList.add("hidden");
  } else {
    // fallback: embed the playlist (user will hear full track in Spotify)
    const playlistId = currentPlaylistId;
    dom.spotifyEmbed.classList.remove("hidden");
    dom.spotifyEmbed.innerHTML = `
      <iframe style="width:100%;min-height:120px;border-radius:8px;border:0"
        src="https://open.spotify.com/embed/playlist/${playlistId}"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
    `;
    // pause audio
    audio.pause();
    state.playing = false;
    dom.playBtn.textContent = "▶";
  }
  updateTrackInfo();
}

/* Format seconds mm:ss */
function fmtTime(sec) {
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  const m = Math.floor(sec / 60);
  return `${m}:${s}`;
}

/* ---------------------------
  Playback control handlers
--------------------------- */
dom.playBtn.addEventListener("click", () => {
  if (!state.tracks.length) return;
  if (state.playing) {
    audio.pause();
    state.playing = false;
    dom.playBtn.textContent = "▶";
  } else {
    // If no src (preview missing), trigger embedded UI
    if (!audio.src) {
      loadCurrentTrack();
      return;
    }
    audio.play().then(() => {
      state.playing = true;
      dom.playBtn.textContent = "⏸";
    }).catch(() => {
      state.playing = false;
      dom.playBtn.textContent = "▶";
    });
  }
});

dom.nextBtn.addEventListener("click", () => {
  if (!state.tracks.length) return;
  const curOrderIndex = state.order.indexOf(state.index);
  const nextIndex = state.order[(curOrderIndex + 1) % state.order.length];
  state.index = nextIndex;
  loadCurrentTrack();
});

dom.prevBtn.addEventListener("click", () => {
  if (!state.tracks.length) return;
  const curOrderIndex = state.order.indexOf(state.index);
  const prevIndex = state.order[(curOrderIndex - 1 + state.order.length) % state.order.length];
  state.index = prevIndex;
  loadCurrentTrack();
});

dom.shuffleBtn.addEventListener("click", () => {
  state.shuffled = !state.shuffled;
  dom.shuffleBtn.style.opacity = state.shuffled ? "1" : "0.6";
  buildOrder();
});

/* audio progress sync */
audio.addEventListener("timeupdate", () => {
  const t = audio.currentTime;
  const dur = audio.duration || 30;
  dom.progress.value = (t / dur) * 100;
  dom.pos.textContent = fmtTime(t);
});

audio.addEventListener("ended", () => {
  // autoplay next
  dom.nextBtn.click();
});

/* allow dragging progress (seek preview) */
dom.progress.addEventListener("input", e => {
  const pct = Number(e.target.value) / 100;
  const dur = audio.duration || 30;
  audio.currentTime = pct * dur;
});

/* ---------------------------
  Order / shuffle logic
--------------------------- */
function buildOrder() {
  state.order = state.tracks.map((_, i) => i);
  if (state.shuffled) {
    // simple Fisher-Yates shuffle
    for (let i = state.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
    }
  }
  // ensure current index exists in order
  if (!state.order.includes(state.index)) state.index = 0;
}

/* ---------------------------
  Load playlist by mood
--------------------------- */
let currentPlaylistId = null;

async function loadPlaylistForMood(mood) {
  setMoodText(mood);

  const playlistId = moodPlaylists[mood] || moodPlaylists.neutral;
  if (!playlistId) {
    console.warn("No playlist id mapped for mood:", mood);
    return;
  }
  currentPlaylistId = playlistId;

  // fetch tracks
  const tracks = await fetchPlaylistTracks(playlistId);
  if (!tracks || tracks.length === 0) {
    console.warn("No tracks returned from playlist");
    return;
  }

  state.tracks = tracks;
  state.index = 0;
  state.shuffled = false;
  buildOrder();

  updateTrackInfo();
  loadCurrentTrack();
}

/* ---------------------------
  Main init
--------------------------- */
async function init() {
  const mood = discoverMoodFromLocalStorage();
  setMoodText(mood);

  // DOM: connect buttons initial state
  dom.shuffleBtn.style.opacity = "0.6";

  if (!mood) {
    dom.moodStatus.textContent = "No mood found in localStorage.";
    // optional: auto fallback to neutral
    // await loadPlaylistForMood("neutral");
    return;
  }

  // Attempt to fetch token and playlist data (token will be fetched by fetchPlaylistTracks)
  await loadPlaylistForMood(mood);
}

/* Run on DOM ready */
document.addEventListener("DOMContentLoaded", init);
