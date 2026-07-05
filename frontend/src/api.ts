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

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
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

export const api = {
  // Вправи (Exercises)
  createExercise: (data: any) => request("/exercises/", "POST", data),
  getExercises: () => request("/exercises/", "GET"),
  updateExercise: (id: number, data: any) => request(`/exercises/${id}`, "PUT", data),

  // Дні тренувань (Workout Days)
  createWorkoutDay: (data: any) => request("/workout-days/", "POST", data),
  getWorkoutDays: () => request("/workout-days/", "GET"),
  updateWorkoutDay: (id: number, data: any) => request(`/workout-days/${id}`, "PUT", data),

  // Програми (Workout Programs)
  createProgram: (data: any) => request("/programs/", "POST", data),
  getPrograms: () => request("/programs/", "GET"),
  addTemplateDayToProgram: (programId: number, templateDayId: number, position: number) => 
    request(`/programs/${programId}/add-day-from-template/${templateDayId}`, "POST", { position }),
};