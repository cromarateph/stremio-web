// Copyright (C) 2017-2026 Smart code 203358507

const PORTAL_OWNER_EMAIL = 'cromarate@cmds.ph';

const isPortalOwner = (profile) => {
    const email = profile?.auth?.user?.email;
    return typeof email === 'string' && email.trim().toLowerCase() === PORTAL_OWNER_EMAIL;
};

module.exports = isPortalOwner;
