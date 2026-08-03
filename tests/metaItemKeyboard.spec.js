const focusFirstMetaItemOnArrow = require('../src/common/focusFirstMetaItemOnArrow');

describe('meta item keyboard navigation', () => {
    test('the first arrow press focuses the first card', () => {
        const firstMetaItem = { focus: jest.fn(), scrollIntoView: jest.fn() };
        const event = { key: 'ArrowRight', target: {}, preventDefault: jest.fn() };
        const root = { activeElement: {}, querySelector: jest.fn(() => firstMetaItem) };

        expect(focusFirstMetaItemOnArrow(event, root)).toBe(true);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(firstMetaItem.focus).toHaveBeenCalled();
        expect(firstMetaItem.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    });
});
