// =====================================================
// admin.js - كامل ومهيأ لـ Supabase
// =====================================================
import { supabase } from './supabase-config.js';

// --- DOM Element Variables ---
let examsTableBody, studentsTableGlobalBody, examLogTableBody, successLogTableBody, failureLogTableBody,
    addEditExamForm, addEditStudentFormGlobal, addEditQuestionForm,
    questionManagementSection, participantManagementSection, statisticsSection, settingsSection,
    selectedExamTitleSpan, currentEditingExamIdInput, questionFormTitle,
    questionIdInput, questionTextInput, questionPointsInput, questionIsMandatoryCheckbox,
    questionOptionsContainer, selectedExamTitleParticipantsSpan, currentManagingParticipantsExamIdInput,
    assignStudentSelect, assignStudentFeedback, participantsTableBody, selectedExamTitleStatsSpan,
    currentStatsExamIdInput, statsTotalParticipants, statsAvgPercentage, statsPassedCount,
    statsPassingCriteria, questionStatsTableBody, examIdInput, examTitleInput,
    examDurationInput, examFinishCodeInput, examPassingPercentageInput, examShowResultsCheckbox,
    examRandomizeQuestionsCheckbox, studentIdGlobalInput, studentNameGlobalInput, studentMotherNameGlobalInput,
    studentSequenceGlobalInput, studentCodeGlobalInput, studentFormTitleGlobal, studentFileInput,
    resultsDistributionChartCtx, questionsTableBody, adminNameDisplay,
    sidebarAdminName, sidebarAdminEmail, sidebarAdminPhone, sidebarAdminInstitution, sidebarAdminGovernorate,
    settingsAdminName, settingsAdminEmail, settingsAdminPhone,
    settingsAdminInstitution, settingsAdminGovernorate, settingsAdminDob, settingsAdminGender, settingsAdminCreated,
    editProfileBtn, editProfileForm, profileDisplay, adminNameInput, adminPhoneInput,
    adminInstitutionInput, adminGovernorateInput, adminDobInput, adminGenderInput, updateProfileBtn,
    currentPasswordInput, newPasswordInput, confirmNewPasswordInput, changePasswordBtn, passwordChangeFeedback;

// --- Global State ---
let questionOptionCount = 0;
let resultsChart = null;
let allExamsCache = {};
let allStudentsCache = [];
let currentAdminId = null;
let currentAdminData = null;
let activityTimer;

// =================================================================
// --- Helper Functions (Supabase) ---
// =================================================================
async function getCurrentAdminData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('admins').select('*').eq('id', user.id).single();
    if (error) return null;
    return data;
}

function handleSupabaseError(error, context) {
    console.error(`Error in ${context}:`, error);
    let message = 'حدث خطأ غير متوقع';
    if (error.message) message = error.message;
    alert(message);
    return message;
}

// =================================================================
// --- INITIALIZATION & AUTHENTICATION (Supabase) ---
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            currentAdminId = session.user.id;
            try {
                await loadAdminData();
                initializeDOMReferences();
                addEventListeners();
                updateAdminInfoDisplay();
                setupActivityMonitoring();
                showMainContent('exams-section');
                loadExams();
                loadAllStudents();
                loadExamLog();
            } catch (error) {
                console.error("Error during app initialization:", error);
                alert("حدث خطأ حرج أثناء تهيئة التطبيق.");
                handleLogout();
            }
        } else {
            window.location.replace('admin-login.html');
        }
    });
});

async function loadAdminData() {
    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', currentAdminId)
        .single();
    if (error) throw error;
    currentAdminData = data;
    // تحديث آخر تسجيل دخول
    await supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', currentAdminId);
}

function updateAdminInfoDisplay() {
    if (!currentAdminData) return;
    const adminName = currentAdminData.name || "مشرف";
    const adminEmail = currentAdminData.email || "";

    if (adminNameDisplay) adminNameDisplay.textContent = adminName;
    if (sidebarAdminName) sidebarAdminName.textContent = adminName;
    if (sidebarAdminEmail) sidebarAdminEmail.textContent = adminEmail;
    if (sidebarAdminPhone) sidebarAdminPhone.textContent = currentAdminData.phone || "لم يحدد";
    if (sidebarAdminInstitution) sidebarAdminInstitution.textContent = currentAdminData.institution || "لم يحدد";
    if (sidebarAdminGovernorate) sidebarAdminGovernorate.textContent = currentAdminData.governorate || "لم يحدد";

    if (settingsAdminName) settingsAdminName.textContent = adminName;
    if (settingsAdminEmail) settingsAdminEmail.textContent = adminEmail;
    if (settingsAdminPhone) settingsAdminPhone.textContent = currentAdminData.phone || "لم يحدد";
    if (settingsAdminInstitution) settingsAdminInstitution.textContent = currentAdminData.institution || "لم يحدد";
    if (settingsAdminGovernorate) settingsAdminGovernorate.textContent = currentAdminData.governorate || "لم يحدد";
    if (settingsAdminDob) settingsAdminDob.textContent = currentAdminData.dob || "لم يحدد";
    if (settingsAdminGender) {
        if (currentAdminData.gender === 'male') settingsAdminGender.textContent = 'ذكر';
        else if (currentAdminData.gender === 'female') settingsAdminGender.textContent = 'أنثى';
        else settingsAdminGender.textContent = 'لم يحدد';
    }
    if (settingsAdminCreated) {
        settingsAdminCreated.textContent = currentAdminData.created_at ? new Date(currentAdminData.created_at).toLocaleDateString('ar-EG') : "غير معروف";
    }
}

function initializeDOMReferences() {
    // نفس العناصر كما في النسخة الأصلية
    examsTableBody = document.querySelector('#exams-table tbody');
    studentsTableGlobalBody = document.querySelector('#students-table-global tbody');
    examLogTableBody = document.querySelector('#exam-log-table tbody');
    successLogTableBody = document.querySelector('#success-log-table tbody');
    failureLogTableBody = document.querySelector('#failure-log-table tbody');
    questionsTableBody = document.querySelector('#questions-table tbody');
    participantsTableBody = document.querySelector('#participants-table tbody');
    questionStatsTableBody = document.querySelector('#question-stats-table tbody');
    addEditExamForm = document.getElementById('add-edit-exam-form');
    addEditStudentFormGlobal = document.getElementById('add-edit-student-form-global');
    addEditQuestionForm = document.getElementById('add-edit-question-form');
    examIdInput = document.getElementById('exam-id');
    examTitleInput = document.getElementById('exam-title');
    examDurationInput = document.getElementById('exam-duration');
    examFinishCodeInput = document.getElementById('exam-finish-code');
    examPassingPercentageInput = document.getElementById('exam-passing-percentage');
    examShowResultsCheckbox = document.getElementById('exam-show-results');
    examRandomizeQuestionsCheckbox = document.getElementById('exam-randomize-questions');
    studentIdGlobalInput = document.getElementById('student-id-global');
    studentNameGlobalInput = document.getElementById('student-name-global');
    studentMotherNameGlobalInput = document.getElementById('student-mother-name-global');
    studentSequenceGlobalInput = document.getElementById('student-sequence-global');
    studentCodeGlobalInput = document.getElementById('student-code-global');
    studentFormTitleGlobal = document.getElementById('student-form-title-global');
    studentFileInput = document.getElementById('student-file-input');
    selectedExamTitleSpan = document.getElementById('selected-exam-title');
    currentEditingExamIdInput = document.getElementById('current-editing-exam-id');
    questionFormTitle = document.getElementById('question-form-title');
    questionIdInput = document.getElementById('question-id');
    questionTextInput = document.getElementById('question-text-input');
    questionPointsInput = document.getElementById('question-points');
    questionIsMandatoryCheckbox = document.getElementById('question-is-mandatory');
    questionOptionsContainer = document.getElementById('question-options-container');
    selectedExamTitleParticipantsSpan = document.getElementById('selected-exam-title-participants');
    currentManagingParticipantsExamIdInput = document.getElementById('current-managing-participants-exam-id');
    assignStudentSelect = document.getElementById('assign-student-select');
    assignStudentFeedback = document.getElementById('assign-student-feedback');
    selectedExamTitleStatsSpan = document.getElementById('selected-exam-title-stats');
    currentStatsExamIdInput = document.getElementById('current-stats-exam-id');
    statsTotalParticipants = document.getElementById('stats-total-participants');
    statsAvgPercentage = document.getElementById('stats-avg-percentage');
    statsPassedCount = document.getElementById('stats-passed-count');
    statsPassingCriteria = document.getElementById('stats-passing-criteria');
    resultsDistributionChartCtx = document.getElementById('results-distribution-chart')?.getContext('2d');
    adminNameDisplay = document.getElementById('admin-name-display');
    sidebarAdminName = document.getElementById('sidebar-admin-name');
    sidebarAdminEmail = document.getElementById('sidebar-admin-email');
    sidebarAdminPhone = document.getElementById('sidebar-admin-phone');
    sidebarAdminInstitution = document.getElementById('sidebar-admin-institution');
    sidebarAdminGovernorate = document.getElementById('sidebar-admin-governorate');
    settingsAdminName = document.getElementById('settings-admin-name');
    settingsAdminEmail = document.getElementById('settings-admin-email');
    settingsAdminPhone = document.getElementById('settings-admin-phone');
    settingsAdminInstitution = document.getElementById('settings-admin-institution');
    settingsAdminGovernorate = document.getElementById('settings-admin-governorate');
    settingsAdminDob = document.getElementById('settings-admin-dob');
    settingsAdminGender = document.getElementById('settings-admin-gender');
    settingsAdminCreated = document.getElementById('settings-admin-created');
    editProfileBtn = document.getElementById('edit-profile-btn');
    editProfileForm = document.getElementById('edit-profile-form');
    profileDisplay = document.getElementById('profile-display');
    adminNameInput = document.getElementById('admin-name-input');
    adminPhoneInput = document.getElementById('admin-phone-input');
    adminInstitutionInput = document.getElementById('admin-institution-input');
    adminGovernorateInput = document.getElementById('admin-governorate-input');
    adminDobInput = document.getElementById('admin-dob-input');
    adminGenderInput = document.getElementById('admin-gender-input');
    updateProfileBtn = document.getElementById('update-profile-btn');
    currentPasswordInput = document.getElementById('current-password-input');
    newPasswordInput = document.getElementById('new-password-input');
    confirmNewPasswordInput = document.getElementById('confirm-new-password-input');
    changePasswordBtn = document.getElementById('change-password-btn');
    passwordChangeFeedback = document.getElementById('password-change-feedback');

    setupResultEventListeners();
}

function addEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('menu-toggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('sidebar-visible'));
    document.getElementById('export-log-btn').addEventListener('click', exportFullLogToExcel);
    document.getElementById('delete-log-btn').addEventListener('click', deleteAllLogs);
    document.getElementById('export-success-log-btn').addEventListener('click', exportSuccessLogToExcel);
    document.getElementById('export-failure-log-btn').addEventListener('click', exportFailureLogToExcel);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('onclick').match(/'([^']+)'/)[1];
            showMainContent(sectionId);
        });
    });
    document.getElementById('show-add-exam-form').addEventListener('click', showAddExamForm);
    document.getElementById('save-exam-btn').addEventListener('click', saveExam);
    document.getElementById('show-add-student-form-global').addEventListener('click', showAddStudentForm);
    document.getElementById('save-student-btn-global').addEventListener('click', saveStudentGlobal);
    if (studentFileInput) studentFileInput.addEventListener('change', handleStudentFileUpload);
    document.getElementById('show-add-question-form').addEventListener('click', showAddQuestionForm);
    document.getElementById('save-question-btn').addEventListener('click', saveQuestion);
    document.getElementById('add-option-btn').addEventListener('click', () => addOptionInput());
    document.getElementById('assign-student-btn').addEventListener('click', assignStudentToExam);
    document.getElementById('assign-all-students-btn').addEventListener('click', assignAllUnassignedStudents);
    if (editProfileBtn) editProfileBtn.addEventListener('click', showEditProfileForm);
    if (updateProfileBtn) updateProfileBtn.addEventListener('click', updateAdminProfile);
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', handleChangePassword);
}

// =================================================================
// --- EXAM MANAGEMENT (Supabase) ---
// =================================================================
async function loadExams() {
    examsTableBody.innerHTML = '<tr><td colspan="7">جاري التحميل...</td></tr>';
    try {
        const { data: exams, error } = await supabase
            .from('exams')
            .select('*')
            .eq('admin_id', currentAdminId)
            .order('title');
        if (error) throw error;
        examsTableBody.innerHTML = '';
        allExamsCache = {};
        if (!exams || exams.length === 0) {
            examsTableBody.innerHTML = '<tr><td colspan="7">لا توجد اختبارات. قم بإضافة اختبار جديد.</td></tr>';
            return;
        }
        for (const exam of exams) {
            allExamsCache[exam.id] = exam;
            const examLink = generateExamLink(exam.id);
            const row = examsTableBody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(exam.title)}</td>
                <td><button class="btn-copy" onclick="copyToClipboard('${examLink}')">نسخ الرابط</button></td>
                <td>${exam.duration / 60} دقيقة</td>
                <td><button class="btn-edit" onclick="showQuestionManagement('${exam.id}', '${escapeHtml(exam.title).replace(/'/g, "\\'")}')">الأسئلة</button></td>
                <td><button class="btn-assign" onclick="showParticipantManagement('${exam.id}', '${escapeHtml(exam.title).replace(/'/g, "\\'")}')">الطلاب</button></td>
                <td><button class="btn-view" onclick="showStatistics('${exam.id}', '${escapeHtml(exam.title).replace(/'/g, "\\'")}')">الإحصائيات</button></td>
                <td><button class="btn-edit" onclick="editExam('${exam.id}')">تعديل</button><button class="btn-delete" onclick="deleteExam('${exam.id}')">حذف</button></td>
            `;
        }
    } catch (error) {
        handleSupabaseError(error, 'loadExams');
        examsTableBody.innerHTML = '<tr><td colspan="7">خطأ في تحميل الاختبارات.</td></tr>';
    }
}

function showAddExamForm() {
    document.getElementById('exam-form-title').textContent = 'إضافة اختبار جديد';
    examIdInput.value = '';
    examTitleInput.value = '';
    examDurationInput.value = '60';
    examFinishCodeInput.value = '';
    examPassingPercentageInput.value = '50';
    examShowResultsCheckbox.checked = true;
    examRandomizeQuestionsCheckbox.checked = false;
    addEditExamForm.classList.remove('hidden');
}

async function saveExam() {
    const title = examTitleInput.value.trim();
    const duration = parseInt(examDurationInput.value) * 60;
    const finishCode = examFinishCodeInput.value.trim();
    const passingPercentage = parseInt(examPassingPercentageInput.value);
    const showResults = examShowResultsCheckbox.checked;
    const randomizeQuestions = examRandomizeQuestionsCheckbox.checked;

    if (!title || !duration || !finishCode || isNaN(passingPercentage)) {
        alert("يرجى ملء جميع الحقول الأساسية بشكل صحيح.");
        return;
    }

    const examData = {
        title,
        duration,
        finish_code: finishCode,
        passing_percentage: passingPercentage,
        show_results: showResults,
        randomize_questions: randomizeQuestions,
        admin_id: currentAdminId,
        updated_at: new Date().toISOString()
    };

    try {
        if (examIdInput.value) {
            const { error } = await supabase.from('exams').update(examData).eq('id', examIdInput.value).eq('admin_id', currentAdminId);
            if (error) throw error;
        } else {
            examData.created_at = new Date().toISOString();
            const { error } = await supabase.from('exams').insert(examData);
            if (error) throw error;
        }
        alert("تم حفظ الاختبار بنجاح.");
        addEditExamForm.classList.add('hidden');
        loadExams();
    } catch (error) {
        handleSupabaseError(error, 'saveExam');
    }
}

async function editExam(examId) {
    const exam = allExamsCache[examId];
    if (exam) {
        addEditExamForm.classList.remove('hidden');
        document.getElementById('exam-form-title').textContent = 'تعديل الاختبار';
        examIdInput.value = examId;
        examTitleInput.value = exam.title;
        examDurationInput.value = exam.duration / 60;
        examFinishCodeInput.value = exam.finish_code;
        examPassingPercentageInput.value = exam.passing_percentage;
        examShowResultsCheckbox.checked = exam.show_results;
        examRandomizeQuestionsCheckbox.checked = exam.randomize_questions;
        window.scrollTo(0, 0);
    }
}

async function deleteExam(examId) {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار وكل بياناته؟')) return;
    try {
        const { error } = await supabase.from('exams').delete().eq('id', examId).eq('admin_id', currentAdminId);
        if (error) throw error;
        alert('تم حذف الاختبار.');
        loadExams();
    } catch (error) {
        handleSupabaseError(error, 'deleteExam');
    }
}

// =================================================================
// --- STUDENT MANAGEMENT (Supabase) ---
// =================================================================
async function loadAllStudents() {
    studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">جاري التحميل...</td></tr>';
    try {
        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('admin_id', currentAdminId)
            .order('name');
        if (error) throw error;
        allStudentsCache = students || [];
        studentsTableGlobalBody.innerHTML = '';
        if (!students || students.length === 0) {
            studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">لا يوجد طلاب في النظام.</td></tr>';
            return;
        }
        students.forEach(student => {
            const row = studentsTableGlobalBody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.mother_name || '---')}</td>
                <td>${escapeHtml(student.sequence || '---')}</td>
                <td>${escapeHtml(student.access_code)}</td>
                <td><button class="btn-edit" onclick="editStudentGlobal('${student.id}')">تعديل</button><button class="btn-delete" onclick="deleteStudentGlobal('${student.id}')">حذف</button></td>
            `;
        });
    } catch (error) {
        handleSupabaseError(error, 'loadAllStudents');
        studentsTableGlobalBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل الطلاب.</td></tr>';
    }
}

function showAddStudentForm() {
    studentFormTitleGlobal.textContent = 'إضافة طالب جديد';
    studentIdGlobalInput.value = '';
    studentNameGlobalInput.value = '';
    studentMotherNameGlobalInput.value = '';
    studentSequenceGlobalInput.value = '';
    studentCodeGlobalInput.value = '';
    addEditStudentFormGlobal.classList.remove('hidden');
}

async function saveStudentGlobal() {
    const studentId = studentIdGlobalInput.value;
    const studentName = studentNameGlobalInput.value.trim();
    const motherName = studentMotherNameGlobalInput.value.trim();
    const sequence = studentSequenceGlobalInput.value.trim();
    let studentCode = studentCodeGlobalInput.value.trim();

    if (!studentName) {
        alert("الرجاء إدخال اسم الطالب.");
        return;
    }
    if (!studentCode) {
        studentCode = `C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6)}`;
    }

    const studentData = {
        name: studentName,
        mother_name: motherName,
        sequence,
        access_code: studentCode,
        admin_id: currentAdminId,
        updated_at: new Date().toISOString()
    };

    try {
        if (studentId) {
            const { error } = await supabase.from('students').update(studentData).eq('id', studentId).eq('admin_id', currentAdminId);
            if (error) throw error;
        } else {
            studentData.created_at = new Date().toISOString();
            const { error } = await supabase.from('students').insert(studentData);
            if (error) throw error;
        }
        alert(`تم حفظ الطالب ${studentName} بنجاح.`);
        addEditStudentFormGlobal.classList.add('hidden');
        loadAllStudents();
    } catch (error) {
        handleSupabaseError(error, 'saveStudentGlobal');
    }
}

async function editStudentGlobal(studentId) {
    const student = allStudentsCache.find(s => s.id === studentId);
    if (student) {
        addEditStudentFormGlobal.classList.remove('hidden');
        studentFormTitleGlobal.textContent = 'تعديل بيانات الطالب';
        studentIdGlobalInput.value = studentId;
        studentNameGlobalInput.value = student.name;
        studentMotherNameGlobalInput.value = student.mother_name || '';
        studentSequenceGlobalInput.value = student.sequence || '';
        studentCodeGlobalInput.value = student.access_code;
    }
}

async function deleteStudentGlobal(studentId) {
    if (confirm("هل أنت متأكد من حذف هذا الطالب نهائياً؟")) {
        try {
            const { error } = await supabase.from('students').delete().eq('id', studentId).eq('admin_id', currentAdminId);
            if (error) throw error;
            alert("تم حذف الطالب بنجاح.");
            loadAllStudents();
        } catch (error) {
            handleSupabaseError(error, 'deleteStudentGlobal');
        }
    }
}

async function handleStudentFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (json.length < 2) return alert("الملف فارغ أو لا يحتوي على بيانات.");
            const headers = json[0].map(h => h.toString().trim());
            const nameIndex = headers.indexOf('الاسم');
            const motherIndex = headers.indexOf('اسم الام');
            const seqIndex = headers.indexOf('التسلسل');
            if (nameIndex === -1) return alert("لم يتم العثور على عمود 'الاسم'.");

            const studentData = json.slice(1);
            const studentsToInsert = [];
            for (const row of studentData) {
                const name = row[nameIndex]?.toString().trim();
                if (!name) continue;
                const motherName = motherIndex > -1 ? (row[motherIndex]?.toString().trim() || '') : '';
                const sequence = seqIndex > -1 ? (row[seqIndex]?.toString().trim() || '') : '';
                const accessCode = `C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6)}`;
                studentsToInsert.push({
                    name,
                    mother_name: motherName,
                    sequence,
                    access_code: accessCode,
                    admin_id: currentAdminId,
                    created_at: new Date().toISOString()
                });
            }
            if (studentsToInsert.length) {
                const { error } = await supabase.from('students').insert(studentsToInsert);
                if (error) throw error;
                alert(`تم استيراد ${studentsToInsert.length} طالب بنجاح!`);
                loadAllStudents();
            }
        } catch (error) {
            handleSupabaseError(error, 'handleStudentFileUpload');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// =================================================================
// --- EXAM LOG (Supabase) ---
// =================================================================
async function loadExamLog() {
    examLogTableBody.innerHTML = '<tr><td colspan="6">جاري تحميل السجل...</td></tr>';
    try {
        const { data: logs, error } = await supabase
            .from('exam_log')
            .select('*')
            .eq('admin_id', currentAdminId)
            .order('end_time', { ascending: false });
        if (error) throw error;
        examLogTableBody.innerHTML = '';
        if (!logs || logs.length === 0) {
            examLogTableBody.innerHTML = '<tr><td colspan="6">لا توجد سجلات بعد.</td></tr>';
            return;
        }
        logs.forEach(log => {
            const endTime = new Date(log.end_time).toLocaleString('ar-EG');
            const row = examLogTableBody.insertRow();
            row.innerHTML = `
                <td>${endTime}</td>
                <td>${escapeHtml(log.student_name)}</td>
                <td>${escapeHtml(log.exam_title)}</td>
                <td>${log.score} / ${log.total_possible_points}</td>
                <td>${log.percentage}%</td>
                <td style="font-weight: bold; color: ${log.passed ? 'green' : 'red'};">${log.status_text}</td>
            `;
        });
    } catch (error) {
        handleSupabaseError(error, 'loadExamLog');
        examLogTableBody.innerHTML = '<tr><td colspan="6">خطأ في تحميل السجل.</td></tr>';
    }
}

async function deleteAllLogs() {
    const confirmation = prompt("للتأكيد، اكتب 'حذف' في المربع أدناه.");
    if (confirmation !== 'حذف') return;
    if (!confirm("تأكيد نهائي: هل أنت متأكد من حذف جميع السجلات؟")) return;
    try {
        const { error } = await supabase.from('exam_log').delete().eq('admin_id', currentAdminId);
        if (error) throw error;
        alert("تم حذف جميع السجلات بنجاح.");
        loadExamLog();
    } catch (error) {
        handleSupabaseError(error, 'deleteAllLogs');
    }
}

// =================================================================
// --- QUESTION MANAGEMENT (Supabase) ---
// =================================================================
async function showQuestionManagement(examId, examTitle) {
    showMainContent('question-management-section');
    selectedExamTitleSpan.textContent = examTitle;
    currentEditingExamIdInput.value = examId;
    addEditQuestionForm.classList.add('hidden');
    await loadQuestions(examId);
}

async function loadQuestions(examId) {
    questionsTableBody.innerHTML = '<tr><td colspan="5">جاري تحميل الأسئلة...</td></tr>';
    try {
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('*, options(*)')
            .eq('exam_id', examId)
            .order('order_index');
        if (qError) throw qError;
        if (!questions || questions.length === 0) {
            questionsTableBody.innerHTML = '<tr><td colspan="5">لا توجد أسئلة لهذا الاختبار.</td></tr>';
            return;
        }
        questionsTableBody.innerHTML = '';
        for (const q of questions) {
            const options = q.options || [];
            const correctOption = options.find(opt => opt.is_correct);
            const correctText = correctOption ? correctOption.text : 'غير محدد';
            const row = questionsTableBody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(q.text)}</td>
                <td>${q.points}</td>
                <td>${escapeHtml(correctText)}</td>
                <td>${q.is_mandatory ? 'نعم' : 'لا'}</td>
                <td><button class="btn-edit" onclick="editQuestion('${examId}', '${q.id}')">تعديل</button><button class="btn-delete" onclick="deleteQuestion('${examId}', '${q.id}')">حذف</button></td>
            `;
        }
    } catch (error) {
        handleSupabaseError(error, 'loadQuestions');
        questionsTableBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل الأسئلة.</td></tr>';
    }
}

function showAddQuestionForm() {
    questionFormTitle.textContent = 'إضافة سؤال جديد';
    questionIdInput.value = '';
    questionTextInput.value = '';
    questionPointsInput.value = '1';
    questionIsMandatoryCheckbox.checked = false;
    questionOptionsContainer.innerHTML = '';
    questionOptionCount = 0;
    addOptionInput();
    addOptionInput();
    addEditQuestionForm.classList.remove('hidden');
}

async function saveQuestion() {
    const examId = currentEditingExamIdInput.value;
    const qId = questionIdInput.value;
    const questionText = questionTextInput.value.trim();
    const points = parseInt(questionPointsInput.value);
    const isMandatory = questionIsMandatoryCheckbox.checked;

    const optionGroups = document.querySelectorAll('#question-options-container .option-group');
    const optionsTexts = [];
    let correctIndex = -1;
    optionGroups.forEach((group, idx) => {
        const textInput = group.querySelector('input[type="text"]');
        const radio = group.querySelector('input[type="radio"]');
        if (textInput && textInput.value.trim()) {
            optionsTexts.push(textInput.value.trim());
            if (radio && radio.checked) correctIndex = idx;
        }
    });

    if (!questionText || optionsTexts.length < 2 || correctIndex === -1) {
        alert('يرجى إدخال نص السؤال، خيارين على الأقل، وتحديد الإجابة الصحيحة.');
        return;
    }

    try {
        if (qId) {
            // تحديث السؤال
            await supabase.from('questions').update({ text: questionText, points, is_mandatory: isMandatory }).eq('id', qId);
            await supabase.from('options').delete().eq('question_id', qId);
            for (let i = 0; i < optionsTexts.length; i++) {
                await supabase.from('options').insert({
                    question_id: qId,
                    text: optionsTexts[i],
                    is_correct: (i === correctIndex),
                    order_index: i
                });
            }
        } else {
            // إضافة سؤال جديد
            const { data: newQuestion, error: qError } = await supabase
                .from('questions')
                .insert({
                    exam_id: examId,
                    text: questionText,
                    points,
                    is_mandatory: isMandatory,
                    order_index: Date.now()
                })
                .select()
                .single();
            if (qError) throw qError;
            for (let i = 0; i < optionsTexts.length; i++) {
                await supabase.from('options').insert({
                    question_id: newQuestion.id,
                    text: optionsTexts[i],
                    is_correct: (i === correctIndex),
                    order_index: i
                });
            }
        }
        alert('تم حفظ السؤال بنجاح!');
        addEditQuestionForm.classList.add('hidden');
        loadQuestions(examId);
    } catch (error) {
        handleSupabaseError(error, 'saveQuestion');
    }
}

async function editQuestion(examId, qId) {
    const { data: question, error: qError } = await supabase
        .from('questions')
        .select('*, options(*)')
        .eq('id', qId)
        .single();
    if (qError || !question) return;
    addEditQuestionForm.classList.remove('hidden');
    questionFormTitle.textContent = 'تعديل السؤال';
    questionIdInput.value = qId;
    questionTextInput.value = question.text;
    questionPointsInput.value = question.points;
    questionIsMandatoryCheckbox.checked = question.is_mandatory;
    questionOptionsContainer.innerHTML = '';
    questionOptionCount = 0;
    const options = question.options.sort((a,b) => a.order_index - b.order_index);
    options.forEach((opt, idx) => {
        addOptionInput(opt.text, opt.is_correct);
    });
}

async function deleteQuestion(examId, qId) {
    if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
        try {
            await supabase.from('options').delete().eq('question_id', qId);
            await supabase.from('questions').delete().eq('id', qId);
            alert('تم حذف السؤال بنجاح.');
            loadQuestions(examId);
        } catch (error) {
            handleSupabaseError(error, 'deleteQuestion');
        }
    }
}

function addOptionInput(optionText = '', isCorrect = false) {
    const optionDiv = document.createElement('div');
    optionDiv.classList.add('option-group');
    optionDiv.style.cssText = 'display:flex; align-items:center; margin-bottom:8px;';
    optionDiv.innerHTML = `
        <input type="radio" name="correct_option" value="${questionOptionCount}" ${isCorrect ? 'checked' : ''} required style="margin-left:8px;">
        <input type="text" placeholder="نص الخيار ${questionOptionCount + 1}" value="${escapeHtml(optionText)}" required style="flex-grow:1; margin:0 10px;">
        <button type="button" onclick="this.parentElement.remove()" style="background:#f44336; color:white; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer;">X</button>
    `;
    questionOptionsContainer.appendChild(optionDiv);
    questionOptionCount++;
}

// =================================================================
// --- PARTICIPANT MANAGEMENT (Supabase) ---
// =================================================================
async function showParticipantManagement(examId, examTitle) {
    showMainContent('participant-management-section');
    selectedExamTitleParticipantsSpan.textContent = examTitle;
    currentManagingParticipantsExamIdInput.value = examId;
    assignStudentFeedback.textContent = '';
    assignStudentSelect.innerHTML = '<option value="">-- جاري التحميل --</option>';
    try {
        const { data: participants, error: partError } = await supabase
            .from('participants')
            .select('student_id')
            .eq('exam_id', examId);
        if (partError) throw partError;
        const assignedIds = new Set(participants.map(p => p.student_id));
        const availableStudents = allStudentsCache.filter(s => !assignedIds.has(s.id));
        assignStudentSelect.innerHTML = availableStudents.length === 0 ?
            '<option value="">-- كل الطلاب معينون --</option>' :
            '<option value="">-- اختر طالباً --</option>' + availableStudents.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        await loadParticipants(examId);
    } catch (error) {
        handleSupabaseError(error, 'showParticipantManagement');
        assignStudentSelect.innerHTML = '<option value="">-- خطأ --</option>';
    }
}

async function assignStudentToExam() {
    const studentId = assignStudentSelect.value;
    const examId = currentManagingParticipantsExamIdInput.value;
    const selectedStudent = allStudentsCache.find(s => s.id === studentId);
    if (!studentId || !examId || !selectedStudent) {
        assignStudentFeedback.textContent = 'الرجاء اختيار طالب صالح.';
        return;
    }
    try {
        const { error } = await supabase.from('participants').insert({
            exam_id: examId,
            student_id: studentId,
            status: 'not_started'
        });
        if (error) throw error;
        assignStudentFeedback.textContent = 'تم تعيين الطالب بنجاح!';
        setTimeout(() => assignStudentFeedback.textContent = '', 3000);
        showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent);
    } catch (error) {
        handleSupabaseError(error, 'assignStudentToExam');
    }
}

async function assignAllUnassignedStudents() {
    const examId = currentManagingParticipantsExamIdInput.value;
    if (!examId) return;
    if (!confirm("هل أنت متأكد من تعيين كل الطلاب غير المعينين؟")) return;
    assignStudentFeedback.textContent = "جاري التعيين...";
    try {
        const { data: participants } = await supabase.from('participants').select('student_id').eq('exam_id', examId);
        const assignedIds = new Set(participants.map(p => p.student_id));
        const toAssign = allStudentsCache.filter(s => !assignedIds.has(s.id));
        if (toAssign.length === 0) {
            assignStudentFeedback.textContent = "لا يوجد طلاب غير معينين.";
            return;
        }
        const inserts = toAssign.map(s => ({ exam_id: examId, student_id: s.id, status: 'not_started' }));
        const { error } = await supabase.from('participants').insert(inserts);
        if (error) throw error;
        assignStudentFeedback.textContent = `تم تعيين ${toAssign.length} طالب بنجاح!`;
        showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent);
    } catch (error) {
        handleSupabaseError(error, 'assignAllUnassignedStudents');
    }
}

async function loadParticipants(examId) {
    participantsTableBody.innerHTML = '<tr><td colspan="5">جاري التحميل...</td></tr>';
    try {
        const { data: participants, error: partError } = await supabase
            .from('participants')
            .select('*, students(name, access_code)')
            .eq('exam_id', examId);
        if (partError) throw partError;
        if (!participants || participants.length === 0) {
            participantsTableBody.innerHTML = '<tr><td colspan="5">لم يتم تعيين أي طلاب بعد.</td></tr>';
            return;
        }
        participantsTableBody.innerHTML = '';
        for (const p of participants) {
            const student = p.students;
            if (!student) continue;
            const scoreText = (p.score !== undefined && p.total_possible_points) ? `${p.score} / ${p.total_possible_points}` : '---';
            const row = participantsTableBody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.access_code)}</td>
                <td>${translateStatus(p.status)}</td>
                <td>${scoreText}</td>
                <td><button class="btn-delete" onclick="unassignStudent('${p.student_id}', '${examId}')">إلغاء التعيين</button></td>
            `;
        }
    } catch (error) {
        handleSupabaseError(error, 'loadParticipants');
        participantsTableBody.innerHTML = '<tr><td colspan="5">حدث خطأ أثناء تحميل المشاركين.</td></tr>';
    }
}

async function unassignStudent(studentId, examId) {
    if (confirm('هل أنت متأكد من إلغاء تعيين هذا الطالب؟')) {
        try {
            const { error } = await supabase.from('participants').delete().eq('exam_id', examId).eq('student_id', studentId);
            if (error) throw error;
            alert('تم إلغاء التعيين بنجاح.');
            showParticipantManagement(examId, selectedExamTitleParticipantsSpan.textContent);
        } catch (error) {
            handleSupabaseError(error, 'unassignStudent');
        }
    }
}

// =================================================================
// --- STATISTICS & REPORTS (Supabase) ---
// =================================================================
async function showStatistics(examId, examTitle) {
    showMainContent('statistics-section');
    selectedExamTitleStatsSpan.textContent = examTitle;
    currentStatsExamIdInput.value = examId;
    if (resultsChart) resultsChart.destroy();
    successLogTableBody.innerHTML = '<tr><td colspan="6">جاري التحميل...</td></tr>';
    failureLogTableBody.innerHTML = '<tr><td colspan="6">جاري التحميل...</td></tr>';
    questionStatsTableBody.innerHTML = '<tr><td colspan="2">جاري التحميل...</td></tr>';
    await calculateAndDisplayStats(examId);
}

async function calculateAndDisplayStats(examId) {
    try {
        const examData = allExamsCache[examId];
        if (!examData) return;
        const passingPercentage = examData.passing_percentage;
        statsPassingCriteria.textContent = `>= ${passingPercentage}%`;

        const { data: participants, error: partError } = await supabase
            .from('participants')
            .select('*')
            .eq('exam_id', examId);
        if (partError) throw partError;

        const finished = participants.filter(p => p.status === 'finished' || p.status === 'timed_out');
        statsTotalParticipants.textContent = finished.length;
        let totalPercentageSum = 0;
        const chartData = [];
        const successful = [];
        const failed = [];

        for (const p of finished) {
            if (p.percentage !== undefined) totalPercentageSum += p.percentage;
            chartData.push(p);
            if (p.passed) successful.push(p);
            else failed.push(p);
        }
        statsAvgPercentage.textContent = finished.length ? (totalPercentageSum / finished.length).toFixed(2) + '%' : '0%';
        statsPassedCount.textContent = successful.length;

        displayResultsChart(chartData, passingPercentage);
        displaySuccessLog(successful);
        displayFailureLog(failed);

        // تحليل صعوبة الأسئلة
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('id, text')
            .eq('exam_id', examId);
        if (qError) throw qError;

        const questionStats = {};
        for (const p of finished) {
            if (p.answers) {
                for (const [qId, answer] of Object.entries(p.answers)) {
                    if (!questionStats[qId]) questionStats[qId] = { attempts: 0, corrects: 0 };
                    questionStats[qId].attempts++;
                    const { data: options } = await supabase.from('options').select('is_correct').eq('question_id', qId).eq('id', answer).single();
                    if (options && options.is_correct) questionStats[qId].corrects++;
                }
            }
        }
        displayQuestionDifficulty(questionStats, questions);
    } catch (error) {
        handleSupabaseError(error, 'calculateAndDisplayStats');
    }
}

function displayResultsChart(participantsData, passingPercentage) {
    const passed = participantsData.filter(p => p.percentage >= passingPercentage).length;
    const failed = participantsData.length - passed;
    if (resultsChart) resultsChart.destroy();
    resultsChart = new Chart(resultsDistributionChartCtx, {
        type: 'pie',
        data: { labels: [`ناجح (>= ${passingPercentage}%)`, `راسب (< ${passingPercentage}%)`], datasets: [{ data: [passed, failed], backgroundColor: ['#4CAF50', '#F44336'] }] },
        options: { responsive: true, plugins: { title: { display: true, text: 'توزيع نتائج الممتحنين' } } }
    });
}

function displaySuccessLog(successful) {
    successLogTableBody.innerHTML = '';
    if (successful.length === 0) {
        successLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد ناجحون بعد.</td></tr>';
        return;
    }
    successful.sort((a,b) => b.percentage - a.percentage);
    successful.forEach(data => {
        const row = successLogTableBody.insertRow();
        populateParticipantRow(row, data);
    });
}

function displayFailureLog(failed) {
    failureLogTableBody.innerHTML = '';
    if (failed.length === 0) {
        failureLogTableBody.innerHTML = '<tr><td colspan="6">لا يوجد راسبون.</td></tr>';
        return;
    }
    failed.sort((a,b) => b.percentage - a.percentage);
    failed.forEach(data => {
        const row = failureLogTableBody.insertRow();
        populateParticipantRow(row, data);
    });
}

function populateParticipantRow(row, data) {
    const startTime = data.start_time ? new Date(data.start_time).toLocaleString('ar-EG') : '---';
    const endTime = data.end_time ? new Date(data.end_time).toLocaleString('ar-EG') : '---';
    let duration = '---';
    if (data.start_time && data.end_time) {
        const diff = (new Date(data.end_time) - new Date(data.start_time)) / 60000;
        duration = `${Math.round(diff)} دقيقة`;
    }
    row.innerHTML = `
        <td>${escapeHtml(data.students?.name || '---')}</td>
        <td>${data.score} / ${data.total_possible_points}</td>
        <td>${data.percentage}%</td>
        <td>${startTime}</td>
        <td>${endTime}</td>
        <td>${duration}</td>
    `;
}

function displayQuestionDifficulty(questionStats, questions) {
    questionStatsTableBody.innerHTML = '';
    if (!questions || questions.length === 0) {
        questionStatsTableBody.innerHTML = '<tr><td colspan="2">لا توجد أسئلة لتحليلها.</td></tr>';
        return;
    }
    questions.forEach(q => {
        const stats = questionStats[q.id] || { attempts: 0, corrects: 0 };
        const correctPercentage = stats.attempts ? ((stats.corrects / stats.attempts) * 100).toFixed(1) : '0.0';
        const row = questionStatsTableBody.insertRow();
        row.innerHTML = `<td>${escapeHtml(q.text)}</td><td style="background: ${correctPercentage > 70 ? '#d4edda' : (correctPercentage < 40 ? '#f8d7da' : '#fff3cd')}">${correctPercentage}% (${stats.corrects}/${stats.attempts})</td>`;
    });
}

async function exportFullLogToExcel() {
    const { data: logs, error } = await supabase.from('exam_log').select('*').eq('admin_id', currentAdminId).order('end_time', { ascending: false });
    if (error || !logs?.length) return alert('لا توجد سجلات لتصديرها.');
    const excelData = logs.map(log => ({
        "تاريخ الإنهاء": new Date(log.end_time).toLocaleString('ar-EG'),
        "اسم الطالب": log.student_name,
        "عنوان الاختبار": log.exam_title,
        "الدرجة": log.score,
        "الدرجة الكلية": log.total_possible_points,
        "النسبة": log.percentage,
        "الحالة": log.status_text
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "السجل الكامل");
    XLSX.writeFile(wb, "FullExamLog.xlsx");
}

async function exportSuccessLogToExcel() { await exportParticipantLogToExcel(true); }
async function exportFailureLogToExcel() { await exportParticipantLogToExcel(false); }

async function exportParticipantLogToExcel(isSuccess) {
    const examId = currentStatsExamIdInput.value;
    const examData = allExamsCache[examId];
    if (!examId || !examData) return alert('لا يوجد اختبار محدد.');
    const { data: participants, error } = await supabase.from('participants').select('*').eq('exam_id', examId);
    if (error) return;
    const filtered = participants.filter(p => p.passed === isSuccess);
    if (!filtered.length) return alert(`لا توجد بيانات ${isSuccess ? 'ناجحين' : 'راسبين'} لتصديرها.`);
    const excelData = [];
    for (const p of filtered) {
        const { data: student } = await supabase.from('students').select('name').eq('id', p.student_id).single();
        const studentName = student?.name || '---';
        if (p.answers) {
            for (const [qId, ans] of Object.entries(p.answers)) {
                const { data: qData } = await supabase.from('questions').select('text, options(*)').eq('id', qId).single();
                if (qData) {
                    const correctOpt = qData.options.find(o => o.is_correct);
                    const studentAnswer = qData.options.find(o => o.id === ans);
                    excelData.push({
                        "اسم الطالب": studentName,
                        "الدرجة": `${p.score} / ${p.total_possible_points}`,
                        "النسبة": p.percentage,
                        "نص السؤال": qData.text,
                        "إجابة الطالب": studentAnswer?.text || "لم يجب",
                        "الإجابة الصحيحة": correctOpt?.text || "---"
                    });
                }
            }
        }
    }
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isSuccess ? "الناجحين" : "الراسبين");
    XLSX.writeFile(wb, `${isSuccess ? "Success" : "Failure"}_${examData.title}.xlsx`);
}

// =================================================================
// --- PROFILE & PASSWORD MANAGEMENT (Supabase) ---
// =================================================================
function showEditProfileForm() {
    profileDisplay.classList.add('hidden');
    editProfileForm.classList.remove('hidden');
    adminNameInput.value = currentAdminData.name || '';
    adminPhoneInput.value = currentAdminData.phone || '';
    adminInstitutionInput.value = currentAdminData.institution || '';
    adminGovernorateInput.value = currentAdminData.governorate || '';
    adminDobInput.value = currentAdminData.dob || '';
    adminGenderInput.value = currentAdminData.gender || 'male';
}

function cancelEditProfile() {
    editProfileForm.classList.add('hidden');
    profileDisplay.classList.remove('hidden');
}

async function updateAdminProfile() {
    const name = adminNameInput.value.trim();
    const phone = adminPhoneInput.value.trim();
    const institution = adminInstitutionInput.value.trim();
    const governorate = adminGovernorateInput.value.trim();
    const dob = adminDobInput.value;
    const gender = adminGenderInput.value;

    if (!name || !phone || !institution || !governorate || !dob || !gender) {
        alert('جميع الحقول إجبارية');
        return;
    }

    const { error } = await supabase.from('admins').update({
        name, phone, institution, governorate, dob, gender, updated_at: new Date().toISOString()
    }).eq('id', currentAdminId);

    if (error) {
        alert('حدث خطأ أثناء تحديث الملف الشخصي');
    } else {
        currentAdminData = { ...currentAdminData, name, phone, institution, governorate, dob, gender };
        updateAdminInfoDisplay();
        cancelEditProfile();
        alert('تم تحديث الملف الشخصي بنجاح');
    }
}

async function handleChangePassword() {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;

    passwordChangeFeedback.textContent = '';
    if (!currentPassword || !newPassword || !confirmPassword) {
        passwordChangeFeedback.textContent = 'يرجى ملء جميع الحقول.';
        return;
    }
    if (newPassword !== confirmPassword) {
        passwordChangeFeedback.textContent = 'كلمات المرور الجديدة غير متطابقة.';
        return;
    }

    try {
        // إعادة المصادقة
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentAdminData.email,
            password: currentPassword
        });
        if (signInError) throw new Error('كلمة المرور الحالية غير صحيحة');

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        passwordChangeFeedback.textContent = 'تم تغيير كلمة المرور بنجاح!';
        passwordChangeFeedback.style.color = 'green';
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
    } catch (error) {
        passwordChangeFeedback.textContent = error.message || 'حدث خطأ';
        passwordChangeFeedback.style.color = 'red';
    }
}

// =================================================================
// --- RESULTS ANNOUNCEMENT (INTEGRATED with Supabase) ---
// =================================================================
let parsedStudents = [];
let gradeColumns = [];

function setupResultEventListeners() {
    const createBtn = document.getElementById('create-new-btn-integrated');
    if (createBtn) createBtn.onclick = showResultWizard;
    const backBtn = document.getElementById('back-to-list-btn-integrated');
    if (backBtn) backBtn.onclick = () => { document.getElementById('sheets-list-container-integrated').style.display = 'block'; document.getElementById('create-wizard-integrated').style.display = 'none'; loadResultsSheets(); };
    const next1 = document.getElementById('next-1-res');
    if (next1) next1.onclick = () => { const title = document.getElementById('sheet-title-res')?.value.trim(); const teacher = document.getElementById('sheet-teacher-res')?.value.trim(); if (!title || !teacher) { alert('الرجاء ملء عنوان الكشف واسم المدرس.'); return; } goToResultStep(2); };
    const prev2 = document.getElementById('prev-2-res'); if (prev2) prev2.onclick = () => goToResultStep(1);
    const next2 = document.getElementById('next-2-res');
    if (next2) next2.onclick = () => {
        if (parsedStudents.length === 0) { alert('يرجى رفع ملف إكسل أولاً.'); return; }
        const thead = document.getElementById('preview-thead-res');
        if (thead) thead.innerHTML = `<tr><th>#</th><th>اسم الطالب</th><th>الرمز السري</th>${gradeColumns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
        const tbody = document.getElementById('preview-tbody-res');
        if (tbody) {
            const previewRows = parsedStudents.slice(0,10).map((s,i) => `<tr><td>${i+1}</td><td>${escapeHtml(s.name)}</td><td><span style="font-family:monospace;letter-spacing:3px;font-weight:700;color:#1d4ed8;">${s.code}</span></td>${gradeColumns.map(c => `<td>${escapeHtml(String(s.grades[c] ?? '---'))}</td>`).join('')}</tr>`).join('');
            const extraRow = parsedStudents.length > 10 ? `<tr><td colspan="${gradeColumns.length+3}" style="text-align:center;color:#94a3b8;">... و ${parsedStudents.length-10} طالب آخر</td></tr>` : '';
            tbody.innerHTML = previewRows + extraRow;
        }
        goToResultStep(3);
    };
    const prev3 = document.getElementById('prev-3-res'); if (prev3) prev3.onclick = () => goToResultStep(2);
    const saveBtn = document.getElementById('save-btn-res'); if (saveBtn) saveBtn.onclick = saveResultSheet;
    const copyLinkBtn = document.getElementById('copy-link-btn-res');
    if (copyLinkBtn) copyLinkBtn.onclick = () => { const val = document.getElementById('sheet-link-display-res')?.value; if(val) navigator.clipboard.writeText(val).then(()=>alert('✅ تم نسخ الرابط!')); };
    const finishBtn = document.getElementById('finish-wizard-btn-res'); if (finishBtn) finishBtn.onclick = () => { document.getElementById('sheets-list-container-integrated').style.display = 'block'; document.getElementById('create-wizard-integrated').style.display = 'none'; loadResultsSheets(); };
    const uploadZone = document.getElementById('upload-zone-res');
    const fileInput = document.getElementById('excel-file-input-res');
    if (uploadZone && fileInput) {
        uploadZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => handleResultFileUpload(e.target.files[0]);
    }
}

async function showResultWizard() {
    const { count, error } = await supabase.from('result_sheets').select('id', { count: 'exact', head: true }).eq('admin_id', currentAdminId);
    if (!error && count >= 5) {
        alert(`⚠️ لقد وصلت إلى الحد الأقصى (5 كشوفات). لا يمكنك إنشاء كشف جديد.`);
        return;
    }
    parsedStudents = [];
    gradeColumns = [];
    const titleEl = document.getElementById('sheet-title-res');
    const teacherEl = document.getElementById('sheet-teacher-res');
    if (titleEl) titleEl.value = '';
    if (teacherEl) teacherEl.value = '';
    const now = new Date();
    const dateEl = document.getElementById('sheet-date-res');
    const timeEl = document.getElementById('sheet-time-res');
    if (dateEl) dateEl.value = now.toISOString().split('T')[0];
    if (timeEl) timeEl.value = now.toTimeString().slice(0,5);
    const infoBox = document.getElementById('file-info-box-res');
    if (infoBox) infoBox.style.display = 'none';
    const next2 = document.getElementById('next-2-res');
    if (next2) next2.disabled = true;
    document.getElementById('sheets-list-container-integrated').style.display = 'none';
    document.getElementById('create-wizard-integrated').style.display = 'block';
    goToResultStep(1);
}

function goToResultStep(n) {
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step-${i}-res`);
        if (step) step.style.display = (i === n) ? 'block' : 'none';
        const item = document.getElementById(`si-${i}`);
        if (item) {
            item.className = 'step-item' + (i < n ? ' done' : i === n ? ' active' : '');
            const circle = item.querySelector('.step-circle');
            if (circle) circle.textContent = i < n ? '✓' : String(i);
        }
    }
}

function handleResultFileUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rows || rows.length < 2) { alert("الملف فارغ أو يحتوي على صف عناوين فقط."); return; }
            const headers = rows[0].map(h => String(h).trim()).filter(h => h);
            if (headers.length < 2) { alert("يجب أن يحتوي الملف على عمودين على الأقل."); return; }
            gradeColumns = headers.slice(1);
            parsedStudents = [];
            const usedCodes = new Set();
            const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const numbers = '0123456789';
            const genCode = () => {
                let code;
                do {
                    let part1 = '';
                    for (let i = 0; i < 6; i++) part1 += letters.charAt(Math.floor(Math.random() * letters.length));
                    let part2 = '';
                    for (let i = 0; i < 3; i++) part2 += numbers.charAt(Math.floor(Math.random() * numbers.length));
                    code = part1 + part2;
                } while (usedCodes.has(code));
                usedCodes.add(code);
                return code;
            };
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const name = String(row[0] ?? '').trim();
                if (!name) continue;
                const grades = {};
                gradeColumns.forEach((col, idx) => { const val = row[idx+1]; grades[col] = (val !== '' && val !== undefined && val !== null) ? val : '---'; });
                parsedStudents.push({ name, code: genCode(), grades });
            }
            if (parsedStudents.length === 0) { alert("لم يتم العثور على أي اسم طالب."); return; }
            const infoBox = document.getElementById('file-info-box-res');
            if (infoBox) { infoBox.style.display = 'block'; infoBox.innerHTML = `✅ تم تحميل <strong>${parsedStudents.length}</strong> طالب | <strong>${gradeColumns.length}</strong> عمود | رمز: 9 خانات`; }
            const next2 = document.getElementById('next-2-res');
            if (next2) next2.disabled = false;
        } catch (err) { alert(`خطأ في قراءة الملف: ${err.message}`); }
    };
    reader.readAsArrayBuffer(file);
}

async function saveResultSheet() {
    const title = document.getElementById('sheet-title-res')?.value.trim() || '';
    const teacher = document.getElementById('sheet-teacher-res')?.value.trim() || '';
    const year = document.getElementById('sheet-year-res')?.value.trim() || '';
    const description = document.getElementById('sheet-description-res')?.value.trim() || '';
    const date = document.getElementById('sheet-date-res')?.value || '';
    const time = document.getElementById('sheet-time-res')?.value || '';
    const notes = document.getElementById('sheet-notes-res')?.value.trim() || '';

    if (!title || !teacher) { alert("يرجى إدخال عنوان الكشف واسم المدرس."); return; }
    if (parsedStudents.length === 0) { alert("لم يتم رفع أي بيانات طلاب."); return; }

    const saveBtn = document.getElementById('save-btn-res');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ جاري الحفظ...'; }

    const studentsByCode = {};
    parsedStudents.forEach(s => { studentsByCode[s.code] = { name: s.name, grades: s.grades }; });

    try {
        const { data, error } = await supabase.from('result_sheets').insert({
            admin_id: currentAdminId,
            title, teacher, year, description, date, time, notes,
            grade_columns: gradeColumns,
            students_by_code: studentsByCode,
            student_count: parsedStudents.length,
            created_at: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/results-lookup.html?sheet=${data.id}`;
        const linkInput = document.getElementById('sheet-link-display-res');
        if (linkInput) linkInput.value = link;
        goToResultStep(4);
    } catch (err) {
        alert(`خطأ في الحفظ: ${err.message}`);
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ وإنشاء الرابط'; }
    }
}

async function loadResultsSheets() {
    const container = document.getElementById('sheets-list-container-integrated');
    container.innerHTML = '<div style="text-align:center;padding:50px;">جاري التحميل...</div>';
    const { data: sheets, error } = await supabase.from('result_sheets').select('*').eq('admin_id', currentAdminId).order('created_at', { ascending: false });
    if (error) { container.innerHTML = `<div class="res-alert res-alert-error">خطأ: ${error.message}</div>`; return; }
    if (!sheets || sheets.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h4>لا توجد كشوفات بعد</h4><p>انقر على "+ إنشاء كشف جديد" للبدء.</p></div>`;
        return;
    }
    let html = '<div class="sheets-list">';
    sheets.forEach(sheet => {
        html += `
            <div class="sheet-item">
                <div class="sheet-item-info">
                    <h4>${escapeHtml(sheet.title)}</h4>
                    <p>👨‍🏫 ${escapeHtml(sheet.teacher)} | 👥 ${sheet.student_count} طالب ${sheet.date ? `| 📅 ${sheet.date}` : ''}</p>
                </div>
                <div class="sheet-item-actions">
                    <button class="res-btn res-btn-primary" onclick="copyResultLink('${sheet.id}')">🔗 رابط</button>
                    <button class="res-btn res-btn-success" onclick="downloadResultExcel('${sheet.id}')">📊 إكسل</button>
                    <button class="res-btn res-btn-warning" onclick="printResultBarcodes('${sheet.id}')">🖨️ الرموز</button>
                    <button class="res-btn res-btn-danger" onclick="deleteResultSheet('${sheet.id}')">🗑️</button>
                </div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

window.copyResultLink = (id) => {
    const link = `${window.location.origin}/results-lookup.html?sheet=${id}`;
    navigator.clipboard.writeText(link);
    alert('✅ تم نسخ الرابط!');
};

window.downloadResultExcel = async (id) => {
    const { data: sheet, error } = await supabase.from('result_sheets').select('*').eq('id', id).single();
    if (error || !sheet) return alert('الكشف غير موجود');
    const cols = sheet.grade_columns || [];
    const students = Object.entries(sheet.students_by_code || {}).map(([code, s]) => ({ name: s.name, code, grades: s.grades }));
    const headers = ['الاسم', 'الرمز السري', ...cols];
    const rows = students.map(s => [s.name, s.code, ...cols.map(c => s.grades[c] === '---' ? '' : s.grades[c])]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, ...cols.map(() => ({ wch: 16 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النتائج مع الرموز');
    XLSX.writeFile(wb, `${sheet.title} - مع الرموز.xlsx`);
};

window.printResultBarcodes = async (id) => {
    const { data: sheet, error } = await supabase.from('result_sheets').select('*').eq('id', id).single();
    if (error || !sheet) return alert('الكشف غير موجود');
    const students = Object.entries(sheet.students_by_code || {}).map(([code, s]) => ({ name: s.name, code }));
    const escH = str => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) { alert('الرجاء السماح بفتح النوافذ المنبثقة.'); return; }
    const cards = students.map((s, i) => `<div class="card"><div class="num">${i+1}</div><div class="name">${escH(s.name)}</div><div class="code">${s.code}</div><svg id="bc${i}"></svg></div>`).join('');
    const barcodeScript = students.map((s, i) => `try{JsBarcode('#bc${i}','${s.code}',{format:'CODE128',displayValue:false,height:52,margin:2});}catch(e){}`).join('\n');
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>قائمة الرموز - ${escH(sheet.title)}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"><\/script><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;background:#fff;padding:24px;}h2{text-align:center;color:#1e40af;margin-bottom:6px;}.sub{text-align:center;color:#64748b;margin-bottom:22px;}.print-btn{display:block;margin:0 auto 22px;padding:11px 36px;background:#1d4ed8;color:white;border:none;border-radius:8px;cursor:pointer;}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}.card{border:2px solid #1e40af;border-radius:10px;padding:13px;text-align:center;page-break-inside:avoid;}.name{font-weight:700;margin-bottom:5px;min-height:38px;}.code{font-family:monospace;letter-spacing:4px;color:#1d4ed8;font-weight:700;margin-bottom:8px;}svg{max-width:100%;height:52px;}@media print{.print-btn{display:none;}}</style></head><body><h2>📋 قائمة الرموز السرية</h2><p class="sub">${escH(sheet.title)} &nbsp;|&nbsp; عدد الطلاب: ${students.length}</p><button class="print-btn" onclick="window.print()">🖨️ طباعة</button><div class="grid">${cards}</div><script>window.onload=function(){${barcodeScript}};<\/script></body></html>`);
    win.document.close();
};

window.deleteResultSheet = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذا الكشف نهائياً؟")) {
        const { error } = await supabase.from('result_sheets').delete().eq('id', id).eq('admin_id', currentAdminId);
        if (error) alert(`خطأ في الحذف: ${error.message}`);
        else loadResultsSheets();
    }
};

// =================================================================
// --- UTILITY FUNCTIONS ---
// =================================================================
function generateExamLink(examId) {
    const base = window.location.origin;
    return `${base}/index.html?exam=${examId}`;
}

function showMainContent(sectionIdToShow) {
    document.querySelectorAll('.page-content-wrapper > .main-content > .admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    const targetSection = document.getElementById(sectionIdToShow);
    if (targetSection) targetSection.classList.remove('hidden');
    if (['exams-section', 'students-section', 'log-section', 'settings-section', 'results-admin-section'].includes(sectionIdToShow)) {
        document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar .nav-link[onclick*="'${sectionIdToShow}'"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    document.querySelector('.sidebar')?.classList.remove('sidebar-visible');
    if (sectionIdToShow === 'results-admin-section') loadResultsSheets();
}

function translateStatus(status) {
    const map = { 'started': 'بدأ الاختبار', 'finished': 'أنهى الاختبار', 'timed_out': 'انتهى الوقت', 'not_started': 'لم يبدأ' };
    return map[status] || 'غير معروف';
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => alert("تم نسخ الرابط!")).catch(() => alert("فشل النسخ."));
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('lastActivity');
    if (activityTimer) clearTimeout(activityTimer);
    window.location.href = 'ejaz.html';
}

function setupActivityMonitoring() {
    localStorage.setItem('lastActivity', Date.now().toString());
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetActivityTimer));
    resetActivityTimer();
}

function resetActivityTimer() {
    localStorage.setItem('lastActivity', Date.now().toString());
    if (activityTimer) clearTimeout(activityTimer);
    activityTimer = setTimeout(checkInactivity, 60 * 60 * 1000);
}

function checkInactivity() {
    const last = localStorage.getItem('lastActivity');
    if (!last) return;
    if (Date.now() - parseInt(last) > 60 * 60 * 1000) handleLogout();
    else resetActivityTimer();
}

// تصدير بعض الدوال للاستخدام العام في HTML
window.showMainContent = showMainContent;
window.copyToClipboard = copyToClipboard;
window.showQuestionManagement = showQuestionManagement;
window.editExam = editExam;
window.deleteExam = deleteExam;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.showParticipantManagement = showParticipantManagement;
window.unassignStudent = unassignStudent;
window.showStatistics = showStatistics;
window.editStudentGlobal = editStudentGlobal;
window.deleteStudentGlobal = deleteStudentGlobal;
window.cancelEditProfile = cancelEditProfile;
window.generateExamLink = generateExamLink;