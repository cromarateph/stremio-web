const isPortalOwner = require('../src/common/isPortalOwner');

describe('portal owner authorization', () => {
    test('allows only the configured signed-in email', () => {
        expect(isPortalOwner({ auth: { user: { email: ' CROMARATE@CMDS.PH ' } } })).toBe(true);
        expect(isPortalOwner({ auth: { user: { email: 'someone@example.com' } } })).toBe(false);
        expect(isPortalOwner({ auth: null })).toBe(false);
    });
});
