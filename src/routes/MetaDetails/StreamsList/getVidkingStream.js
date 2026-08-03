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

    const playerUrls = type === 'movie' ?
        {
            vidking: `https://www.vidking.net/embed/movie/${tmdbId}`,
            vidsrc: `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}`,
            videasy: `https://player.videasy.net/movie/${tmdbId}`
        }
        :
        {
            vidking: `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`,
            vidsrc: `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
            videasy: `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
        };

    return {
        addonName: 'Vidking',
        name: 'Vidking',
        description: 'Yoru · Cypher · Breach · Neon · Vyse · Killjoy · Fade · Omen · Raze',
        playerUrls,
        deepLinks: {
            externalPlayer: { web: playerUrls.vidking }
        }
    };
};

module.exports = getVidkingStream;
