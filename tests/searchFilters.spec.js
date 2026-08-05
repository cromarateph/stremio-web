const matchesSearchFilters = require('../src/routes/Search/searchFilters');

test('matches country, minimum rating, genre, and year together', () => {
    const item = { releaseInfo: '2024-' };
    const details = { country: 'South Korea', imdbRating: '8.2', genres: ['Action', 'Drama'] };

    expect(matchesSearchFilters(item, details, { country: 'Korea', rating: '8', genre: 'Drama', year: '2024' })).toBe(true);
    expect(matchesSearchFilters(item, details, { country: 'Japan', rating: '8', genre: 'Drama', year: '2024' })).toBe(false);
});
