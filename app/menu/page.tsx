/**
 * Menu Page - Settings and Customer Service
 *
 * Includes:
 * - 공지사항 (Notices)
 * - FAQ
 * - 언어 및 국가 설정 (Language & Country Settings)
 * - 알림 설정 (Notification Settings)
 * - 조인 블랙리스트 관리 (Join Blacklist Management)
 * - 로그아웃 (Logout)
 * - 1:1문의 (1:1 Inquiry)
 *
 * **MOCK DATA MODE**: Uses fake data
 */

import MenuClient from '@/components/menu/MenuClient';
import PageCanvas from '@/components/layout/PageCanvas';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  // Mock user data
  const mockUser = {
    id: 'mock-user-1',
    email: 'demo@tugol.dev',
    name: '김골프',
    phone: '010-1234-5678',
  };

  return (
    <PageCanvas>
      <MenuClient user={mockUser} />
    </PageCanvas>
  );
}
