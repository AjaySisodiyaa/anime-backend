// services/tmdb.js (ESM)
import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const API_KEY = process.env.TMDB_API_KEY || "46998a2fc80dc6bcd0bfb5ca2f0df5ab";
const BASE = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const IMG_BASE = process.env.TMDB_IMG_BASE || "https://image.tmdb.org/t/p";

/** Shared axios client that always sends api_key */
const client = axios.create({
  baseURL: BASE,
  params: { api_key: API_KEY },
});

/** Cache genres to avoid repeated requests */
const genreCache = { movie: null, tv: null, at: 0 };
const cacheTTL = 1000 * 60 * 60; // 1h

async function getGenres(type = "movie", language = "en-IN") {
  const now = Date.now();
  if (genreCache[type] && now - genreCache.at < cacheTTL)
    return genreCache[type];

  const { data } = await client.get(`/genre/${type}/list`, {
    params: { language },
  });
  genreCache[type] = data.genres; // [{id, name}]
  genreCache.at = now;
  return genreCache[type];
}

/** Pick best search result (popularity/vote_count heuristic) */
function pickBest(results = []) {
  return results
    .slice()
    .sort(
      (a, b) =>
        (b.vote_count || 0) - (a.vote_count || 0) ||
        (b.popularity || 0) - (a.popularity || 0)
    )[0];
}

/** Normalize a TMDB "movie" result into your schema shape */
export async function normalizeMovie(tm, language = "en-IN") {
  const genres = await getGenres("movie", language);
  const tagNames = (tm.genre_ids || [])
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean);

  return {
    title: tm.title || tm.original_title,
    description: tm.overview || "",
    image: tm.poster_path ? `${IMG_BASE}/w780${tm.poster_path}` : "",
    backdrop: tm.backdrop_path ? `${IMG_BASE}/w1280${tm.backdrop_path}` : "",
    releaseDate: tm.release_date || null,
    tags: tagNames, // -> ["Animation","Adventure",...]
  };
}

/** Normalize a TMDB "tv" result into your schema shape (Series) */
export async function normalizeSeries(tv, language = "en-IN") {
  const genres = await getGenres("tv", language);
  const tagNames = (tv.genre_ids || [])
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean);

  return {
    title: tv.name || tv.original_name,
    description: tv.overview || "",
    image: tv.poster_path ? `${IMG_BASE}/w780${tv.poster_path}` : "",
    backdrop: tv.backdrop_path ? `${IMG_BASE}/w1280${tv.backdrop_path}` : "",
    releaseDate: tv.first_air_date || null,
    tags: tagNames,
  };
}

/** Search helpers */
export async function searchMovieByTitle(
  title,
  { language = "en-IN", region = "IN" } = {}
) {
  const { data } = await client.get("/search/movie", {
    params: { query: title, include_adult: false, language, region },
  });
  return pickBest(data.results);
}

export async function searchSeriesByTitle(
  title,
  { language = "en-IN", region = "IN" } = {}
) {
  const { data } = await client.get("/search/tv", {
    params: { query: title, include_adult: false, language, region },
  });
  return pickBest(data.results);
}
// 👇 New function
export async function getSeriesById(id, language = "en-US") {
  const res = await axios.get(`${BASE}/tv/${id}`, {
    params: {
      api_key: API_KEY,
      language,
    },
  });
  return res.data;
}
export async function getMovieById(id, language = "en-IN") {
  const url = `${BASE}/movie/${id}?api_key=${API_KEY}&language=${language}`;
  const res = await axios.get(url);
  return res.data;
}
