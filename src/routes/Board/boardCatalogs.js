// Copyright (C) 2026 Smart code 203358507

const HIDDEN_CATALOGS = new Set([
    'com.linvo.stremiochannels:top',
    'org.stremio.pubdomainmovies:publicdomainmovies'
]);

const isBoardCatalogVisible = (catalog) => !HIDDEN_CATALOGS.has(`${catalog.addon?.manifest.id}:${catalog.id}`);

const loadRecentReleases = async ({ fetchImpl = fetch, now = new Date(), signal } = {}) => {
    const year = now.getUTCFullYear();
    const responses = await Promise.all(['movie', 'series'].map((type) =>
        fetchImpl(`https://v3-cinemeta.strem.io/catalog/${type}/year/genre=${year}.json`, { signal })
    ));
    if (responses.some(({ ok }) => !ok)) {
        throw new Error('Recent releases are unavailable');
    }

    const catalogs = await Promise.all(responses.map((response) => response.json()));
    const nowTime = now.getTime();
    return catalogs.flatMap(({ metas = [] }) => metas)
        .map((meta) => {
            const releasedVideos = (meta.videos ?? [])
                .map((video) => ({ video, time: Date.parse(video.released) }))
                .filter(({ time }) => Number.isFinite(time) && time <= nowTime)
                .sort((a, b) => b.time - a.time);
            const releasedAt = Math.max(...[Date.parse(meta.released), releasedVideos[0]?.time].filter(Number.isFinite));
            const videoId = meta.type === 'movie' ? meta.id : releasedVideos[0]?.video.id;
            return {
                releasedAt,
                item: {
                    ...meta,
                    posterShape: 'poster',
                    href: `/detail/${meta.type}/${meta.id}${videoId ? `/${videoId}` : ''}`
                }
            };
        })
        .filter(({ releasedAt }) => Number.isFinite(releasedAt) && releasedAt <= nowTime)
        .sort((a, b) => b.releasedAt - a.releasedAt)
        .map(({ item }) => item);
};

module.exports = { isBoardCatalogVisible, loadRecentReleases };
