// Copyright (C) 2017-2026 Smart code 203358507

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const matchesSearchFilters = (item, details, filters) => {
    const meta = { ...item, ...details };
    const year = String(meta.releaseInfo ?? meta.released ?? '').match(/\b(18|19|20)\d{2}\b/)?.[0] ?? '';
    const countries = Array.isArray(meta.countries) ? meta.countries.join(', ') : meta.country;
    const genres = Array.isArray(meta.genres) ? meta.genres : [];

    return (!filters.year || year === filters.year) &&
        (!filters.country || normalize(countries).includes(normalize(filters.country))) &&
        (!filters.genre || genres.some((genre) => normalize(genre).includes(normalize(filters.genre)))) &&
        (!filters.rating || Number(meta.imdbRating) >= Number(filters.rating));
};

module.exports = matchesSearchFilters;
