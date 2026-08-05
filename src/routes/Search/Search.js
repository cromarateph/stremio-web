// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const useTranslate = require('stremio/common/useTranslate');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { withCoreSuspender, getVisibleChildrenRange } = require('stremio/common');
const { Image, MainNavBars, MetaItem, MetaRow } = require('stremio/components');
const useSearch = require('./useSearch');
const matchesSearchFilters = require('./searchFilters');
const styles = require('./styles');
const { useSearchParams } = require('react-router-dom');

const THRESHOLD = 100;
const METADATA_CACHE = new Map();
const FILTER_MESSAGES = { loading: 'Loading matching titles…', empty: 'No titles match these filters.' };

const Search = () => {
    const [queryParams] = useSearchParams();
    const t = useTranslate();
    const [search, loadSearchRows] = useSearch(queryParams);
    const filters = React.useMemo(() => ({
        country: queryParams.get('country') ?? '',
        rating: queryParams.get('rating') ?? '',
        genre: queryParams.get('genre') ?? '',
        year: queryParams.get('year') ?? '',
    }), [queryParams]);
    const needsMetadata = Boolean(filters.country || filters.rating || filters.genre);
    const filterItems = React.useMemo(() => search.catalogs.flatMap((catalog) =>
        catalog.content?.type === 'Ready' ? catalog.content.content : []
    ), [search.catalogs]);
    const [filterMetadata, setFilterMetadata] = React.useState({});
    const [filtering, setFiltering] = React.useState(false);
    const query = React.useMemo(() => {
        return search.selected !== null ?
            search.selected.extra.reduceRight((query, [name, value]) => {
                if (name === 'search') {
                    return value;
                }

                return query;
            }, null)
            :
            null;
    }, [search.selected]);
    const scrollContainerRef = React.useRef();
    const onVisibleRangeChange = React.useCallback(() => {
        if (search.catalogs.length === 0) {
            return;
        }

        const range = getVisibleChildrenRange(scrollContainerRef.current, THRESHOLD);
        if (range === null) {
            return;
        }

        loadSearchRows(range);
    }, [search.catalogs]);
    const onScroll = React.useCallback(debounce(onVisibleRangeChange, 250), [onVisibleRangeChange]);
    React.useLayoutEffect(() => {
        onVisibleRangeChange();
    }, [search.catalogs, onVisibleRangeChange]);
    React.useEffect(() => {
        if (!needsMetadata) {
            setFiltering(false);
            return;
        }

        let cancelled = false;
        setFiltering(true);
        Promise.all(filterItems.map(async (item) => {
            const key = `${item.type}:${item.id}`;
            if (!METADATA_CACHE.has(key)) {
                if (!['movie', 'series'].includes(item.type) || !/^tt\d+$/.test(item.id)) {
                    METADATA_CACHE.set(key, null);
                } else {
                    try {
                        const response = await fetch(`https://v3-cinemeta.strem.io/meta/${item.type}/${encodeURIComponent(item.id)}.json`);
                        METADATA_CACHE.set(key, response.ok ? (await response.json()).meta : null);
                    } catch (_) {
                        METADATA_CACHE.set(key, null);
                    }
                }
            }
            return [key, METADATA_CACHE.get(key)];
        })).then((entries) => {
            if (!cancelled) {
                setFilterMetadata(Object.fromEntries(entries));
                setFiltering(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [filterItems, needsMetadata]);
    const filteredCatalogs = React.useMemo(() => search.catalogs.map((catalog) => {
        if (catalog.content?.type !== 'Ready') {
            return catalog;
        }
        return {
            ...catalog,
            content: {
                ...catalog.content,
                content: catalog.content.content.filter((item) => matchesSearchFilters(
                    item,
                    filterMetadata[`${item.type}:${item.id}`],
                    filters
                )),
            },
        };
    }), [search.catalogs, filterMetadata, filters]);
    const hasFilteredResults = filteredCatalogs.some((catalog) =>
        catalog.content?.type !== 'Ready' || catalog.content.content.length > 0
    );
    return (
        <MainNavBars className={styles['search-container']} route={'search'} query={query}>
            <div ref={scrollContainerRef} className={styles['search-content']} onScroll={onScroll}>
                {
                    query === null ?
                        <div className={classnames(styles['search-hints-wrapper'])}>
                            <div className={classnames(styles['search-hints-title-container'], 'animation-fade-in')}>
                                <div className={styles['search-hints-title']}>{t.string('SEARCH_ANYTHING')}</div>
                            </div>
                            <div className={classnames(styles['search-hints-container'], 'animation-fade-in')}>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'trailer'} />
                                    <div className={styles['label']}>{t.string('SEARCH_CATEGORIES')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'actors'} />
                                    <div className={styles['label']}>{t.string('SEARCH_PERSONS')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'link'} />
                                    <div className={styles['label']}>{t.string('SEARCH_PROTOCOLS')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'imdb-outline'} />
                                    <div className={styles['label']}>{t.string('SEARCH_TYPES')}</div>
                                </div>
                            </div>
                        </div>
                        :
                        search.catalogs.length === 0 ?
                            <div className={styles['message-container']}>
                                <Image
                                    className={styles['image']}
                                    src={require('/assets/images/empty.png')}
                                    alt={' '}
                                />
                                <div className={styles['message-label']}>{ t.string('STREMIO_TV_SEARCH_NO_ADDONS') }</div>
                            </div>
                            :
                            filtering ?
                                <div className={styles['message-container']}>
                                    <div className={styles['message-label']}>{FILTER_MESSAGES.loading}</div>
                                </div>
                                :
                                !hasFilteredResults ?
                                    <div className={styles['message-container']}>
                                        <div className={styles['message-label']}>{FILTER_MESSAGES.empty}</div>
                                    </div>
                                    :
                                    filteredCatalogs.map((catalog, index) => {
                                        switch (catalog.content?.type) {
                                            case 'Ready': {
                                                if (catalog.content.content.length === 0) {
                                                    return null;
                                                }
                                                return (
                                                    <MetaRow
                                                        key={index}
                                                        className={classnames(styles['search-row'], styles[`search-row-${catalog.content.content[0].posterShape}`], 'animation-fade-in')}
                                                        catalog={catalog}
                                                        itemComponent={MetaItem}
                                                    />
                                                );
                                            }
                                            case 'Err': {
                                                if (catalog.content.content !== 'EmptyContent') {
                                                    return (
                                                        <MetaRow
                                                            key={index}
                                                            className={classnames(styles['search-row'], 'animation-fade-in')}
                                                            catalog={catalog}
                                                            message={catalog.content.content}
                                                        />
                                                    );
                                                }
                                                return null;
                                            }
                                            default: {
                                                return (
                                                    <MetaRow.Placeholder
                                                        key={index}
                                                        className={classnames(styles['search-row'], styles['search-row-poster'], 'animation-fade-in')}
                                                        catalog={catalog}
                                                        title={t.catalogTitle(catalog)}
                                                    />
                                                );
                                            }
                                        }
                                    })
                }
            </div>
        </MainNavBars>
    );
};

const SearchFallback = () => {
    const [queryParams] = useSearchParams();
    return <MainNavBars className={styles['search-container']} route={'search'} query={queryParams.get('search') ?? queryParams.get('query')} />;
};

module.exports = withCoreSuspender(Search, SearchFallback);
