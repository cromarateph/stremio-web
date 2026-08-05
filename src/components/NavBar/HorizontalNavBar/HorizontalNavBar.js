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
const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'];
const FILTER_LABELS = { country: 'Country', rating: 'IMDb rating', genre: 'Genre', year: 'Year', anyRating: 'Any rating', anyGenre: 'Any genre', clear: 'Clear filters' };

const SearchFilters = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const setFilter = React.useCallback((event) => {
        const { name, value } = event.currentTarget;
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            value ? next.set(name, value) : next.delete(name);
            return next;
        });
    }, []);
    const clearFilters = React.useCallback(() => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            FILTER_NAMES.forEach((name) => next.delete(name));
            return next;
        });
    }, []);
    const activeCount = FILTER_NAMES.filter((name) => searchParams.has(name)).length;

    return (
        <details className={styles['search-filters']}>
            <summary className={styles['filter-button']} aria-label={'Search filters'} title={'Search filters'}>
                <Icon className={styles['icon']} name={'filters'} />
                {activeCount > 0 ? <span className={styles['filter-count']}>{activeCount}</span> : null}
            </summary>
            <div className={styles['filter-panel']}>
                <label>
                    <span>{FILTER_LABELS.country}</span>
                    <input name={'country'} list={'search-filter-countries'} value={searchParams.get('country') ?? ''} placeholder={'Any country'} onChange={setFilter} />
                    <datalist id={'search-filter-countries'}>
                        {['Australia', 'Brazil', 'Canada', 'China', 'France', 'Germany', 'Hong Kong', 'India', 'Italy', 'Japan', 'Mexico', 'Philippines', 'South Korea', 'Spain', 'Thailand', 'United Kingdom', 'United States'].map((country) => <option key={country} value={country} />)}
                    </datalist>
                </label>
                <label>
                    <span>{FILTER_LABELS.rating}</span>
                    <select name={'rating'} value={searchParams.get('rating') ?? ''} onChange={setFilter}>
                        <option value={''}>{FILTER_LABELS.anyRating}</option>
                        {[5, 6, 7, 8, 9].map((rating) => <option key={rating} value={rating}>{`${rating}+ stars`}</option>)}
                    </select>
                </label>
                <label>
                    <span>{FILTER_LABELS.genre}</span>
                    <select name={'genre'} value={searchParams.get('genre') ?? ''} onChange={setFilter}>
                        <option value={''}>{FILTER_LABELS.anyGenre}</option>
                        {GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                    </select>
                </label>
                <label>
                    <span>{FILTER_LABELS.year}</span>
                    <input name={'year'} type={'number'} min={'1870'} max={String(new Date().getFullYear() + 5)} value={searchParams.get('year') ?? ''} placeholder={'Any year'} onChange={setFilter} />
                </label>
                <button type={'button'} className={styles['clear-filters']} disabled={activeCount === 0} onClick={clearFilters}>{FILTER_LABELS.clear}</button>
            </div>
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
