// Copyright (C) 2017-2026 Smart code 203358507

const TMDB_API = 'https://db.speedracelight.com/3';
const TMDB_IMAGES = 'https://image.tmdb.org/t/p';

const buildDiscoverUrl = ({ query, country, genre, year }) => {
    const params = new URLSearchParams({ sort_by: 'popularity.desc', include_adult: 'false', page: '1' });
    if (query?.trim()) params.set('with_text_query', query.trim());
    if (/^[A-Z]{2}$/.test(country)) params.set('with_origin_country', country);
    if (/^\d+$/.test(genre)) params.set('with_genres', genre);
    if (/^(18|19|20)\d{2}$/.test(year)) params.set('primary_release_year', year);
    return `${TMDB_API}/discover/movie?${params}`;
};

const loadFilteredMovies = async (filters, fetchImpl = fetch, signal) => {
    const response = await fetchImpl(buildDiscoverUrl(filters), { signal });
    if (!response.ok) throw new Error(`Movie discovery returned ${response.status}`);

    const { results = [] } = await response.json();
    const movies = await Promise.all(results.map(async (movie) => {
        try {
            const idsResponse = await fetchImpl(`${TMDB_API}/movie/${movie.id}/external_ids`, { signal });
            if (!idsResponse.ok) return null;
            const { imdb_id: imdbId } = await idsResponse.json();
            if (!/^tt\d+$/.test(imdbId)) return null;

            let meta = null;
            if (filters.rating) {
                const metaResponse = await fetchImpl(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`, { signal });
                meta = metaResponse.ok ? (await metaResponse.json()).meta : null;
                const imdbRating = Number(meta?.imdbRating);
                if (!Number.isFinite(imdbRating) || imdbRating < Number(filters.rating)) return null;
            }

            return {
                id: imdbId,
                type: 'movie',
                name: movie.title,
                description: movie.overview,
                poster: meta?.poster ?? (movie.poster_path ? `${TMDB_IMAGES}/w500${movie.poster_path}` : null),
                background: meta?.background ?? (movie.backdrop_path ? `${TMDB_IMAGES}/w1280${movie.backdrop_path}` : null),
                posterShape: 'poster',
                releaseInfo: movie.release_date?.slice(0, 4) ?? null,
                imdbRating: meta?.imdbRating ?? null,
                href: `/detail/movie/${imdbId}/${imdbId}`,
            };
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            return null;
        }
    }));

    return movies.filter(Boolean);
};

module.exports = { buildDiscoverUrl, loadFilteredMovies };
