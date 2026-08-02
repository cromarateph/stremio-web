const { normalizeSubtitles } = require('../server/subtitles');
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
});
