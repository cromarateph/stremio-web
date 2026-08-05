const { buildDiscoverUrl, loadFilteredMovies } = require('../src/routes/Search/searchFilters');

test('combines text, country, genre, and year in one discovery request', () => {
    const url = new URL(buildDiscoverUrl({ query: 'colony', country: 'KR', genre: '28', year: '2025' }));

    expect(Object.fromEntries(url.searchParams)).toMatchObject({
        with_text_query: 'colony',
        with_origin_country: 'KR',
        with_genres: '28',
        primary_release_year: '2025',
    });
});

test('uses IMDb metadata for the minimum rating and builds a playable item', async () => {
    const fetchImpl = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ id: 1, title: 'Movie', poster_path: '/poster.jpg', release_date: '2025-01-01' }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ imdb_id: 'tt1234567' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ meta: { imdbRating: '8.2' } }) });

    await expect(loadFilteredMovies({ query: '', country: 'KR', genre: '28', year: '2025', rating: '8' }, fetchImpl)).resolves.toEqual([
        expect.objectContaining({ id: 'tt1234567', href: '/detail/movie/tt1234567/tt1234567' })
    ]);
});
