const { createServer, normalizeSubtitles, searchSubtitles } = require('../server/subtitles');
const { findSubtitle, parseSubtitles } = require('../src/routes/MetaDetails/parseSubtitles');

describe('subtitles', () => {
    test('parses SRT cues and selects the active cue', () => {
        const cues = parseSubtitles('1\n00:00:01,000 --> 00:00:03,500\n<i>Hello</i>\n\n2\n00:00:04,000 --> 00:00:05,000\nWorld');

        expect(cues).toEqual([
            { start: 1, end: 3.5, text: 'Hello' },
            { start: 4, end: 5, text: 'World' }
        ]);
        expect(findSubtitle(cues, 2)).toBe('Hello');
        expect(findSubtitle(cues, 6)).toBe(null);
    });

    test('only exposes HTTPS subtitle URLs', () => {
        expect(normalizeSubtitles([
            { id: 1, url: 'https://dl.opensubtitles.org/one', display: 'English', downloadCount: 2 },
            { id: 2, url: 'http://example.com/two', display: 'Unsafe', downloadCount: 3 }
        ])).toEqual([{
            id: '1',
            url: 'https://dl.opensubtitles.org/one',
            language: undefined,
            display: 'English',
            release: undefined,
            hearingImpaired: false
        }]);
    });

    test('serves only validated SRT through the local proxy', async () => {
        const validSrt = '1\n00:00:01,000 --> 00:00:02,000\nHello\n';
        const fetchImpl = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [
                { id: 1, url: 'https://subs.example/broken', downloadCount: 2 },
                { id: 2, url: 'https://subs.example/valid', downloadCount: 1 }
            ] })
            .mockResolvedValueOnce({ ok: true, text: async () => '<html>upstream error</html>' })
            .mockResolvedValueOnce({ ok: true, text: async () => validSrt });

        const tracks = await searchSubtitles(new URLSearchParams({ id: 'tt0000001', language: 'en' }), 'key', fetchImpl);
        expect(tracks).toHaveLength(1);
        expect(tracks[0].url).toBe('/api/subtitles/file/2.srt');

        const server = createServer('key');
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const response = await fetch(`http://127.0.0.1:${server.address().port}/file/2.srt`);
        server.close();
        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        await expect(response.text()).resolves.toBe(validSrt);
    });
});
