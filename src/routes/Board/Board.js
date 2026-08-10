// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const useTranslate = require('stremio/common/useTranslate');
const { useNotifications, withCoreSuspender, getVisibleChildrenRange } = require('stremio/common');
const { ContinueWatchingItem, EventModal, MainNavBars, MetaItem, MetaRow } = require('stremio/components');
const { isBoardCatalogVisible, loadRecentReleases } = require('./boardCatalogs');
const useBoard = require('./useBoard');
const useContinueWatchingPreview = require('./useContinueWatchingPreview');
const styles = require('./styles');

const THRESHOLD = 5;
const RECENT_RELEASES_DEEP_LINKS = { discover: '#/search?recent=1' };

const Board = () => {
    const t = useTranslate();
    const continueWatchingPreview = useContinueWatchingPreview();
    const [board, loadBoardRows] = useBoard();
    const notifications = useNotifications();
    const [recentReleases, setRecentReleases] = React.useState({ type: 'Loading', items: [] });
    const visibleCatalogs = React.useMemo(() => board.catalogs
        .map((catalog, index) => ({ catalog, index }))
        .filter(({ catalog }) => isBoardCatalogVisible(catalog)), [board.catalogs]);
    const showRecentReleases = recentReleases.type === 'Loading' || recentReleases.items.length > 0;
    const boardCatalogsOffset = (showRecentReleases ? 1 : 0) + (continueWatchingPreview.items.length > 0 ? 1 : 0);
    const scrollContainerRef = React.useRef();
    const onVisibleRangeChange = React.useCallback(() => {
        const range = getVisibleChildrenRange(scrollContainerRef.current);
        if (range === null) {
            return;
        }

        const start = Math.max(0, range.start - boardCatalogsOffset - THRESHOLD);
        const end = Math.min(visibleCatalogs.length - 1, range.end - boardCatalogsOffset + THRESHOLD);
        if (end < start) {
            return;
        }

        loadBoardRows({ start: visibleCatalogs[start].index, end: visibleCatalogs[end].index });
    }, [boardCatalogsOffset, visibleCatalogs]);
    const onScroll = React.useCallback(debounce(onVisibleRangeChange, 250), [onVisibleRangeChange]);
    React.useLayoutEffect(() => {
        onVisibleRangeChange();
    }, [visibleCatalogs, onVisibleRangeChange]);
    React.useEffect(() => {
        const controller = new AbortController();
        loadRecentReleases({ signal: controller.signal })
            .then((items) => setRecentReleases({ type: 'Ready', items }))
            .catch((error) => {
                if (error.name !== 'AbortError') setRecentReleases({ type: 'Err', items: [] });
            });
        return () => controller.abort();
    }, []);
    return (
        <div className={styles['board-container']}>
            <EventModal />
            <MainNavBars className={styles['board-content-container']} route={'board'}>
                <div ref={scrollContainerRef} className={styles['board-content']} onScroll={onScroll}>
                    {
                        recentReleases.type === 'Loading' ?
                            <MetaRow.Placeholder className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')} title={'Most Recent Releases'} deepLinks={RECENT_RELEASES_DEEP_LINKS} />
                            :
                            recentReleases.items.length > 0 ?
                                <MetaRow className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')} title={'Most Recent Releases'} catalog={{ ...recentReleases, deepLinks: RECENT_RELEASES_DEEP_LINKS }} itemComponent={MetaItem} />
                                :
                                null
                    }
                    {
                        continueWatchingPreview.items.length > 0 ?
                            <MetaRow
                                className={classnames(styles['board-row'], styles['continue-watching-row'], 'animation-fade-in')}
                                title={t.string('BOARD_CONTINUE_WATCHING')}
                                catalog={continueWatchingPreview}
                                itemComponent={ContinueWatchingItem}
                                notifications={notifications}
                            />
                            :
                            null
                    }
                    {visibleCatalogs.map(({ catalog, index }) => {
                        switch (catalog.content?.type) {
                            case 'Ready': {
                                return (
                                    <MetaRow
                                        key={index}
                                        className={classnames(styles['board-row'], styles[`board-row-${catalog.content.content[0].posterShape}`], 'animation-fade-in')}
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
                                            className={classnames(styles['board-row'], 'animation-fade-in')}
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
                                        className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')}
                                        catalog={catalog}
                                        title={t.catalogTitle(catalog)}
                                    />
                                );
                            }
                        }
                    })}
                </div>
            </MainNavBars>
        </div>
    );
};

const BoardFallback = () => (
    <div className={styles['board-container']}>
        <MainNavBars className={styles['board-content-container']} route={'board'} />
    </div>
);

module.exports = withCoreSuspender(Board, BoardFallback);
