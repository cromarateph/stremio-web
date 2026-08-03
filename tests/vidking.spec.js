const getVidkingStream = require('../src/routes/MetaDetails/StreamsList/getVidkingStream');
const fs = require('fs');

describe('getVidkingStream', () => {
    test('maps IMDb movies to Vidking', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ movie_results: [{ id: 550 }] })
        });

        const stream = await getVidkingStream({ metaId: 'tt0137523', type: 'movie', fetchImpl });

        expect(stream.deepLinks.externalPlayer.web).toBe('https://www.vidking.net/embed/movie/550');
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

    test('fullscreens the parent player so subtitle overlays remain visible', () => {
        const playerSource = fs.readFileSync('src/routes/MetaDetails/VidkingPlayer.js', 'utf8');

        expect(playerSource).toContain('playerRef.current.requestFullscreen()');
        expect(playerSource).not.toContain('allowFullScreen');
        expect(playerSource).not.toContain('encrypted-media; fullscreen');
    });
});
