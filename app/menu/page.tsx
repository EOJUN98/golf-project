import { redirect } from 'next/navigation';
import MenuClient from '@/components/menu/MenuClient';
import PageCanvas from '@/components/layout/PageCanvas';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const currentUser = await getCurrentUserWithRoles();

  if (!currentUser) {
    redirect('/login?redirect=/menu');
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, phone')
    .eq('id', currentUser.id)
    .maybeSingle();

  const roleLabel: 'ADMIN' | 'CLUB ADMIN' | 'MEMBER' = (currentUser.isSuperAdmin || currentUser.isAdmin)
    ? 'ADMIN'
    : currentUser.isClubAdmin
      ? 'CLUB ADMIN'
      : 'MEMBER';

  const user = {
    id: profile?.id ?? currentUser.id,
    email: profile?.email ?? currentUser.email,
    name: profile?.name ?? currentUser.name ?? '사용자',
    phone: profile?.phone ?? '',
    roleLabel,
    canAccessAdmin: Boolean(currentUser.isSuperAdmin || currentUser.isAdmin || currentUser.isClubAdmin),
  };

  return (
    <PageCanvas>
      <MenuClient user={user} />
    </PageCanvas>
  );
}
