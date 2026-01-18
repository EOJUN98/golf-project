/**
 * SDD-05: Status Badges Component
 *
 * Displays all relevant status badges for a reservation:
 * - PAID, CANCELLED, NO_SHOW, REFUNDED, COMPLETED
 * - IMMINENT (imminent deal)
 * - SUSPENDED (user suspended)
 */

'use client';

import { StatusBadgesProps } from '@/types/reservationDetail';
import { getStatusBadges, getStatusBadgeConfig, getBadgeVariantClassName } from '@/utils/reservationDetailHelpers';

export default function StatusBadges({ reservation, user, eligibility }: StatusBadgesProps) {
  const badges = getStatusBadges(reservation, user, eligibility);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const config = getStatusBadgeConfig(badge);
        const className = getBadgeVariantClassName(config.variant);

        return (
          <div
            key={badge}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${className}`}
            title={config.description}
          >
            {config.icon && <span>{config.icon}</span>}
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
