const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function uploadMaterialFile(file, userId = 'user_student_1') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  const res = await fetch(`${API_BASE}/materials/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload material');
  }
  return res.json();
}

export async function getMaterialStatus(materialId) {
  const res = await fetch(`${API_BASE}/materials/${materialId}/status`);
  if (!res.ok) throw new Error('Failed to fetch material status');
  return res.json();
}

export async function getMaterialChunks(materialId) {
  const res = await fetch(`${API_BASE}/materials/${materialId}/chunks`);
  return res.json();
}

export async function getCoursesList() {
  const res = await fetch(`${API_BASE}/courses`);
  return res.json();
}

export async function getCourseDetails(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`);
  if (!res.ok) throw new Error('Failed to fetch course details');
  return res.json();
}

export async function regenerateLessonExplanation(courseId, lessonId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/regenerate-explanation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId })
  });
  return res.json();
}

export async function getAssessment(assessmentId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}`);
  if (!res.ok) throw new Error('Failed to fetch assessment');
  return res.json();
}

export async function submitAssessment(assessmentId, userAnswers, userId = 'user_student_1') {
  const res = await fetch(`${API_BASE}/assessments/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessmentId, userAnswers, userId })
  });
  if (!res.ok) throw new Error('Failed to submit assessment');
  return res.json();
}

export async function getLearnerDashboard(userId = 'user_student_1') {
  const res = await fetch(`${API_BASE}/learner/dashboard?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch learner dashboard');
  return res.json();
}

export async function logLearningActivity(courseId, conceptId, activityType, durationSecs = 30) {
  const res = await fetch(`${API_BASE}/learner/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'user_student_1', courseId, conceptId, activityType, durationSecs })
  });
  return res.json();
}

export async function askTutor(query, courseId, mode = 'explain_simply') {
  const res = await fetch(`${API_BASE}/tutor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, courseId, mode })
  });
  if (!res.ok) throw new Error('AI Tutor unavailable');
  return res.json();
}

export async function getSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return res.json();
}

export async function deleteCourse(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete course');
  return res.json();
}
