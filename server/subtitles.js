// Copyright (C) 2026 Smart code 203358507

const http = require('http');

const cache = new Map();
const subtitleFiles = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const SRT_TIMING = /(?:^|\r?\n)\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}/;

const normalizeSubtitles = (subtitles) => subtitles
    .filter((subtitle) => {
        try {
            return new URL(subtitle.url).protocol === 'https:';
        } catch {
            return false;
        }
    })
    .sort((left, right) => (right.downloadCount ?? 0) - (left.downloadCount ?? 0))
    .slice(0, 30)
    .map((subtitle) => ({
        id: String(subtitle.id),
        url: subtitle.url,
        language: subtitle.language,
        display: subtitle.display,
        release: subtitle.release,
        hearingImpaired: subtitle.isHearingImpaired === true
    }));

const cacheFirstAvailableSubtitle = async (subtitles, fetchImpl) => {
    // ponytail: five candidates bound upstream work; raise only if valid tracks routinely rank lower.
    for (const subtitle of subtitles.slice(0, 5)) {
        try {
            const response = await fetchImpl(subtitle.url, { signal: AbortSignal.timeout(15000) });
            const content = response.ok ? await response.text() : '';
            if (!SRT_TIMING.test(content)) {
                continue;
            }
            if (subtitleFiles.size >= 100) {
                subtitleFiles.delete(subtitleFiles.keys().next().value);
            }
            subtitleFiles.set(subtitle.id, { createdAt: Date.now(), content });
            return [{ ...subtitle, url: `/api/subtitles/file/${encodeURIComponent(subtitle.id)}.srt` }];
        } catch {
            continue;
        }
    }
    return [];
};

const searchSubtitles = async (params, apiKey, fetchImpl = fetch) => {
    const cacheKey = params.toString();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
        return cached.subtitles;
    }

    const upstreamUrl = new URL('https://sub.wyzie.io/search');
    params.forEach((value, key) => upstreamUrl.searchParams.set(key, value));
    upstreamUrl.searchParams.set('format', 'srt');
    upstreamUrl.searchParams.set('key', apiKey);

    const response = await fetchImpl(upstreamUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
        throw new Error(`Wyzie returned ${response.status}`);
    }

    const subtitles = await cacheFirstAvailableSubtitle(normalizeSubtitles(await response.json()), fetchImpl);
    if (cache.size >= 100) {
        cache.delete(cache.keys().next().value);
    }
    cache.set(cacheKey, { createdAt: Date.now(), subtitles });
    return subtitles;
};

const sendJson = (response, status, body) => {
    response.writeHead(status, {
        'Cache-Control': status === 200 ? 'private, max-age=300' : 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(JSON.stringify(body));
};

const sendSubtitle = (response, file) => {
    response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=300',
        'Content-Type': 'application/x-subrip; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(file.content);
};

const createServer = (apiKey) => http.createServer(async (request, response) => {
    if (request.method !== 'GET') {
        sendJson(response, 405, { error: 'Method not allowed' });
        return;
    }

    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    if (requestUrl.pathname === '/health') {
        sendJson(response, 200, { ok: true });
        return;
    }
    const fileMatch = requestUrl.pathname.match(/^\/file\/(\d+)\.srt$/);
    if (fileMatch) {
        const file = subtitleFiles.get(fileMatch[1]);
        if (!file || Date.now() - file.createdAt >= CACHE_TTL) {
            subtitleFiles.delete(fileMatch[1]);
            sendJson(response, 404, { error: 'Subtitle not found' });
            return;
        }
        sendSubtitle(response, file);
        return;
    }
    if (requestUrl.pathname !== '/search') {
        sendJson(response, 404, { error: 'Not found' });
        return;
    }

    const id = requestUrl.searchParams.get('id');
    const language = requestUrl.searchParams.get('language') ?? 'en';
    const season = requestUrl.searchParams.get('season');
    const episode = requestUrl.searchParams.get('episode');
    if (!/^(tt\d+|\d+)$/.test(id) || !/^[a-z]{2}(,[a-z]{2})*$/.test(language) || season !== null && !/^\d+$/.test(season) || episode !== null && !/^\d+$/.test(episode)) {
        sendJson(response, 400, { error: 'Invalid subtitle search' });
        return;
    }

    const params = new URLSearchParams({ id, language });
    if (season !== null && episode !== null) {
        params.set('season', season);
        params.set('episode', episode);
    }

    try {
        sendJson(response, 200, await searchSubtitles(params, apiKey));
    } catch (error) {
        console.error(`Subtitle search failed: ${error.message}`);
        sendJson(response, 502, { error: 'Subtitle search unavailable' });
    }
});

if (require.main === module) {
    const apiKey = process.env.WYZIE_API_KEY;
    if (!apiKey) {
        throw new Error('WYZIE_API_KEY is required');
    }
    const port = Number(process.env.SUBTITLES_PORT) || 3211;
    createServer(apiKey).listen(port, '127.0.0.1', () => {
        console.log(`Subtitle proxy listening on 127.0.0.1:${port}`);
    });
}

module.exports = { createServer, normalizeSubtitles, searchSubtitles };
