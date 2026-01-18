/**
 * SDD-05: Cancellation Policy Component
 *
 * Displays relevant policy sections:
 * - Standard cancellation terms
 * - Imminent deal terms
 * - Cancellation deadline status
 * - No-show warning
 * - Weather policy
 */

'use client';

import { CancellationPolicyProps } from '@/types/reservationDetail';
import { getPolicySections } from '@/utils/reservationDetailHelpers';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function CancellationPolicy({ reservation, eligibility, hoursLeft }: CancellationPolicyProps) {
  const sections = getPolicySections(reservation, eligibility, hoursLeft);

  if (sections.length === 0) {
    return null;
  }

  // Get icon based on variant
  const getIcon = (variant: 'info' | 'warning' | 'danger') => {
    switch (variant) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />;
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
    }
  };

  // Get container class based on variant
  const getContainerClass = (variant: 'info' | 'warning' | 'danger') => {
    switch (variant) {
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'danger':
        return 'bg-red-50 border-red-200';
    }
  };

  // Get text color based on variant
  const getTextColor = (variant: 'info' | 'warning' | 'danger') => {
    switch (variant) {
      case 'info':
        return 'text-blue-900';
      case 'warning':
        return 'text-orange-900';
      case 'danger':
        return 'text-red-900';
    }
  };

  const getSubtextColor = (variant: 'info' | 'warning' | 'danger') => {
    switch (variant) {
      case 'info':
        return 'text-blue-700';
      case 'warning':
        return 'text-orange-700';
      case 'danger':
        return 'text-red-700';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">정책 안내</h3>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-4 border rounded-lg ${getContainerClass(section.variant)}`}
          >
            {getIcon(section.variant)}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${getTextColor(section.variant)}`}>
                {section.title}
              </p>
              <p className={`text-sm mt-1 ${getSubtextColor(section.variant)}`}>
                {section.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
