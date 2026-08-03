const getVidkingStream = require('../src/routes/MetaDetails/StreamsList/getVidkingStream');
const { resolveAllMangaUrl, withWyzieSubtitle } = require('../src/routes/MetaDetails/playerProviders');
const fs = require('fs');

describe('getVidkingStream', () => {
    test('maps IMDb movies to Vidking', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ movie_results: [{ id: 550 }] })
        });

        const stream = await getVidkingStream({ metaId: 'tt0137523', type: 'movie', fetchImpl });

        expect(stream.deepLinks.externalPlayer.web).toBe('https://www.vidking.net/embed/movie/550');
        expect(stream.playerUrls).toEqual({
            vidking: 'https://www.vidking.net/embed/movie/550',
            vidsrc: 'https://vidsrc-embed.ru/embed/movie?tmdb=550&ds_lang=en',
            videasy: 'https://player.videasy.net/movie/550'
        });
    });

    test('maps IMDb series episodes to Vidking', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ tv_results: [{ id: 1399 }] })
        });

        const stream = await getVidkingStream({ metaId: 'tt0944947', type: 'series', season: 1, episode: 2, fetchImpl });

        expect(stream.deepLinks.externalPlayer.web).toBe('https://www.vidking.net/embed/tv/1399/1/2');
    });

    test('rejects unsupported IDs without a request', async () => {
        const fetchImpl = jest.fn();

        expect(await getVidkingStream({ metaId: 'local:movie', type: 'movie', fetchImpl })).toBe(null);
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    test('uses provider-native controls without the old Wyzie overlay', () => {
        const playerSource = fs.readFileSync('src/routes/MetaDetails/VidkingPlayer.js', 'utf8');

        expect(playerSource).toContain('MultiselectMenu');
        expect(playerSource).toContain('allowFullScreen');
        expect(playerSource).not.toContain('subtitle-select');
        expect(playerSource).not.toContain('player-fullscreen-button');
    });

    test('feeds the first Wyzie subtitle to VidSrc', () => {
        expect(withWyzieSubtitle('https://vidsrc-embed.ru/embed/movie?tmdb=550', 'https://subs.example/english.srt'))
            .toBe('https://vidsrc-embed.ru/embed/movie?tmdb=550&ds_lang=en&sub_url=https%3A%2F%2Fsubs.example%2Fenglish.srt');
    });

    test('resolves an AllManga native episode page', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { shows: { edges: [{ _id: 'anime123', name: 'One Piece' }] } } })
        });

        await expect(resolveAllMangaUrl({ title: 'One Piece', type: 'series', episode: 4, fetchImpl }))
            .resolves.toBe('https://allmanga.to/bangumi/anime123/p-4-sub');
    });
});
