// Copyright (C) 2026 Smart code 203358507

const HIDDEN_CATALOGS = new Set([
    'com.linvo.stremiochannels:top',
    'org.stremio.pubdomainmovies:publicdomainmovies'
]);
const CATALOG_PAGE_SIZE = 50;
const MAX_CATALOG_PAGES = 20;

const isBoardCatalogVisible = (catalog) => !HIDDEN_CATALOGS.has(`${catalog.addon?.manifest.id}:${catalog.id}`);

const loadRecentReleases = async ({ fetchImpl = fetch, now = new Date(), signal, all = false } = {}) => {
    const year = now.getUTCFullYear();
    const catalogs = await Promise.all(['movie', 'series'].map(async (type) => {
        const metas = [];
        // ponytail: cap remote pagination; raise this if Cinemeta exceeds 1,000 titles in one year.
        for (let page = 0; page < (all ? MAX_CATALOG_PAGES : 1); page++) {
            const skip = page * CATALOG_PAGE_SIZE;
            const extra = `genre=${year}${skip > 0 ? `&skip=${skip}` : ''}`;
            const response = await fetchImpl(`https://v3-cinemeta.strem.io/catalog/${type}/year/${extra}.json`, { signal });
            if (!response.ok) throw new Error('Recent releases are unavailable');
            const { metas: pageMetas = [] } = await response.json();
            if (pageMetas.length === 0) break;
            metas.push(...pageMetas);
        }
        return { metas };
    }));
    const nowTime = now.getTime();
    return catalogs.flatMap(({ metas = [] }) => metas)
        .map((meta) => {
            const releasedVideos = (meta.videos ?? [])
                .map((video) => ({ video, time: Date.parse(video.released) }))
                .filter(({ time }) => Number.isFinite(time) && time <= nowTime)
                .sort((a, b) => b.time - a.time);
            const releasedAt = Math.max(...[Date.parse(meta.released), releasedVideos[0]?.time].filter(Number.isFinite));
            return {
                releasedAt,
                item: {
                    ...meta,
                    posterShape: 'poster',
                    href: `/detail/${meta.type}/${meta.id}${meta.type === 'movie' ? `/${meta.id}` : ''}`
                }
            };
        })
        .filter(({ releasedAt }) => Number.isFinite(releasedAt) && releasedAt <= nowTime)
        .sort((a, b) => b.releasedAt - a.releasedAt)
        .map(({ item }) => item);
};

module.exports = { isBoardCatalogVisible, loadRecentReleases };
