import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: false, // Changed to false - using Authorization header instead
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('session_token');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const exchangeSession = (sessionId) => 
  api.post('/auth/session', { session_id: sessionId });

export const getMe = () => 
  api.get('/auth/me');

export const logout = () => 
  api.post('/auth/logout');

// Cases
export const getCases = () => 
  api.get('/cases');

export const getCase = (caseId) => 
  api.get(`/cases/${caseId}`);

export const createCase = (caseData) => 
  api.post('/cases', caseData);

export const updateCase = (caseId, caseData) => 
  api.put(`/cases/${caseId}`, caseData);

export const deleteCase = (caseId) => 
  api.delete(`/cases/${caseId}`);

// Rubrics
export const getRubrics = () => 
  api.get('/rubrics');

export const createRubric = (rubricData) => 
  api.post('/rubrics', rubricData);

export const updateRubric = (rubricId, rubricData) => 
  api.put(`/rubrics/${rubricId}`, rubricData);

export const deleteRubric = (rubricId) => 
  api.delete(`/rubrics/${rubricId}`);

export const generateCase = (genData) => 
  api.post('/cases/generate', genData);

// Simulations
export const startSimulation = (caseId) => 
  api.post('/simulations/start', { case_id: caseId });

export const endSimulation = (simId) => 
  api.post(`/simulations/${simId}/end`);

export const getSimulations = () => 
  api.get('/simulations');

export const getSimulation = (simId) => 
  api.get(`/simulations/${simId}`);

// Evaluations
export const generateEvaluation = (simId) => 
  api.post(`/evaluations/generate?sim_id=${simId}`);

export const getEvaluation = (simId) => 
  api.get(`/evaluations/${simId}`);

// Dashboard
export const getDashboardStats = () => 
  api.get('/dashboard/stats');

export const getCompetencies = () => 
  api.get('/dashboard/competencies');

export const getTrends = () => 
  api.get('/dashboard/trends');

export default api;
