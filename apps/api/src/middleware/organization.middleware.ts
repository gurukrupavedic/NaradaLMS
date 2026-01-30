import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

// Valid organizations in the system
const VALID_ORGANIZATIONS = ['slmts', 'rr'] as const;
type OrganizationId = typeof VALID_ORGANIZATIONS[number];

// Extend Express Request to include organization context
declare global {
    namespace Express {
        interface Request {
            organizationId?: OrganizationId;
        }
    }
}

/**
 * Organization Guard Middleware
 * 
 * Enforces multi-tenancy data isolation by extracting and validating
 * the organization_id from the request context.
 * 
 * Priority:
 * 1. X-Organization-Id header (for explicit org selection)
 * 2. JWT payload (organization field from user token)
 * 3. Subdomain extraction (future: slmts.vedam.org vs rr.vedam.org)
 */
export const organizationGuard = (req: Request, res: Response, next: NextFunction) => {
    try {
        let organizationId: string | undefined;

        // 1. Check explicit header (highest priority for testing/admin overrides)
        const headerOrgId = req.headers['x-organization-id'] as string;
        if (headerOrgId) {
            organizationId = headerOrgId.toLowerCase();
        }

        // 2. Extract from JWT payload (user's assigned organization)
        // Note: This assumes the JWT was already validated by the authenticate middleware
        if (!organizationId && req.user) {
            // For now, we'll expect organization to be in the user's metadata
            // This can be extended when we add organization_id to the users table
            organizationId = (req.user as any).organization || 'slmts'; // Default to slmts for now
        }

        // 3. Future: Extract from subdomain
        // const host = req.hostname;
        // if (host.startsWith('slmts.')) organizationId = 'slmts';
        // else if (host.startsWith('rr.')) organizationId = 'rr';

        // Validate organization
        if (!organizationId || !VALID_ORGANIZATIONS.includes(organizationId as any)) {
            throw new AppError(
                'Invalid or missing organization context',
                403,
                'INVALID_ORGANIZATION',
                { provided: organizationId, valid: VALID_ORGANIZATIONS }
            );
        }

        // Attach to request for downstream use
        req.organizationId = organizationId as OrganizationId;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional: Require specific organization(s)
 * Usage: app.use('/slmts-only-route', requireOrganization('slmts'), handler);
 */
export const requireOrganization = (...allowedOrgs: OrganizationId[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.organizationId) {
            return next(new AppError('Organization context not set', 500, 'NO_ORG_CONTEXT'));
        }

        if (!allowedOrgs.includes(req.organizationId)) {
            return next(new AppError(
                `Access denied: This resource is only available to ${allowedOrgs.join(', ')} organization(s)`,
                403,
                'ORG_ACCESS_DENIED'
            ));
        }

        next();
    };
};
