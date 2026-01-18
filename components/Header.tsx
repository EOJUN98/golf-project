/**
 * SDD-08: Global Header Component
 *
 * Shows auth state and admin menu based on user roles
 */

import Link from 'next/link';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const user = await getCurrentUserWithRoles();

  return <HeaderClient user={user} />;
}
