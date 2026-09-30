import axios from 'axios'
import { getActiveHospitalId } from '@/lib/active-hospital'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/v1',
  // Preview deploys (VITE_APP_MODE=preview) never touch the network: requests
  // are answered from src/mocks. Written as an inline env comparison so prod
  // builds drop this branch and never bundle the mock code.
  ...(import.meta.env.VITE_APP_MODE === 'preview'
    ? { adapter: (config: any) => import('@/mocks/adapter').then((m) => m.mockAdapter(config)) }
    : {})
})

// Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Do something before request is sent
    // For example, add an authentication token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Which of the account's hospitals dashboard calls act on (verified server-side).
    const hospitalId = getActiveHospitalId()
    if (hospitalId) {
      config.headers['X-Hospital-Id'] = hospitalId
    }
    return config
  },
  (error) => {
    // Do something with request error
    console.log(error)
    return Promise.reject(error)
  }
)

// Add a response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle error
    if (error.response?.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
