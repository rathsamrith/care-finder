import { createRouter, createWebHistory } from 'vue-router'
import axiosInstance from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth-store'
import { simpleAcl, rules } from '@/acl'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/admin/dashboard',
      name: 'dashboard',
      component: () => import('../views/Admin/DashboardView.vue'),
      meta: {
        requiresAuth: true,
        role: 'admin'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Admin/Auth/LoginView.vue')
    },
    {
      path: '/landing',
      name: 'landing',
      component: () => import('../views/Web/HomeView.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Web/User/ProfileView.vue')
    },
    {
      path: '/hospital/detail',
      name: 'hospital-detail',
      component: () => import('../views/Web/User/HospitalDetailView.vue')
    },
    {
      path: '/post',
      name: 'post',
      component: () => import('@/views/Web/Post/ListView.vue')
    },
    {
      path: '/about',
      name: 'about', // Fixed duplicate name
      component: () => import('@/views/Web/AboutView.vue')
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('@/views/Web/ContactView.vue')
    },
    {
      path: '/hospital/dashboard',
      name: 'dashboard',
      component: () => import('@/views/Web/Hospital/DashboardView.vue')
    },
    {
      path: '/appointment',
      name: 'appointment',
      component: () => import('@/views/Web/User/AppointmentView.vue')
    },
    {
      path: '/hospital/feedbacks',
      name: 'feedbacks',
      component: () => import('@/views/Web/Hospital/FeedbackView.vue')
    },
    {
      path: '/hospital/appointments',
      name: 'appointments',
      component: () => import('@/views/Web/Hospital/AppointmentView.vue')
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('@/views/Web/User/MapView.vue')
    },
    {
      path: '/myHospital',
      name: 'myHospital',
      component: () => import('@/views/Web/Hospital/HospitalView.vue')
    },
    {
      path: '/hospital/doctors',
      name: 'doctors',
      component: () => import('@/views/Web/Hospital/AddDoctorView.vue')
    },
    {
      path: '/',
      name: 'user-hospital',
      component: () => import('@/views/Web/User/HospitalView.vue')
    },
    {
      path: '/doctor/dashboard',
      name: 'doctor-dashboard',
      component: () => import('@/views/Web/Doctor/Dashboard.vue')
    },
    {
      path: '/doctor/appointment',
      name: 'doctor-appointment',
      component: () => import('@/views/Web/Doctor/Appointment.vue')
    },
    {
      path: '/favorite',
      name: 'favorite',
      component: () => import('@/views/Web/User/FavoriteView.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/Admin/Auth/ForgotPassword.vue')
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/Admin/Auth/ResetPassword.vue')
    },
    {
      path: '/not-found',
      name: 'not-found',
      component: () => import('@/views/Web/404/NotFoundView.vue')
    },
    {
      path: '/not-found-page',
      name: 'not-found-page',
      component: () => import('@/views/Web/404/PageNotFound.vue')
    },
    {
      path: '/hospital/calendar',
      name: 'hospital-calendar',
      component: () => import('@/views/Web/Hospital/CalendarView.vue')
    },
    {
      path: '/doctor/calendar',
      name: 'doctor-calendar',
      component: () => import('@/views/Web/Doctor/CalendarView.vue')
    },
    {
      path: '/calendar',
      name: 'user-calendar',
      component: () => import('@/views/Web/User/CalendarView.vue')
    },
    {
      path: '/hospital/promotion',
      name: 'upload/promotion',
      component: () => import('@/views/Web/Hospital/UploadPromotion.vue')
    },
    {
      path: '/hospital/service',
      name: 'service-hospital',
      component: () => import('@/views/Web/Hospital/ServiceHospital.vue')
    }
  ],
  linkExactActiveClass: 'active'
})

router.beforeEach(async (to, from, next) => {
  const publicPages = [
    '/landing',
    '/login',
    '/about',
    '/contact',
    '/forgot-password',
    '/reset-password',
    '/not-found',
    '/not-found-page'
  ]
  const authRequired = !publicPages.includes(to.path)
  const store = useAuthStore()
  if (authRequired && !store.isAuthenticated) {
    next('/landing')
  } else {
    next()
    try {
      const { data } = await axiosInstance.get('/me')
      store.isAuthenticated = true
      store.user = data.data
      store.hospital = data.hospitals
      store.permissions = data.permissions.map((item: any) => item.front_name)
      store.roles = data.roles.map((item: any) => item)
      simpleAcl.rules = rules(store.permissions)
    } catch (error) {
      //
    }
  }
})

export default { router, simpleAcl }
