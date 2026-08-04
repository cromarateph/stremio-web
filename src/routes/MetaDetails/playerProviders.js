// Copyright (C) 2026 Smart code 203358507

const normalizeTitle = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const withSubtitleUrl = (playerUrl, subtitleUrl, siteOrigin) => {
    if (!subtitleUrl) {
        return playerUrl;
    }

    const url = new URL(playerUrl);
    url.searchParams.set('sub_url', new URL(subtitleUrl, siteOrigin).href);
    url.searchParams.set('ds_lang', 'en');
    return url.href;
};

const resolveAllMangaUrl = async ({ title, type, episode, signal, fetchImpl = fetch }) => {
    const query = 'query($search:SearchInput $limit:Int $page:Int $translationType:VaildTranslationTypeEnumType $countryOrigin:VaildCountryOriginEnumType){shows(search:$search limit:$limit page:$page translationType:$translationType countryOrigin:$countryOrigin){edges{_id name}}}';
    const response = await fetchImpl('https://api.allanime.day/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables: {
                search: { allowAdult: false, allowUnknown: false, query: title.toLowerCase() },
                limit: 40,
                page: 1,
                translationType: 'sub',
                countryOrigin: 'ALL'
            }
        }),
        signal
    });
    if (!response.ok) {
        return null;
    }

    const edges = ((await response.json())?.data?.shows?.edges ?? [])
        .filter(({ _id, name }) => typeof _id === 'string' && typeof name === 'string');
    const normalizedTitle = normalizeTitle(title);
    // ponytail: title-first matching; add AniList season mapping if false matches become common.
    const match = edges.find(({ name }) => normalizeTitle(name) === normalizedTitle) ??
        edges.find(({ name }) => normalizeTitle(name).includes(normalizedTitle)) ??
        edges[0];
    const episodeNumber = type === 'movie' ? 1 : episode;
    return match && /^[A-Za-z0-9]+$/.test(match._id) && Number.isInteger(episodeNumber) ?
        `https://allmanga.to/bangumi/${match._id}/p-${episodeNumber}-sub`
        :
        null;
};

module.exports = { resolveAllMangaUrl, withSubtitleUrl };
