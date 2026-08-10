// Copyright (C) 2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, MultiselectMenu } = require('stremio/components');
const { findSubtitle, parseSubtitles } = require('./parseSubtitles');
const { resolveAllMangaUrl } = require('./playerProviders');
const styles = require('./styles');

const PROVIDERS = [
    { value: 'vidking', label: 'Vidking' },
    { value: 'vidsrc', label: 'VidSrc' },
    { value: 'videasy', label: 'Videasy' },
    { value: 'allmanga', label: 'AllManga · Anime' }
];

const VidkingPlayer = ({ className, playerUrls, title, metaId, type, season, episode }) => {
    const { t } = useTranslation();
    const [provider, setProvider] = React.useState('vidsrc');
    const [tracks, setTracks] = React.useState([]);
    const [selectedTrackId, setSelectedTrackId] = React.useState('');
    const [cues, setCues] = React.useState([]);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [fullscreen, setFullscreen] = React.useState(false);
    const [controlsVisible, setControlsVisible] = React.useState(true);
    const [allMangaUrl, setAllMangaUrl] = React.useState(null);
    const [allMangaLoading, setAllMangaLoading] = React.useState(false);
    const playerRef = React.useRef();
    const playerFrameRef = React.useRef();
    const hideControlsTimerRef = React.useRef();

    React.useEffect(() => setProvider('vidsrc'), [metaId, season, episode]);
    React.useEffect(() => setCurrentTime(0), [provider]);

    const showControls = React.useCallback(() => {
        clearTimeout(hideControlsTimerRef.current);
        setControlsVisible(true);
        if (document.fullscreenElement === playerRef.current) {
            hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 5000);
        }
    }, []);

    React.useEffect(() => {
        const onFullscreenChange = () => {
            setFullscreen(document.fullscreenElement === playerRef.current);
            showControls();
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('keydown', showControls);
        return () => {
            clearTimeout(hideControlsTimerRef.current);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('keydown', showControls);
        };
    }, [showControls]);

    React.useEffect(() => {
        setTracks([]);
        setSelectedTrackId('');
        setCurrentTime(0);
        const controller = new AbortController();
        const params = new URLSearchParams({ id: metaId, language: 'en' });
        if (Number.isInteger(season) && Number.isInteger(episode)) {
            params.set('season', season);
            params.set('episode', episode);
        }

        fetch(`/api/subtitles/search?${params}`, { signal: controller.signal })
            .then((response) => response.ok ? response.json() : [])
            .then((nextTracks) => {
                setTracks(nextTracks);
                setSelectedTrackId(nextTracks[0]?.id ?? '');
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setTracks([]);
                }
            });
        return () => controller.abort();
    }, [metaId, season, episode]);

    React.useEffect(() => {
        const controller = new AbortController();
        const track = tracks.find(({ id }) => id === selectedTrackId);
        setCues([]);
        if (!track) {
            return () => controller.abort();
        }

        fetch(track.url, { signal: controller.signal })
            .then((response) => response.ok ? response.text() : '')
            .then((content) => setCues(parseSubtitles(content)))
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setCues([]);
                }
            });
        return () => controller.abort();
    }, [tracks, selectedTrackId]);

    React.useEffect(() => {
        if (!['vidking', 'videasy'].includes(provider)) {
            return undefined;
        }

        const playerOrigin = provider === 'vidking' ? new URL(playerUrls.vidking).origin : null;
        const onMessage = (event) => {
            if (provider === 'vidking' ? event.origin !== playerOrigin : event.source !== playerFrameRef.current?.contentWindow) {
                return;
            }

            try {
                const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (message?.type === 'PLAYER_EVENT' && typeof message.data?.currentTime === 'number') {
                    setCurrentTime(message.data.currentTime);
                    if (message.data.event !== 'timeupdate') {
                        showControls();
                    }
                }
            } catch {
                return;
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [provider, playerUrls.vidking, showControls]);

    React.useEffect(() => {
        if (provider !== 'allmanga') {
            return undefined;
        }

        const controller = new AbortController();
        setAllMangaUrl(null);
        setAllMangaLoading(true);
        resolveAllMangaUrl({ title, type, episode, signal: controller.signal })
            .then(setAllMangaUrl)
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setAllMangaUrl(null);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setAllMangaLoading(false);
                }
            });
        return () => controller.abort();
    }, [provider, title, type, episode]);

    const activeUrl = provider === 'allmanga' ? allMangaUrl : playerUrls[provider];
    const providerLabel = PROVIDERS.find(({ value }) => value === provider)?.label;
    const usesSubtitleOverlay = provider === 'vidking' || provider === 'videasy';
    const subtitle = React.useMemo(() => findSubtitle(cues, currentTime), [cues, currentTime]);
    const selectTrack = React.useCallback((event) => setSelectedTrackId(event.currentTarget.value), []);
    const toggleFullscreen = React.useCallback(() => {
        const action = document.fullscreenElement === playerRef.current ? document.exitFullscreen() : playerRef.current.requestFullscreen();
        action.catch((error) => console.error('Unable to toggle player fullscreen:', error));
    }, []);

    return (
        <div ref={playerRef} className={classnames(className, styles['vidking-player'])} onMouseMove={showControls} onTouchStart={showControls}>
            <MultiselectMenu
                className={classnames(styles['provider-menu'], { [styles['controls-hidden']]: usesSubtitleOverlay && fullscreen && !controlsVisible })}
                options={PROVIDERS}
                value={provider}
                title={providerLabel}
                onSelect={setProvider}
            />
            {activeUrl ?
                <iframe
                    ref={playerFrameRef}
                    key={`${provider}:${activeUrl}`}
                    className={styles['vidking-frame']}
                    src={activeUrl}
                    title={`Watch ${title} on ${providerLabel}`}
                    allow={usesSubtitleOverlay ? 'autoplay; encrypted-media; picture-in-picture' : 'autoplay; encrypted-media; picture-in-picture; fullscreen'}
                    allowFullScreen={!usesSubtitleOverlay}
                    referrerPolicy={'no-referrer'}
                />
                :
                <div className={styles['player-status']} role={'status'}>
                    {allMangaLoading ? 'Finding an AllManga source…' : 'AllManga could not find this anime.'}
                </div>
            }
            {
                usesSubtitleOverlay && tracks.length > 0 ?
                    <select className={classnames(styles['subtitle-select'], { [styles['controls-hidden']]: fullscreen && !controlsVisible })} aria-label={t('PLAYER_SUBTITLES_LANGUAGES')} value={selectedTrackId} onChange={selectTrack}>
                        <option value={''}>{t('OFF')}</option>
                        {tracks.map((track) => (
                            <option key={track.id} value={track.id}>
                                {track.display}{track.hearingImpaired ? ' CC' : ''}{track.release ? ` · ${track.release}` : ''}
                            </option>
                        ))}
                    </select>
                    :
                    null
            }
            {usesSubtitleOverlay && subtitle ? <div className={styles['subtitle-overlay']}>{subtitle}</div> : null}
            <Button className={classnames(styles['player-fullscreen-button'], { [styles['controls-hidden']]: usesSubtitleOverlay && fullscreen && !controlsVisible })} title={fullscreen ? t('EXIT_FULLSCREEN') : t('ENTER_FULLSCREEN')} onClick={toggleFullscreen}>
                <Icon className={styles['icon']} name={fullscreen ? 'minimize' : 'maximize'} />
            </Button>
            {usesSubtitleOverlay && fullscreen && !controlsVisible ? <div className={styles['player-activity-catcher']} onMouseMove={showControls} onClick={showControls} onTouchStart={showControls} /> : null}
        </div>
    );
};

VidkingPlayer.propTypes = {
    className: PropTypes.string,
    playerUrls: PropTypes.shape({
        vidking: PropTypes.string.isRequired,
        vidsrc: PropTypes.string.isRequired,
        videasy: PropTypes.string.isRequired
    }).isRequired,
    title: PropTypes.string.isRequired,
    metaId: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['movie', 'series']).isRequired,
    season: PropTypes.number,
    episode: PropTypes.number
};

module.exports = VidkingPlayer;
