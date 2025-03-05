// main.js (Electron Main Process)
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

let mainWindow;
let accessToken = null;
let currentSearchId = 0; // Track the latest search
let canceledSearches = new Set(); // Track canceled searches
let previousArtists = new Set(); // Store previously selected artists

// Genre list
const genreList = [
  "acoustic",
  "afrobeat",
  "alternative",
  "ambient",
  "americana",
  "anime",
  "avant-garde",
  "bachata",
  "ballad",
  "baroque",
  "bass",
  "big band",
  "black metal",
  "bluegrass",
  "blues",
  "boogie",
  "bossa nova",
  "bounce",
  "breakbeat",
  "britpop",
  "celtic",
  "chill",
  "chiptune",
  "choral",
  "christian",
  "classical",
  "club",
  "comedy",
  "country",
  "crossover",
  "dance",
  "dancehall",
  "deep house",
  "delta blues",
  "disco",
  "doom metal",
  "downtempo",
  "dream pop",
  "drill",
  "drum and bass",
  "dub",
  "dubstep",
  "early music",
  "easy listening",
  "ebm",
  "edm",
  "electro",
  "electronic",
  "emo",
  "epic",
  "ethereal",
  "eurodance",
  "experimental",
  "fantasy",
  "film score",
  "folk",
  "folk rock",
  "funk",
  "fusion",
  "future bass",
  "garage",
  "glitch",
  "gospel",
  "gothic",
  "grime",
  "grunge",
  "happy hardcore",
  "hard rock",
  "hardcore",
  "hardstyle",
  "heavy metal",
  "hip hop",
  "honky tonk",
  "house",
  "hyperpop",
  "idm",
  "indie",
  "indie folk",
  "indie pop",
  "indie rock",
  "industrial",
  "instrumental",
  "irish",
  "island",
  "j-pop",
  "j-rock",
  "jazz",
  "jazz fusion",
  "jungle",
  "k-pop",
  "latin",
  "latin jazz",
  "lofi",
  "madchester",
  "math rock",
  "melodic death metal",
  "melodic hardcore",
  "melodic house",
  "metal",
  "metalcore",
  "minimal",
  "modern classical",
  "motown",
  "mumble rap",
  "musical theater",
  "neoclassical",
  "neo-soul",
  "new age",
  "new wave",
  "noise",
  "nu disco",
  "nu metal",
  "orchestral",
  "outlaw country",
  "pagan folk",
  "piano",
  "pop",
  "pop punk",
  "pop rock",
  "post hardcore",
  "post punk",
  "post rock",
  "power metal",
  "progressive house",
  "progressive metal",
  "progressive rock",
  "psychedelic",
  "psytrance",
  "punk",
  "qawwali",
  "r&b",
  "rap",
  "reggae",
  "reggaeton",
  "retro",
  "rock",
  "rockabilly",
  "salsa",
  "shoegaze",
  "ska",
  "sludge metal",
  "smooth jazz",
  "soft rock",
  "soul",
  "soundtrack",
  "space ambient",
  "speed metal",
  "stoner rock",
  "surf rock",
  "swing",
  "synth",
  "synthpop",
  "synthwave",
  "tech house",
  "techno",
  "trance",
  "trap",
  "trip-hop",
  "tropical house",
  "uk drill",
  "underground",
  "vaporwave",
  "viking metal",
  "visual kei",
  "vocal jazz",
  "world",
  "yacht rock",
];



// Function to get Spotify Access Token
async function getAccessToken() {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
        },
      }
    );
    accessToken = response.data.access_token;
    console.log("✅ Spotify Access Token Retrieved");
  } catch (error) {
    console.error(
      "❌ Error getting Spotify access token:",
      error.response ? error.response.data : error
    );
  }
}

app.whenReady().then(async () => {
  await getAccessToken();
  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile("index.html");
});

ipcMain.handle('cancel-search', () => {
    canceledSearches.add(currentSearchId);
    console.log("🚫 Search canceled.");

    // Ensure that new searches can start fresh
    setTimeout(() => {
        canceledSearches.clear(); // Clears the canceled searches list after a short delay
    }, 100);
});
// **Handle search request from the renderer process**
ipcMain.handle("search-random-artist", async (_, filters) => {
  currentSearchId++; // Increment search ID
  return await searchRandomUndergroundArtist(
    filters.genre,
    filters.followers,
    currentSearchId
  );
});

// **Search for an underground artist with genre & follower limits**
async function searchRandomUndergroundArtist(
  selectedGenre = "",
  maxFollowers = 100,
  searchId
) {
  if (!accessToken) await getAccessToken();

  if (canceledSearches.has(searchId)) return null; // Stop if canceled

  // ✅ **Ensure we always use a genre from genreList**
  const searchQuery =
    selectedGenre && genreList.includes(selectedGenre)
      ? selectedGenre
      : genreList[Math.floor(Math.random() * genreList.length)];

  console.log(
    `🔎 Searching for an underground artist with query: ${searchQuery}, max followers: ${maxFollowers}`
  );

  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { q: searchQuery, type: "artist", limit: 50 },
    });

    if (canceledSearches.has(searchId)) return null; // Stop if canceled

    console.log("🎵 Received artist search data");
    let artists = response.data.artists.items;

    if (!artists || artists.length === 0) {
      console.log("❌ No artists found. Retrying...");
      return await searchRandomUndergroundArtist("", maxFollowers, searchId); // Retry with a random genre
    }

    // Shuffle artists list for more randomness
    artists = artists.sort(() => Math.random() - 0.5);

    // Filter artists based on criteria
    const filteredArtists = artists.filter(
      (artist) =>
        artist.popularity < 100 &&
        artist.followers.total < maxFollowers &&
        artist.name.length > 3 &&
        artist.images.length > 0 &&
        artist.genres.length > 0 &&
        !previousArtists.has(artist.id)
    );

    if (filteredArtists.length === 0) {
      console.log("⚠️ No artists met all filters. Retrying...");
      return await searchRandomUndergroundArtist("", maxFollowers, searchId); // Retry with a random genre
    }

    if (canceledSearches.has(searchId)) return null; // Stop if canceled

    const selectedArtist =
      filteredArtists[Math.floor(Math.random() * filteredArtists.length)];
    previousArtists.add(selectedArtist.id);

    console.log("✅ Found underground artist:", selectedArtist);

    return {
      name: selectedArtist.name,
      followers: selectedArtist.followers.total,
      popularity: selectedArtist.popularity,
      genre: selectedArtist.genres.join(", "),
      image: selectedArtist.images[0].url,
      url: selectedArtist.external_urls.spotify,
    };
  } catch (error) {
    console.error(
      "❌ Error fetching artists:",
      error.response ? error.response.data : error
    );
    return await searchRandomUndergroundArtist("", maxFollowers, searchId); // Retry with a random genre
  }
}

// Send genre list to renderer
ipcMain.handle('getGenres', async () => {
    return genreList; // Send the genre list to the renderer
});