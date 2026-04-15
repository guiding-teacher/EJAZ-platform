import { supabase, getCurrentAdmin } from './supabase-config.js';

// ==================== تسجيل الدخول ====================
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    errorMessage.textContent = '';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // التحقق من إكمال الملف الشخصي
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('name')
        .eq('id', data.user.id)
        .single();

      if (adminError || !adminData?.name) {
        // لم يكمل الملف الشخصي بعد
        window.location.href = 'complete-profile.html';
      } else {
        window.location.href = 'admin.html';
      }
    } catch (error) {
      console.error(error);
      errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
  });
}

// ==================== إنشاء حساب جديد ====================
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorMessage = document.getElementById('error-message');
    const signupButton = document.getElementById('signup-button');

    errorMessage.textContent = '';

    // التحقق من صحة البريد وكلمة المرور (نفس الشروط السابقة)
    const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      errorMessage.textContent = 'الرجاء إدخال بريد إلكتروني صالح.';
      return;
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      errorMessage.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على أحرف وأرقام.';
      return;
    }
    if (password !== confirmPassword) {
      errorMessage.textContent = 'كلمات المرور غير متطابقة.';
      return;
    }

    try {
      signupButton.disabled = true;
      signupButton.textContent = 'جاري الإنشاء...';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/complete-profile.html`,
        }
      });

      if (error) throw error;

      // إنشاء سجل فارغ في جدول admins (سيتم إكماله لاحقاً)
      if (data.user) {
        await supabase.from('admins').insert({
          id: data.user.id,
          email: email,
          name: '',
          phone: '',
          institution: '',
          governorate: '',
          status: 'pending'
        });
      }

      alert('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.');
      window.location.href = 'admin-login.html';
    } catch (error) {
      console.error(error);
      errorMessage.textContent = error.message;
      signupButton.disabled = false;
      signupButton.textContent = 'إنشاء حساب';
    }
  });
}

// ==================== إكمال الملف الشخصي ====================
const completeProfileForm = document.getElementById('complete-profile-form');
if (completeProfileForm) {
  // التحقق من أن المستخدم مسجل الدخول
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'admin-login.html';
  } else {
    document.getElementById('user-email-display').textContent = user.email;
    document.body.style.display = 'flex';
  }

  completeProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const institution = document.getElementById('institution').value.trim();
    const governorate = document.getElementById('governorate').value.trim();
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;

    if (!name || !phone || !institution || !governorate || !dob || !gender) {
      document.getElementById('error-message').textContent = 'جميع الحقول إجبارية.';
      return;
    }

    const { error } = await supabase
      .from('admins')
      .update({ name, phone, institution, governorate, dob, gender, status: 'active' })
      .eq('id', user.id);

    if (error) {
      console.error(error);
      document.getElementById('error-message').textContent = 'حدث خطأ أثناء حفظ البيانات.';
    } else {
      alert('تم حفظ بياناتك بنجاح!');
      window.location.href = 'admin.html';
    }
  });
}

// ==================== التحقق من حالة المستخدم وتوجيهه ====================
supabase.auth.onAuthStateChange(async (event, session) => {
  const currentPage = window.location.pathname.split('/').pop();
  const protectedPages = ['admin.html', 'complete-profile.html'];

  if (session?.user) {
    // المستخدم مسجل دخول
    const { data: adminData } = await supabase
      .from('admins')
      .select('name')
      .eq('id', session.user.id)
      .single();

    if (!adminData?.name && currentPage !== 'complete-profile.html') {
      window.location.replace('complete-profile.html');
    } else if (adminData?.name && currentPage === 'complete-profile.html') {
      window.location.replace('admin.html');
    }
  } else {
    // غير مسجل دخول
    if (protectedPages.includes(currentPage)) {
      window.location.replace('admin-login.html');
    }
  }
});