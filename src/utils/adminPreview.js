import { getSession } from './security';

/**
 * Administrative previews are read-only UI previews. They are enabled only
 * when a valid admin session exists, and must never be used as authorization
 * for customer or partner data.
 */
export const isAdminPreview = search => {
    if (!search || new URLSearchParams(search).get('adminPreview') !== '1') return false;
    return Boolean(getSession());
};
