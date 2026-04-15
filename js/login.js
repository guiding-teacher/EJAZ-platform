import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const examIdFromUrl = urlParams.get('exam');

if (!examIdFromUrl) {
  document.querySelector('.login-container').innerHTML = "<h2>خطأ</h2><p>الرجاء استخدام رابط الاختبار الصحيح.</p>";
}

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('student-name').value.trim();
  const code = document.getElementById('access-code').value.trim();
  const errorMessage = document.getElementById('error-message');
  errorMessage.textContent = '';

  try {
    // 1. جلب بيانات الاختبار
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('admin_id, show_results, title')
      .eq('id', examIdFromUrl)
      .single();

    if (examError || !exam) throw new Error('الاختبار غير موجود');

    // 2. البحث عن الطالب
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, access_code')
      .eq('name', name)
      .eq('access_code', code)
      .eq('admin_id', exam.admin_id)
      .maybeSingle();

    if (studentError || !student) {
      errorMessage.textContent = 'الاسم أو رمز الدخول غير صحيح.';
      return;
    }

    // 3. التحقق من المشاركة
    const { data: participant, error: partError } = await supabase
      .from('participants')
      .select('status')
      .eq('exam_id', examIdFromUrl)
      .eq('student_id', student.id)
      .maybeSingle();

    if (partError || !participant) {
      errorMessage.textContent = 'أنت غير معين لهذا الاختبار.';
      return;
    }

    // 4. إذا كان الاختبار منتهياً والمشرف يمنع رؤية النتيجة
    if ((participant.status === 'finished' || participant.status === 'timed_out') && exam.show_results === false) {
      errorMessage.textContent = 'لقد أكملت هذا الاختبار بالفعل ولا يمكن إعادته.';
      return;
    }

    // 5. حفظ الجلسة والتوجيه
    sessionStorage.setItem('studentName', name);
    sessionStorage.setItem('studentId', student.id);
    sessionStorage.setItem('examId', examIdFromUrl);
    window.location.href = 'start.html';

  } catch (error) {
    console.error(error);
    errorMessage.textContent = 'حدث خطأ. حاول مرة أخرى.';
  }
});