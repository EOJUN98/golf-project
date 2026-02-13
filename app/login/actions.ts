'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';

/**
 * Server action for user login
 */
export async function login(formData: FormData) {
  const supabase = await createSupabaseServerActionClient();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const redirectToRaw = String(formData.get('redirectTo') || '/');
  const redirectTo = redirectToRaw.startsWith('/') ? redirectToRaw : '/';

  // Validation
  if (!email || !password) {
    redirect('/login?message=이메일과 비밀번호를 입력해주세요');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error);
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  if (!data.user) {
    redirect('/login?message=로그인에 실패했습니다');
  }

  // Revalidate all pages to update auth state
  revalidatePath('/', 'layout');

  // Redirect to requested page (e.g. /admin), fallback to home.
  redirect(redirectTo);
}

/**
 * Server action for user signup
 */
export async function signup(formData: FormData) {
  const supabase = await createSupabaseServerActionClient();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();

  // Validation
  if (!email || !password) {
    redirect('/login?message=이메일과 비밀번호를 입력해주세요');
  }

  if (!name) {
    redirect('/login?message=이름을 입력해주세요');
  }

  if (password.length < 6) {
    redirect('/login?message=비밀번호는 6자 이상이어야 합니다');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: phone || null,
      },
    },
  });

  if (error) {
    console.error('Signup error:', error);
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  if (!data.user) {
    redirect('/login?message=회원가입에 실패했습니다');
  }

  // Success - redirect to login page with success message
  redirect('/login?message=회원가입이 완료되었습니다. 로그인해주세요.');
}

/**
 * Server action for user logout
 */
export async function logout() {
  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout error:', error);
  }

  // Revalidate all pages to update auth state
  revalidatePath('/', 'layout');

  // Redirect to home page
  redirect('/');
}
