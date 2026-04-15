// exam.js - النسخة النهائية لـ Supabase
import { supabase } from './supabase-config.js';

// --- State Variables ---
let examData = null;               // بيانات الاختبار من جدول exams
let questionsList = [];            // [{ id, text, points, is_mandatory, options: [{ id, text, is_correct }] }]
let currentQuestionIndex = -1;
let userAnswers = {};              // { questionId: optionId }
let questionOrder = [];            // ترتيب معرفات الأسئلة (قد يكون عشوائياً)
let timerInterval = null;
let examStartTime = new Date();
let examDurationSeconds = 3600;    // القيمة الافتراضية
let warning10minShown = false;
let warning5minShown = false;

// --- Session Data ---
const studentName = sessionStorage.getItem('studentName');
const studentId = sessionStorage.getItem('studentId');
const examId = sessionStorage.getItem('examId');

// --- DOM Elements ---
const examInfoDiv = document.getElementById('exam-info');
const timerDiv = document.getElementById('timer');
const currentDateDiv = document.getElementById('current-date');
const questionIndexList = document.getElementById('question-index-list');
const questionNumberH3 = document.getElementById('question-number');
const questionTextP = document.getElementById('question-text');
const optionsListUl = document.getElementById('options-list');
const finishExamBtn = document.getElementById('finish-exam-btn');
const finishConfirmModal = document.getElementById('finish-confirm-modal');
const finishCodeInput = document.getElementById('finish-code-input');
const confirmFinishBtn = document.getElementById('confirm-finish-btn');
const finishErrorMessage = document.getElementById('finish-error-message');
const resultsModal = document.getElementById('results-modal');
const decreaseFontBtn = document.getElementById('decrease-font');
const increaseFontBtn = document.getElementById('increase-font');

// ==================== Helper Functions ====================
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showTimeWarning(message) {
    const warningModal = document.getElementById('time-warning-modal');
    if (warningModal) {
        document.getElementById('time-warning-message').textContent = message;
        warningModal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ==================== Core Functions ====================
async function loadExamData() {
    if (!studentId || !examId) {
        alert('بيانات الجلسة غير موجودة. يرجى تسجيل الدخول مرة أخرى.');
        window.location.href = 'index.html';
        return;
    }

    try {
        // 1. جلب بيانات الاختبار
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single();

        if (examError || !exam) throw new Error('الاختبار غير موجود');
        examData = exam;
        examDurationSeconds = exam.duration;
        examInfoDiv.textContent = `اختبار: ${examData.title} - الطالب: ${studentName}`;
        currentDateDiv.textContent = `التاريخ: ${new Date().toLocaleString('ar-EG')}`;

        // 2. جلب الأسئلة مع خياراتها
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select(`
                id,
                text,
                points,
                is_mandatory,
                order_index,
                options ( id, text, is_correct, order_index )
            `)
            .eq('exam_id', examId)
            .order('order_index', { ascending: true });

        if (qError) throw qError;
        if (!questions || questions.length === 0) throw new Error('لا توجد أسئلة في هذا الاختبار');

        // تنظيم البيانات
        questionsList = questions.map(q => ({
            id: q.id,
            text: q.text,
            points: q.points || 1,
            is_mandatory: q.is_mandatory || false,
            options: (q.options || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        }));

        // 3. التحقق من مشاركة الطالب
        const { data: participant, error: pError } = await supabase
            .from('participants')
            .select('status, answers, start_time, end_time, score, total_possible_points, percentage, passed')
            .eq('exam_id', examId)
            .eq('student_id', studentId)
            .maybeSingle();

        if (pError && pError.code !== 'PGRST116') throw pError;

        // إذا كان الاختبار قد اكتمل سابقاً
        if (participant && (participant.status === 'finished' || participant.status === 'timed_out')) {
            if (examData.show_results !== false && participant.percentage !== undefined) {
                // عرض النتيجة المخزنة
                const totalQuestions = questionsList.length;
                const correctAnswersCount = Object.values(participant.answers || {}).filter((ans, idx) => {
                    const q = questionsList.find(q => q.id === Object.keys(participant.answers || {})[idx]);
                    if (!q) return false;
                    const correctOption = q.options.find(opt => opt.is_correct);
                    return correctOption && ans === correctOption.id;
                }).length;
                showResults({
                    correctAnswersCount,
                    totalQuestions,
                    percentage: participant.percentage,
                    score: participant.score,
                    totalPossible: participant.total_possible_points
                });
            } else {
                alert('لقد أكملت هذا الاختبار بالفعل ولا يمكنك إعادته.');
                window.location.href = 'index.html';
            }
            disableExam();
            return;
        }

        // 4. استعادة الحالة إذا كان الاختبار قد بدأ ولم يكتمل
        let answers = {};
        let remainingSeconds = examDurationSeconds;

        if (participant && participant.status === 'started' && participant.start_time) {
            answers = participant.answers || {};
            const elapsed = (new Date() - new Date(participant.start_time)) / 1000;
            remainingSeconds = Math.max(0, examDurationSeconds - elapsed);
            if (remainingSeconds <= 0) {
                await finishExam(true);
                return;
            }
            // بدء المؤقت بالوقت المتبقي
            startTimer(remainingSeconds);
        } else {
            // بداية جديدة: إنشاء سجل مشاركة
            const { error: insertError } = await supabase
                .from('participants')
                .insert({
                    exam_id: examId,
                    student_id: studentId,
                    status: 'started',
                    start_time: new Date().toISOString(),
                    answers: {}
                });
            if (insertError) throw insertError;
            startTimer(examDurationSeconds);
        }

        userAnswers = answers;

        // ترتيب الأسئلة (عشوائي إذا كان مطلوباً)
        if (examData.randomize_questions) {
            questionOrder = [...questionsList.map(q => q.id)].sort(() => Math.random() - 0.5);
        } else {
            questionOrder = questionsList.map(q => q.id);
        }

        populateQuestionList();
        if (questionOrder.length > 0) displayQuestion(0);

    } catch (error) {
        console.error('Error loading exam:', error);
        alert(`حدث خطأ أثناء تحميل الاختبار: ${error.message}`);
        window.location.href = 'index.html';
    }
}

function startTimer(secondsLeft) {
    const endTime = Date.now() + secondsLeft * 1000;

    timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        timerDiv.textContent = `الوقت المتبقي: ${formatTime(remaining)}`;

        // تحذيرات الوقت
        if (remaining <= 600 && !warning10minShown) {
            showTimeWarning('الوقت المتبقي أقل من 10 دقائق!');
            warning10minShown = true;
        }
        if (remaining <= 300 && !warning5minShown) {
            showTimeWarning('الوقت المتبقي أقل من 5 دقائق!');
            warning5minShown = true;
        }

        if (remaining <= 0) {
            clearInterval(timerInterval);
            finishExam(true);
        }
    }, 1000);
}

async function finishExam(isTimeUp = false) {
    clearInterval(timerInterval);

    // التأكد من الإجابة على الأسئلة الإجبارية (ما لم يكن الوقت قد انتهى)
    if (!isTimeUp) {
        const mandatoryQuestions = questionsList.filter(q => q.is_mandatory);
        const unansweredMandatory = mandatoryQuestions.filter(q => userAnswers[q.id] === undefined);
        if (unansweredMandatory.length > 0) {
            alert(`الرجاء الإجابة على جميع الأسئلة الإجبارية (المميزة بـ *) قبل إنهاء الاختبار. عدد الأسئلة المتبقية: ${unansweredMandatory.length}`);
            return;
        }
    }

    // حساب النتيجة
    let totalScore = 0;
    let totalPossiblePoints = 0;
    let correctAnswersCount = 0;

    for (const q of questionsList) {
        totalPossiblePoints += q.points;
        const selectedOptionId = userAnswers[q.id];
        const correctOption = q.options.find(opt => opt.is_correct === true);
        if (selectedOptionId && correctOption && selectedOptionId === correctOption.id) {
            totalScore += q.points;
            correctAnswersCount++;
        }
    }

    const percentage = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;
    const passed = percentage >= examData.passing_percentage;
    const statusText = passed ? 'ناجح' : 'راسب';
    const finalStatus = isTimeUp ? 'timed_out' : 'finished';

    try {
        // تحديث جدول participants
        const { error: updateError } = await supabase
            .from('participants')
            .update({
                status: finalStatus,
                end_time: new Date().toISOString(),
                score: totalScore,
                total_possible_points: totalPossiblePoints,
                percentage: percentage,
                passed: passed,
                answers: userAnswers
            })
            .eq('exam_id', examId)
            .eq('student_id', studentId);

        if (updateError) throw updateError;

        // تسجيل في سجل الاختبارات العام (exam_log)
        const { error: logError } = await supabase
            .from('exam_log')
            .insert({
                admin_id: examData.admin_id,
                student_id: studentId,
                student_name: studentName,
                exam_id: examId,
                exam_title: examData.title,
                score: totalScore,
                total_possible_points: totalPossiblePoints,
                percentage: percentage,
                passed: passed,
                status_text: statusText,
                end_time: new Date().toISOString()
            });

        if (logError) console.error('Error saving to exam_log:', logError);

    } catch (error) {
        console.error('Error finishing exam:', error);
        alert('حدث خطأ أثناء حفظ النتيجة. يرجى إبلاغ المشرف.');
    }

    // تعطيل واجهة الاختبار
    disableExam();

    // عرض النتيجة إذا كان مسموحاً
    if (examData.show_results !== false) {
        showResults({
            correctAnswersCount,
            totalQuestions: questionsList.length,
            percentage: percentage,
            score: totalScore,
            totalPossible: totalPossiblePoints
        });
    } else {
        alert('تم إنهاء الاختبار بنجاح. سيتم إعلامك بالنتيجة لاحقاً.');
        window.location.href = 'index.html';
    }
}

function populateQuestionList() {
    questionIndexList.innerHTML = '';
    questionOrder.forEach((qId, idx) => {
        const question = questionsList.find(q => q.id === qId);
        if (!question) return;
        const li = document.createElement('li');
        li.textContent = `س ${idx + 1}${question.is_mandatory ? ' *' : ''}`;
        li.dataset.questionIndex = idx;
        li.dataset.questionId = qId;
        if (userAnswers[qId] !== undefined) li.classList.add('answered');
        li.addEventListener('click', () => displayQuestion(idx));
        questionIndexList.appendChild(li);
    });
}

function displayQuestion(index) {
    if (index < 0 || index >= questionOrder.length) return;
    currentQuestionIndex = index;
    const qId = questionOrder[index];
    const question = questionsList.find(q => q.id === qId);
    if (!question) return;

    const mandatoryMark = question.is_mandatory ? ' <span style="color:red; font-weight:bold;">* (إجباري)</span>' : '';
    questionNumberH3.innerHTML = `السؤال ${index + 1} من ${questionOrder.length}${mandatoryMark}`;
    questionTextP.textContent = question.text;

    optionsListUl.innerHTML = '';
    question.options.forEach(option => {
        const li = document.createElement('li');
        const radioId = `q_${qId}_opt_${option.id}`;
        li.innerHTML = `
            <input type="radio" name="question_${index}" id="${radioId}" value="${option.id}" data-question-id="${qId}" ${userAnswers[qId] === option.id ? 'checked' : ''}>
            <label for="${radioId}">${option.text}</label>
        `;
        optionsListUl.appendChild(li);
    });

    // إضافة مستمعي الأحداث للإجابات
    optionsListUl.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', handleAnswerSelection);
    });

    // تحديث حالة النشاط في القائمة الجانبية
    document.querySelectorAll('#question-index-list li').forEach(li => {
        li.classList.remove('active');
        if (parseInt(li.dataset.questionIndex) === index) li.classList.add('active');
    });
}

async function handleAnswerSelection(event) {
    const selectedOptionId = event.target.value;
    const qId = event.target.dataset.questionId;

    // تحديث الحالة المحلية
    userAnswers[qId] = selectedOptionId;

    // تحديث القائمة الجانبية (تغيير لون السؤال إلى مجاب)
    const listItem = document.querySelector(`#question-index-list li[data-question-id="${qId}"]`);
    if (listItem) listItem.classList.add('answered');

    // حفظ الإجابة في قاعدة البيانات بشكل تدريجي
    try {
        const { error } = await supabase
            .from('participants')
            .update({ answers: userAnswers })
            .eq('exam_id', examId)
            .eq('student_id', studentId);
        if (error) console.error('Error saving answer:', error);
    } catch (err) {
        console.error('Failed to save answer:', err);
    }
}

function showResults(data) {
    document.getElementById('result-exam-title').textContent = examData.title || 'نتيجة الاختبار';
    document.getElementById('result-correct-count').textContent = data.correctAnswersCount;
    document.getElementById('result-total-questions').textContent = data.totalQuestions;
    document.getElementById('result-final-score').textContent = data.percentage.toFixed(2);
    resultsModal.style.display = 'flex';
}

function disableExam() {
    // تعطيل جميع عناصر الإدخال
    document.querySelectorAll('input[type="radio"]').forEach(radio => radio.disabled = true);
    finishExamBtn.disabled = true;
    decreaseFontBtn.disabled = true;
    increaseFontBtn.disabled = true;
    if (questionIndexList) questionIndexList.style.pointerEvents = 'none';
    if (optionsListUl) optionsListUl.style.pointerEvents = 'none';
}

function changeFontSize(delta) {
    const currentSize = parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('font-size'));
    const newSize = currentSize + delta;
    if (newSize >= 12 && newSize <= 28) {
        document.body.style.fontSize = newSize + 'px';
    }
}

// ==================== أحداث واجهة المستخدم ====================
function showFinishConfirmation() {
    finishCodeInput.value = '';
    finishErrorMessage.textContent = '';
    finishConfirmModal.style.display = 'flex';
}

async function handleFinishConfirmation() {
    const enteredCode = finishCodeInput.value.trim();
    if (enteredCode === examData.finish_code) {
        finishConfirmModal.style.display = 'none';
        await finishExam(false);
    } else {
        finishErrorMessage.textContent = 'رمز الإنهاء غير صحيح.';
    }
}

// ربط الأحداث
finishExamBtn.addEventListener('click', showFinishConfirmation);
confirmFinishBtn.addEventListener('click', handleFinishConfirmation);
decreaseFontBtn.addEventListener('click', () => changeFontSize(-1));
increaseFontBtn.addEventListener('click', () => changeFontSize(1));
document.getElementById('retake-exam-btn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
});
document.getElementById('wrong-answers-btn')?.addEventListener('click', () => {
    alert('هذه الميزة قيد التطوير حاليًا!');
});

// بدء تحميل الاختبار
loadExamData();