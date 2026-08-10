const { isBoardCatalogVisible, loadRecentReleases } = require('../src/routes/Board/boardCatalogs');

test('hides YouTube channels and public-domain movies', () => {
    expect(isBoardCatalogVisible({ id: 'top', addon: { manifest: { id: 'com.linvo.stremiochannels' } } })).toBe(false);
    expect(isBoardCatalogVisible({ id: 'publicdomainmovies', addon: { manifest: { id: 'org.stremio.pubdomainmovies' } } })).toBe(false);
    expect(isBoardCatalogVisible({ id: 'top', addon: { manifest: { id: 'com.linvo.cinemeta' } } })).toBe(true);
});

test('combines released movies and series newest first', async () => {
    const fetchImpl = jest.fn()
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ metas: [
                { id: 'tt1', type: 'movie', name: 'Movie', released: '2026-08-01T00:00:00.000Z' },
                { id: 'tt2', type: 'movie', name: 'Future Movie', released: '2026-09-01T00:00:00.000Z' }
            ] })
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ metas: [{
                id: 'tt3',
                type: 'series',
                name: 'Series',
                released: '2026-01-01T00:00:00.000Z',
                videos: [
                    { id: 'tt3:1:1', released: '2026-08-05T00:00:00.000Z' },
                    { id: 'tt3:1:2', released: '2026-08-20T00:00:00.000Z' }
                ]
            }] })
        });

    await expect(loadRecentReleases({ fetchImpl, now: new Date('2026-08-10T00:00:00.000Z') })).resolves.toEqual([
        expect.objectContaining({ name: 'Series', posterShape: 'poster', href: '/detail/series/tt3/tt3:1:1' }),
        expect.objectContaining({ name: 'Movie', posterShape: 'poster', href: '/detail/movie/tt1/tt1' })
    ]);
});
