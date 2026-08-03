const { normalizeSubtitles } = require('../server/subtitles');

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
});
