const { createServer, normalizeSubtitles, searchSubtitles } = require('../server/subtitles');

describe('subtitles', () => {
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
