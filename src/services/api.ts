const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const TOKEN_KEY = 'medichain_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  title: string;
  avatarInitials: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const api = {
  signUp: (email: string, password: string, fullName: string, role: string) =>
    apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    }),

  signIn: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => apiRequest<{ user: AuthUser }>('/auth/me'),
  
  // --- INVENTORY FUNCTIONS ---
  
  // Fetch live inventory
  getInventory: () => apiRequest<any[]>('/inventory'),

  // Add new medicine and stock batch
  addMedicine: (data: {
    medicineName: string;
    category?: string;
    unit?: string;
    rate?: number;
    batchId: string;
    quantity: number;
    expiryDate: string;
    reorderLevel?: number;
    supplier?: string;
  }) =>
    apiRequest<any>('/inventory/add', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update existing batch
  updateBatch: (id: string, data: { quantity?: number; rate?: number; expiryDate?: string; supplier?: string }) =>
    apiRequest<any>(`/inventory/batch/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete a batch
  deleteBatch: (id: string) =>
    apiRequest<any>(`/inventory/batch/${id}`, {
      method: 'DELETE',
    }),

  // Deduct stock
  deductInventory: (medicineName: string, quantity: number) =>
    apiRequest('/inventory/deduct', {
      method: 'POST',
      body: JSON.stringify({ medicineName, quantity }),
    }),
    // --- DOCTOR & PATIENT FUNCTIONS ---
  
  // Fetch all patients for the doctor's queue
  getPatients: () => apiRequest<any[]>('/patients'),

  // Create a new patient
  createPatient: (patientData: any) =>
    apiRequest<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    }),

  // Fetch all prescriptions (or a specific patient's history)
  getPrescriptions: () => apiRequest<any[]>('/prescriptions'),

  // Create a new E-Rx (Prescription)
  createPrescription: (prescriptionData: any) =>
    apiRequest('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescriptionData),
    }),
    // Update patient vitals or triage notes
  updatePatient: (id: string, data: any) =>
    apiRequest(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Upload document for a patient
  uploadPatientDocument: (id: string, docData: any) =>
    apiRequest(`/patients/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify(docData),
    }),

  // Advance prescription status in the 3-step lock
  advancePrescription: (id: string, dispensedBy?: string) =>
    apiRequest(`/prescriptions/${id}/advance`, {
      method: 'PATCH',
      body: JSON.stringify({ dispensedBy }),
    }),

  // --- FINANCE FUNCTIONS ---
  getRevenue: () => apiRequest<any[]>('/finance/revenue'),
  getForecast: () => apiRequest<any[]>('/finance/forecast'),
  getForecasts: () => apiRequest<any[]>('/finance/forecast'),

  // --- REVENUE REGISTRIES ---
  getClinicalRevenue: () => apiRequest<any[]>('/finance/clinical-revenue'),
  addClinicalRevenue: (data: any) => apiRequest<any>('/finance/clinical-revenue', { method: 'POST', body: JSON.stringify(data) }),
  getPharmacyRevenue: () => apiRequest<any[]>('/finance/pharmacy-revenue'),
  addPharmacyRevenue: (data: any) => apiRequest<any>('/finance/pharmacy-revenue', { method: 'POST', body: JSON.stringify(data) }),
};