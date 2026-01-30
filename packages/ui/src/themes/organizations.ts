/**
 * CHAMELEON THEMING SYSTEM
 * 
 * Organization-specific theme overrides for SLMTS and RR.
 * These CSS snippets can be injected at runtime to rebrand the application
 * while maintaining the core Gayatri Design System structure.
 * 
 * Usage:
 * 1. Student Portal: Inject via <style> tag in document head (runtime)
 * 2. Admin Portal: Can use static imports based on build-time configuration
 */

export const organizationThemes = {
    slmts: `
    /* SLMTS Theme - Sri Lakshmi Mahavishnu Temple Society */
    :root {
      /* Override primary to reflect SLMTS brand gold */
      --hema-base: 0.76 0.14 85; /* Keep Gayatri gold */
      
      /* Optional: Custom accent for SLMTS-specific features */
      --org-accent: 0.75 0.18 80; /* Slightly warmer gold */
    }

    .dark {
      --hema-base-dark: 0.80 0.16 85;
      --org-accent: 0.78 0.20 80;
    }
  `,

    rr: `
    /* RR Theme - Different organization */
    :root {
      /* Override primary for RR branding */
      --hema-base: 0.70 0.16 45; /* Shift to orange-gold for RR */
      
      /* RR-specific accent */
      --org-accent: 0.68 0.18 40;
    }

    .dark {
      --hema-base-dark: 0.72 0.18 45;
      --org-accent: 0.70 0.20 40;
    }
  `,
};

export type OrganizationId = keyof typeof organizationThemes;

/**
 * Inject organization theme at runtime
 * @param orgId - Organization identifier ('slmts' or 'rr')
 */
export function injectOrganizationTheme(orgId: OrganizationId): void {
    // Remove existing org theme if present
    const existingStyle = document.getElementById('org-theme');
    if (existingStyle) {
        existingStyle.remove();
    }

    // Inject new org theme
    const style = document.createElement('style');
    style.id = 'org-theme';
    style.textContent = organizationThemes[orgId];
    document.head.appendChild(style);
}

/**
 * Get organization theme CSS as string
 * @param orgId - Organization identifier
 * @returns CSS string for the specified organization
 */
export function getOrganizationTheme(orgId: OrganizationId): string {
    return organizationThemes[orgId];
}
