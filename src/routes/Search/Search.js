// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const useTranslate = require('stremio/common/useTranslate');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { withCoreSuspender, getVisibleChildrenRange, useOnScrollToBottom } = require('stremio/common');
const { Image, MainNavBars, MetaItem, MetaRow, MultiselectMenu } = require('stremio/components');
const { loadRecentReleases } = require('../Board/boardCatalogs');
const useSearch = require('./useSearch');
const { loadFilteredMovies } = require('./searchFilters');
const styles = require('./styles');
const { useSearchParams } = require('react-router-dom');

const THRESHOLD = 100;
const RECENT_PAGE_SIZE = 40;
const RECENT_TYPE_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'movie', label: 'Movies' },
    { value: 'series', label: 'Series' }
];
const FILTER_MESSAGES = {
    title: 'Filtered Movies',
    loading: 'Loading matching titles…',
    empty: 'No titles match these filters.',
    error: 'Movie filters are temporarily unavailable.',
};

const Search = () => {
    const [queryParams] = useSearchParams();
    const t = useTranslate();
    const query = queryParams.get('search') ?? queryParams.get('query') ?? null;
    const recentMode = queryParams.get('recent') === '1';
    const filters = React.useMemo(() => ({
        query,
        country: queryParams.get('country') ?? '',
        rating: queryParams.get('rating') ?? '',
        genre: queryParams.get('genre') ?? '',
        year: queryParams.get('year') ?? '',
    }), [queryParams]);
    const filteredMode = recentMode || Boolean(filters.country || filters.rating || filters.genre || filters.year);
    const [search, loadSearchRows] = useSearch(queryParams, filteredMode);
    const [filteredMovies, setFilteredMovies] = React.useState({ type: 'Idle', items: [] });
    const [visibleRecentItems, setVisibleRecentItems] = React.useState(RECENT_PAGE_SIZE);
    const [recentType, setRecentType] = React.useState('all');
    const recentItems = React.useMemo(() => recentType === 'all' ?
        filteredMovies.items
        :
        filteredMovies.items.filter(({ type }) => type === recentType), [filteredMovies.items, recentType]);
    const scrollContainerRef = React.useRef();
    const onVisibleRangeChange = React.useCallback(() => {
        if (filteredMode || search.catalogs.length === 0) return;
        const range = getVisibleChildrenRange(scrollContainerRef.current, THRESHOLD);
        if (range !== null) loadSearchRows(range);
    }, [filteredMode, search.catalogs]);
    const onScroll = React.useCallback(debounce(onVisibleRangeChange, 250), [onVisibleRangeChange]);

    React.useLayoutEffect(() => {
        onVisibleRangeChange();
    }, [search.catalogs, onVisibleRangeChange]);
    const onRecentScroll = useOnScrollToBottom(React.useCallback(() => {
        setVisibleRecentItems((count) => Math.min(count + RECENT_PAGE_SIZE, recentItems.length));
    }, [recentItems.length]), THRESHOLD);
    const onRecentTypeSelect = React.useCallback((type) => {
        setRecentType(type);
        setVisibleRecentItems(RECENT_PAGE_SIZE);
    }, []);
    React.useEffect(() => {
        if (!filteredMode) {
            setFilteredMovies({ type: 'Idle', items: [] });
            return;
        }

        const controller = new AbortController();
        setFilteredMovies({ type: 'Loading', items: [] });
        setVisibleRecentItems(RECENT_PAGE_SIZE);
        (recentMode ? loadRecentReleases({ signal: controller.signal, all: true }) : loadFilteredMovies(filters, fetch, controller.signal))
            .then((items) => setFilteredMovies({ type: 'Ready', items }))
            .catch((error) => {
                if (error.name !== 'AbortError') setFilteredMovies({ type: 'Err', items: [] });
            });
        return () => controller.abort();
    }, [filteredMode, filters, recentMode]);

    let content;
    if (filteredMode) {
        if (filteredMovies.type === 'Loading') {
            content = <div className={styles['message-container']}><div className={styles['message-label']}>{FILTER_MESSAGES.loading}</div></div>;
        } else if (filteredMovies.type === 'Err') {
            content = <div className={styles['message-container']}><div className={styles['message-label']}>{FILTER_MESSAGES.error}</div></div>;
        } else if (filteredMovies.items.length === 0) {
            content = <div className={styles['message-container']}><div className={styles['message-label']}>{FILTER_MESSAGES.empty}</div></div>;
        } else {
            content = (
                <div className={classnames(styles['filtered-results'], 'animation-fade-in')}>
                    <div className={styles['filtered-header']}>
                        <div className={styles['filtered-title']}>{recentMode ? 'Most Recent Releases' : FILTER_MESSAGES.title}</div>
                        {recentMode ? <MultiselectMenu className={styles['recent-type-filter']} options={RECENT_TYPE_OPTIONS} value={recentType} onSelect={onRecentTypeSelect} /> : null}
                    </div>
                    <div className={styles['filtered-items']}>
                        {(recentMode ? recentItems.slice(0, visibleRecentItems) : filteredMovies.items).map((item) => <MetaItem key={`${item.type}:${item.id}`} {...item} className={styles['filtered-item']} />)}
                    </div>
                </div>
            );
        }
    } else if (query === null) {
        content = (
            <div className={classnames(styles['search-hints-wrapper'])}>
                <div className={classnames(styles['search-hints-title-container'], 'animation-fade-in')}>
                    <div className={styles['search-hints-title']}>{t.string('SEARCH_ANYTHING')}</div>
                </div>
                <div className={classnames(styles['search-hints-container'], 'animation-fade-in')}>
                    <div className={styles['search-hint-container']}><Icon className={styles['icon']} name={'trailer'} /><div className={styles['label']}>{t.string('SEARCH_CATEGORIES')}</div></div>
                    <div className={styles['search-hint-container']}><Icon className={styles['icon']} name={'actors'} /><div className={styles['label']}>{t.string('SEARCH_PERSONS')}</div></div>
                    <div className={styles['search-hint-container']}><Icon className={styles['icon']} name={'link'} /><div className={styles['label']}>{t.string('SEARCH_PROTOCOLS')}</div></div>
                    <div className={styles['search-hint-container']}><Icon className={styles['icon']} name={'imdb-outline'} /><div className={styles['label']}>{t.string('SEARCH_TYPES')}</div></div>
                </div>
            </div>
        );
    } else if (search.catalogs.length === 0) {
        content = (
            <div className={styles['message-container']}>
                <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                <div className={styles['message-label']}>{t.string('STREMIO_TV_SEARCH_NO_ADDONS')}</div>
            </div>
        );
    } else {
        content = search.catalogs.map((catalog, index) => {
            if (catalog.content?.type === 'Ready') {
                return <MetaRow key={index} className={classnames(styles['search-row'], styles[`search-row-${catalog.content.content[0].posterShape}`], 'animation-fade-in')} catalog={catalog} itemComponent={MetaItem} />;
            }
            if (catalog.content?.type === 'Err') {
                return catalog.content.content === 'EmptyContent' ? null : <MetaRow key={index} className={classnames(styles['search-row'], 'animation-fade-in')} catalog={catalog} message={catalog.content.content} />;
            }
            return <MetaRow.Placeholder key={index} className={classnames(styles['search-row'], styles['search-row-poster'], 'animation-fade-in')} catalog={catalog} title={t.catalogTitle(catalog)} />;
        });
    }

    return (
        <MainNavBars className={styles['search-container']} route={'search'} query={query}>
            <div ref={scrollContainerRef} className={styles['search-content']} onScroll={recentMode ? onRecentScroll : onScroll}>{content}</div>
        </MainNavBars>
    );
};

const SearchFallback = () => {
    const [queryParams] = useSearchParams();
    return <MainNavBars className={styles['search-container']} route={'search'} query={queryParams.get('search') ?? queryParams.get('query')} />;
};

module.exports = withCoreSuspender(Search, SearchFallback);
