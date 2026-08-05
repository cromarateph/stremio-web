// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useNavigate } = require('react-router');
const { useSearchParams } = require('react-router-dom');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, Image } = require('stremio/components');
const { useFullscreen } = require('stremio/common/Fullscreen');
const { useHorizontalNavGamepadNavigation } = require('stremio/services/GamepadNavigation');
const SearchBar = require('./SearchBar');
const NavMenu = require('./NavMenu');
const styles = require('./styles');
const { t } = require('i18next');

const PORTAL_TITLE = 'Aiken\'s Movie Portal';
const FILTER_NAMES = ['country', 'rating', 'genre', 'year'];
const GENRES = [{ id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' }, { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' }, { id: 18, name: 'Drama' }, { id: 10751, name: 'Family' }, { id: 14, name: 'Fantasy' }, { id: 36, name: 'History' }, { id: 27, name: 'Horror' }, { id: 10402, name: 'Music' }, { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' }, { id: 878, name: 'Sci-Fi' }, { id: 53, name: 'Thriller' }, { id: 10752, name: 'War' }, { id: 37, name: 'Western' }];
const FALLBACK_COUNTRIES = [{ iso_3166_1: 'CN', english_name: 'China' }, { iso_3166_1: 'IN', english_name: 'India' }, { iso_3166_1: 'JP', english_name: 'Japan' }, { iso_3166_1: 'PH', english_name: 'Philippines' }, { iso_3166_1: 'KR', english_name: 'South Korea' }, { iso_3166_1: 'GB', english_name: 'United Kingdom' }, { iso_3166_1: 'US', english_name: 'United States' }];
const FILTER_LABELS = { country: 'Country', rating: 'IMDb rating', genre: 'Genre', year: 'Year', anyCountry: 'Any country', anyRating: 'Any rating', anyGenre: 'Any genre', clear: 'Clear filters', search: 'Search' };

const SearchFilters = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const detailsRef = React.useRef();
    const [countries, setCountries] = React.useState(FALLBACK_COUNTRIES);
    const [draft, setDraft] = React.useState(() => Object.fromEntries(FILTER_NAMES.map((name) => [name, searchParams.get(name) ?? ''])));
    const appliedFilters = FILTER_NAMES.map((name) => searchParams.get(name) ?? '').join('\0');
    const setFilter = React.useCallback((event) => {
        const { name, value } = event.currentTarget;
        setDraft((previous) => ({ ...previous, [name]: value }));
    }, []);
    const applyFilters = React.useCallback((event) => {
        event.preventDefault();
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            FILTER_NAMES.forEach((name) => draft[name] ? next.set(name, draft[name]) : next.delete(name));
            return next;
        });
        if (detailsRef.current) detailsRef.current.open = false;
    }, [draft]);
    const clearFilters = React.useCallback(() => {
        setDraft(Object.fromEntries(FILTER_NAMES.map((name) => [name, ''])));
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            FILTER_NAMES.forEach((name) => next.delete(name));
            return next;
        });
    }, []);
    const activeCount = FILTER_NAMES.filter((name) => searchParams.has(name)).length;
    React.useEffect(() => {
        setDraft(Object.fromEntries(FILTER_NAMES.map((name) => [name, searchParams.get(name) ?? ''])));
    }, [appliedFilters]);
    React.useEffect(() => {
        fetch('https://db.speedracelight.com/3/configuration/countries')
            .then((response) => response.ok ? response.json() : Promise.reject())
            .then((items) => setCountries(items.sort((left, right) => left.english_name.localeCompare(right.english_name))))
            .catch(() => undefined);
    }, []);

    return (
        <details ref={detailsRef} className={styles['search-filters']}>
            <summary className={styles['filter-button']} aria-label={'Search filters'} title={'Search filters'}>
                <Icon className={styles['icon']} name={'filters'} />
                {activeCount > 0 ? <span className={styles['filter-count']}>{activeCount}</span> : null}
            </summary>
            <form className={styles['filter-panel']} onSubmit={applyFilters}>
                <label>
                    <span>{FILTER_LABELS.country}</span>
                    <select name={'country'} value={draft.country} onChange={setFilter}>
                        <option value={''}>{FILTER_LABELS.anyCountry}</option>
                        {countries.map((country) => <option key={country.iso_3166_1} value={country.iso_3166_1}>{country.english_name}</option>)}
                    </select>
                </label>
                <label>
                    <span>{FILTER_LABELS.rating}</span>
                    <select name={'rating'} value={draft.rating} onChange={setFilter}>
                        <option value={''}>{FILTER_LABELS.anyRating}</option>
                        {[5, 6, 7, 8, 9].map((rating) => <option key={rating} value={rating}>{`${rating}+ stars`}</option>)}
                    </select>
                </label>
                <label>
                    <span>{FILTER_LABELS.genre}</span>
                    <select name={'genre'} value={draft.genre} onChange={setFilter}>
                        <option value={''}>{FILTER_LABELS.anyGenre}</option>
                        {GENRES.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
                    </select>
                </label>
                <label>
                    <span>{FILTER_LABELS.year}</span>
                    <input name={'year'} type={'number'} min={'1870'} max={String(new Date().getFullYear() + 5)} value={draft.year} placeholder={'Any year'} onChange={setFilter} />
                </label>
                <div className={styles['filter-actions']}>
                    <button type={'button'} className={styles['clear-filters']} disabled={activeCount === 0} onClick={clearFilters}>{FILTER_LABELS.clear}</button>
                    <button type={'submit'} className={styles['apply-filters']}>{FILTER_LABELS.search}</button>
                </div>
            </form>
        </details>
    );
};

const HorizontalNavBar = React.memo(({ className, route, query, title, backButton, searchBar, fullscreenButton, navMenu, originPath, hdrInfo, ...props }) => {
    const navigate = useNavigate();
    const backButtonOnClick = React.useCallback(() => {
        if (originPath) {
            navigate(originPath, { replace: true });
        } else {
            navigate(-1);
        }
    }, [originPath, navigate]);
    const [fullscreen, requestFullscreen, exitFullscreen, , supported] = useFullscreen();
    const renderNavMenuLabel = React.useCallback(({ ref, className, onClick, children, }) => (
        <Button ref={ref} className={classnames(className, styles['button-container'], styles['menu-button-container'])} tabIndex={-1} onClick={onClick}>
            <Icon className={styles['icon']} name={'person-outline'} />
            {children}
        </Button>
    ), []);
    useHorizontalNavGamepadNavigation(route || className, backButton);
    return (
        <nav {...props} className={classnames(className, styles['horizontal-nav-bar-container'])}>
            {
                backButton ?
                    <Button className={classnames(styles['button-container'], styles['back-button-container'])} tabIndex={-1} onClick={backButtonOnClick}>
                        <Icon className={styles['icon']} name={'chevron-back'} />
                    </Button>
                    :
                    <div className={styles['logo-container']}>
                        <Image
                            className={styles['logo']}
                            src={require('/assets/images/stremio_symbol.png')}
                            alt={' '}
                        />
                        <span className={styles['portal-title']}>{PORTAL_TITLE}</span>
                    </div>
            }
            {
                typeof title === 'string' && title.length > 0 ?
                    <h2 className={styles['title']}>{title}</h2>
                    :
                    null
            }
            {
                searchBar && route !== 'addons' ?
                    <div className={classnames(styles['search-tools'], { [styles['with-filters']]: route === 'search' })}>
                        <SearchBar className={styles['search-bar']} query={query} active={route === 'search'} />
                        {route === 'search' ? <SearchFilters /> : null}
                    </div>
                    :
                    null
            }
            <div className={styles['buttons-container']}>
                {
                    hdrInfo && (hdrInfo.gamma === 'pq' || hdrInfo.gamma === 'hlg') ?
                        <div className={styles['hdr-indicator']} title={hdrInfo.gamma === 'pq' ? 'HDR10' : 'HLG'}>
                            <Icon className={styles['icon']} name={'hdr'} />
                        </div>
                        :
                        null
                }
                {
                    supported && fullscreenButton ?
                        <Button className={styles['button-container']} title={fullscreen ? t('EXIT_FULLSCREEN') : t('ENTER_FULLSCREEN')} tabIndex={-1} onClick={fullscreen ? exitFullscreen : requestFullscreen}>
                            <Icon className={styles['icon']} name={fullscreen ? 'minimize' : 'maximize'} />
                        </Button>
                        :
                        null
                }
                {
                    navMenu ?
                        <NavMenu renderLabel={renderNavMenuLabel} />
                        :
                        null
                }
            </div>
        </nav>
    );
});

HorizontalNavBar.displayName = 'HorizontalNavBar';

HorizontalNavBar.propTypes = {
    className: PropTypes.string,
    route: PropTypes.string,
    query: PropTypes.string,
    title: PropTypes.string,
    backButton: PropTypes.bool,
    searchBar: PropTypes.bool,
    fullscreenButton: PropTypes.bool,
    navMenu: PropTypes.bool,
    originPath: PropTypes.string,
    hdrInfo: PropTypes.shape({
        gamma: PropTypes.string,
    }),
};

module.exports = HorizontalNavBar;
