// Copyright (C) 2026 Smart code 203358507

const parseTimestamp = (value) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})$/);
    return match ?
        Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000
        :
        NaN;
};

const parseSubtitles = (content) => content
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => {
        const lines = block.split(/\r?\n/);
        const timingIndex = lines.findIndex((line) => line.includes('-->'));
        if (timingIndex === -1) {
            return null;
        }

        const [start, end] = lines[timingIndex].split('-->').map(parseTimestamp);
        const text = lines.slice(timingIndex + 1)
            .join('\n')
            .replace(/<[^>]*>|\{\\[^}]+\}/g, '')
            .trim();
        return Number.isFinite(start) && Number.isFinite(end) && text ? { start, end, text } : null;
    })
    .filter(Boolean);

const findSubtitle = (cues, currentTime) => cues.find((cue) => cue.start <= currentTime && cue.end >= currentTime)?.text ?? null;

module.exports = { findSubtitle, parseSubtitles };
