// Copyright (C) 2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { findSubtitle, parseSubtitles } = require('./parseSubtitles');
const styles = require('./styles');

const VidkingPlayer = ({ className, url, title, metaId, season, episode }) => {
    const { t } = useTranslation();
    const [tracks, setTracks] = React.useState([]);
    const [selectedTrackId, setSelectedTrackId] = React.useState('');
    const [cues, setCues] = React.useState([]);
    const [currentTime, setCurrentTime] = React.useState(0);

    React.useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ id: metaId, language: 'en' });
        if (Number.isInteger(season) && Number.isInteger(episode)) {
            params.set('season', season);
            params.set('episode', episode);
        }

        setTracks([]);
        setSelectedTrackId('');
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
        const playerOrigin = new URL(url).origin;
        const onMessage = (event) => {
            if (event.origin !== playerOrigin) {
                return;
            }

            try {
                const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (message?.type === 'PLAYER_EVENT' && typeof message.data?.currentTime === 'number') {
                    setCurrentTime(message.data.currentTime);
                }
            } catch {
                return;
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [url]);

    const subtitle = React.useMemo(() => findSubtitle(cues, currentTime), [cues, currentTime]);
    const selectTrack = React.useCallback((event) => setSelectedTrackId(event.currentTarget.value), []);

    return (
        <div className={classnames(className, styles['vidking-player'])}>
            <iframe
                className={styles['vidking-frame']}
                src={url}
                title={title}
                allow={'autoplay; encrypted-media; fullscreen; picture-in-picture'}
                allowFullScreen={true}
                referrerPolicy={'no-referrer'}
            />
            {
                tracks.length > 0 ?
                    <select className={styles['subtitle-select']} aria-label={t('PLAYER_SUBTITLES_LANGUAGES')} value={selectedTrackId} onChange={selectTrack}>
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
            {subtitle ? <div className={styles['subtitle-overlay']}>{subtitle}</div> : null}
        </div>
    );
};

VidkingPlayer.propTypes = {
    className: PropTypes.string,
    url: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    metaId: PropTypes.string.isRequired,
    season: PropTypes.number,
    episode: PropTypes.number
};

module.exports = VidkingPlayer;
