// Copyright (C) 2017-2026 Smart code 203358507

const getVidkingStream = async ({ metaId, type, season, episode, signal, fetchImpl = fetch }) => {
    if (!/^tt\d+$/.test(metaId) || !['movie', 'series'].includes(type)) {
        return null;
    }

    const response = await fetchImpl(`https://db.speedracelight.com/3/find/${encodeURIComponent(metaId)}?external_source=imdb_id`, { signal });
    if (!response.ok) {
        return null;
    }

    const content = await response.json();
    const tmdbId = (type === 'movie' ? content.movie_results : content.tv_results)?.[0]?.id;
    if (!Number.isInteger(tmdbId) || type === 'series' && (!Number.isInteger(season) || !Number.isInteger(episode))) {
        return null;
    }

    const url = type === 'movie' ?
        `https://www.vidking.net/embed/movie/${tmdbId}`
        :
        `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`;

    return {
        addonName: 'Vidking',
        name: 'Vidking',
        description: 'Yoru · Cypher · Breach · Neon · Vyse · Killjoy · Fade · Omen · Raze',
        deepLinks: {
            externalPlayer: { web: url }
        }
    };
};

module.exports = getVidkingStream;
