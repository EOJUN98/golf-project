'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Server action for user login
 */
export async function login(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validation
  if (!email || !password) {
    return redirect('/login?message=이메일과 비밀번호를 입력해주세요');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return redirect(`/login?message=${encodeURIComponent(error.message)}`);
    }

    if (!data.user) {
      return redirect('/login?message=로그인에 실패했습니다');
    }

    // Revalidate all pages to update auth state
    revalidatePath('/', 'layout');

    // Redirect to home page
    return redirect('/');
  } catch (error) {
    console.error('Unexpected login error:', error);
    return redirect('/login?message=로그인 중 오류가 발생했습니다');
  }
}

/**
 * Server action for user signup
 */
export async function signup(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;

  // Validation
  if (!email || !password) {
    return redirect('/login?message=이메일과 비밀번호를 입력해주세요');
  }

  if (!name) {
    return redirect('/login?message=이름을 입력해주세요');
  }

  if (password.length < 6) {
    return redirect('/login?message=비밀번호는 6자 이상이어야 합니다');
  }

  try {
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
      return redirect(`/login?message=${encodeURIComponent(error.message)}`);
    }

    if (!data.user) {
      return redirect('/login?message=회원가입에 실패했습니다');
    }

    // Success - redirect to login page with success message
    return redirect('/login?message=회원가입이 완료되었습니다. 로그인해주세요.');
  } catch (error) {
    console.error('Unexpected signup error:', error);
    return redirect('/login?message=회원가입 중 오류가 발생했습니다');
  }
}

/**
 * Server action for user logout
 */
export async function logout() {
  const supabase = createSupabaseServerClient();
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    }

    // Revalidate all pages to update auth state
    revalidatePath('/', 'layout');

    // Redirect to home page
    return redirect('/');
  } catch (error) {
    console.error('Unexpected logout error:', error);
    return redirect('/');
  }
}
