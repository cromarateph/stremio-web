// Copyright (C) 2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { MultiselectMenu } = require('stremio/components');
const { resolveAllMangaUrl, withWyzieSubtitle } = require('./playerProviders');
const styles = require('./styles');

const PROVIDERS = [
    { value: 'vidking', label: 'Vidking' },
    { value: 'vidsrc', label: 'VidSrc' },
    { value: 'videasy', label: 'Videasy' },
    { value: 'allmanga', label: 'AllManga · Anime' }
];

const VidkingPlayer = ({ className, playerUrls, title, metaId, type, season, episode }) => {
    const [provider, setProvider] = React.useState('vidking');
    const [vidsrcSubtitleUrl, setVidsrcSubtitleUrl] = React.useState(null);
    const [allMangaUrl, setAllMangaUrl] = React.useState(null);
    const [allMangaLoading, setAllMangaLoading] = React.useState(false);

    React.useEffect(() => setProvider('vidking'), [metaId, season, episode]);

    React.useEffect(() => {
        if (provider !== 'vidsrc') {
            return undefined;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({ id: metaId, language: 'en' });
        if (Number.isInteger(season) && Number.isInteger(episode)) {
            params.set('season', season);
            params.set('episode', episode);
        }

        setVidsrcSubtitleUrl(null);
        fetch(`/api/subtitles/search?${params}`, { signal: controller.signal })
            .then((response) => response.ok ? response.json() : [])
            .then((tracks) => setVidsrcSubtitleUrl(tracks[0]?.url ?? null))
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setVidsrcSubtitleUrl(null);
                }
            });
        return () => controller.abort();
    }, [provider, metaId, season, episode]);

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

    const activeUrl = provider === 'allmanga' ?
        allMangaUrl
        :
        provider === 'vidsrc' ?
            withWyzieSubtitle(playerUrls.vidsrc, vidsrcSubtitleUrl, window.location.origin)
            :
            playerUrls[provider];
    const providerLabel = PROVIDERS.find(({ value }) => value === provider)?.label;

    return (
        <div className={classnames(className, styles['vidking-player'])}>
            <MultiselectMenu
                className={styles['provider-menu']}
                options={PROVIDERS}
                value={provider}
                title={providerLabel}
                onSelect={setProvider}
            />
            {activeUrl ?
                <iframe
                    key={`${provider}:${activeUrl}`}
                    className={styles['vidking-frame']}
                    src={activeUrl}
                    title={`Watch ${title} on ${providerLabel}`}
                    allow={'autoplay; encrypted-media; picture-in-picture; fullscreen'}
                    allowFullScreen={true}
                    referrerPolicy={'no-referrer'}
                />
                :
                <div className={styles['player-status']} role={'status'}>
                    {allMangaLoading ? 'Finding an AllManga source…' : 'AllManga could not find this anime.'}
                </div>
            }
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
