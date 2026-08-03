// Copyright (C) 2017-2026 Smart code 203358507

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const focusFirstMetaItemOnArrow = (event, root = document) => {
    if (!ARROW_KEYS.has(event.key) || event.defaultPrevented ||
        event.target?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]') ||
        root.activeElement?.closest?.('[data-meta-item]')) {
        return false;
    }

    const firstMetaItem = root.querySelector('[data-meta-item]');
    if (!firstMetaItem) {
        return false;
    }

    event.preventDefault();
    firstMetaItem.focus();
    firstMetaItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
};

module.exports = focusFirstMetaItemOnArrow;
