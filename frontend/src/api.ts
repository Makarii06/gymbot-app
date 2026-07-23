const tg = (window as any).Telegram?.WebApp;
const initData = tg?.initData || "";

const BASE_URL = "/api";

async function request(endpoint: string, method = "GET", body?: any) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (initData) {
    headers["Authorization"] = `Bearer ${initData}`;
  }

  const config: RequestInit = { method, headers };
  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function uploadFile(endpoint: string, file: File): Promise<any> {
  const headers: Record<string, string> = {};
  if (initData) {
    headers["Authorization"] = `Bearer ${initData}`;
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload Error: ${response.status}`);
  }
  return response.json();
}

export const api = {
  // ==========================================
  // ТЕГИ (Tags)
  // ==========================================
  getTags: () => request("/tags/"),
  createTag: (name: string) => request("/tags/", "POST", { name }),

  // ==========================================
  // ВПРАВИ (Exercises)
  // ==========================================
  getExercises: (muscle_group_id?: number) =>
    request(`/exercises/${muscle_group_id ? `?muscle_group_id=${muscle_group_id}` : ""}`),
  createExercise: (data: any) => request("/exercises/", "POST", data),
  updateExercise: (id: number, data: any) => request(`/exercises/${id}`, "PUT", data),
  deleteExercise: (id: number) => request(`/exercises/${id}`, "DELETE"),

  // Медіа вправи
  uploadExerciseMedia: (exerciseId: number, file: File) =>
    uploadFile(`/exercises/${exerciseId}/media`, file),
  deleteExerciseMedia: (exerciseId: number, mediaId: number) =>
    request(`/exercises/${exerciseId}/media/${mediaId}`, "DELETE"),
  reorderExerciseMedia: (exerciseId: number, order: number[]) =>
    request(`/exercises/${exerciseId}/media/reorder`, "PUT", order),

  // ==========================================
  // ТРЕНУВАННЯ (Workout Days)
  // ==========================================
  getWorkoutDays: (includePrograms?: boolean) => 
    request(`/workout-days/${includePrograms ? '?include_programs=true' : ''}`),
  createWorkoutDay: (data: any) => request("/workout-days/", "POST", data),
  getWorkoutDay: (id: number) => request(`/workout-days/${id}`),
  updateWorkoutDay: (id: number, data: any) => request(`/workout-days/${id}`, "PUT", data),
  deleteWorkoutDay: (id: number) => request(`/workout-days/${id}`, "DELETE"),

  // Вправи всередині тренування
  addExerciseToDay: (dayId: number, data: { exercise_id: number; note?: string }) =>
    request(`/workout-days/${dayId}/exercises`, "POST", data),
  removeExerciseFromDay: (dayId: number, weId: number) =>
    request(`/workout-days/${dayId}/exercises/${weId}`, "DELETE"),
  reorderExercisesInDay: (dayId: number, order: { we_id: number; position: number }[]) =>
    request(`/workout-days/${dayId}/exercises/reorder`, "PUT", order),
  updateExerciseNote: (dayId: number, weId: number, note: string | null) =>
    request(`/workout-days/${dayId}/exercises/${weId}/note`, "PATCH", { note }),

  // Підходи (Set Templates)
  addSetToExercise: (weId: number, data: any) =>
    request(`/workout-days/exercises/${weId}/sets`, "POST", data),
  updateSet: (setId: number, data: any) =>
    request(`/workout-days/sets/${setId}`, "PUT", data),
  deleteSet: (setId: number) =>
    request(`/workout-days/sets/${setId}`, "DELETE"),

  // ==========================================
  // ПРОГРАМИ (Workout Programs)
  // ==========================================
  getPrograms: () => request("/programs/"),
  createProgram: (data: any) => request("/programs/", "POST", data),
  getProgram: (id: number) => request(`/programs/${id}`),
  updateProgram: (id: number, data: any) => request(`/programs/${id}`, "PUT", data),
  deleteProgram: (id: number) => request(`/programs/${id}`, "DELETE"),

  // Тренування всередині програми
  getProgramDays: (programId: number) => request(`/programs/${programId}/days`),
  addNewDayToProgram: (programId: number, data: { title: string; description?: string }) =>
    request(`/programs/${programId}/days`, "POST", data),
  addGalleryDayToProgram: (programId: number, galleryDayId: number) =>
    request(`/programs/${programId}/days/from-gallery/${galleryDayId}`, "POST"),
  removeDayFromProgram: (programId: number, pdId: number) =>
    request(`/programs/${programId}/days/${pdId}`, "DELETE"),

  // ==========================================
  // ТРЕНУВАЛЬНІ СЕСІЇ (Training Sessions)
  // ==========================================
  getSessions: (params?: { date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    const q = qs.toString();
    return request(`/sessions/${q ? "?" + q : ""}`);
  },
  createSession: (data: any) => request("/sessions/", "POST", data),
  getSession: (id: number) => request(`/sessions/${id}`),
  updateSession: (id: number, data: any) => request(`/sessions/${id}`, "PATCH", data),
  deleteSession: (id: number) => request(`/sessions/${id}`, "DELETE"),
  startSession: (id: number) => request(`/sessions/${id}/start`, "PATCH"),
  finishSession: (id: number) => request(`/sessions/${id}/finish`, "PATCH"),
  resumeSession: (id: number) => request(`/sessions/${id}/resume`, "PATCH"),
  addExerciseToSession: (sessionId: number, data: any) =>
    request(`/sessions/${sessionId}/exercises`, "POST", data),
  removeExerciseFromSession: (sessionId: number, seId: number) =>
    request(`/sessions/${sessionId}/exercises/${seId}`, "DELETE"),
  updateSessionExercise: (sessionId: number, seId: number, data: { note?: string }) =>
    request(`/sessions/${sessionId}/exercises/${seId}`, "PATCH", data),
  reorderSessionExercises: (sessionId: number, order: { se_id: number; position: number }[]) =>
    request(`/sessions/${sessionId}/exercises/reorder`, "PUT", order),

  updateSessionSet: (sessionId: number, seId: number, setId: number, data: any) =>
    request(`/sessions/${sessionId}/exercises/${seId}/sets/${setId}`, "PATCH", data),
  addSetToSessionExercise: (sessionId: number, seId: number, data: any) =>
    request(`/sessions/${sessionId}/exercises/${seId}/sets`, "POST", data),
  deleteSessionSet: (sessionId: number, seId: number, setId: number) =>
    request(`/sessions/${sessionId}/exercises/${seId}/sets/${setId}`, "DELETE"),
  completeAllSessionSets: (sessionId: number) =>
    request(`/sessions/${sessionId}/complete-all-sets`, "POST"),
};