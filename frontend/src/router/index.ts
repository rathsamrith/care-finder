import { createRouter, createWebHistory } from 'vue-router'
import axiosInstance from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth-store'
import { createAcl, defineAclRules } from 'vue-simple-acl'
import { tenant } from '@/lib/tenant'

const simpleAcl = createAcl()

// On <slug>.<root domain> the SPA serves only the hospital's public site: one
// page, no account/auth routes, and unknown paths fall back to it.
const siteRoutes = [
  { path: '/', name: 'hospital-site', component: () => import('../views/site/site-view.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: tenant ? siteRoutes : [
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/admin/dashboard-view.vue'),
      meta: {
        requiresAuth: true,
        role: 'admin'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/admin/auth/login-view.vue')
    },
    {
      path: '/landing',
      name: 'landing',
      component: () => import('../views/web/home-view.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/web/user/profile-view.vue')
    },
    {
      path: '/hospital/detail',
      name: 'hospital-detail',
      component: () => import('../views/web/user/hospital-detail-view.vue')
    },
    {
      path: '/post',
      name: 'post',
      component: () => import('../views/web/post/list-view.vue')
    },
    {
      path: '/about',
      name: 'about', // Fixed duplicate name
      component: () => import('../views/web/about-view.vue')
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('../views/web/contact-view.vue')
    },
    {
      path: '/hospital/dashboard',
      name: 'hospital-dashboard',
      component: () => import('../views/web/hospital/dashboard-view.vue')
    },
    {
      path:'/appointment',
      name:'appointment',
      component:()=>import('../views/web/user/appointment-view.vue')
    },
    {
      path:'/hospital/feedbacks',
      name:'feedbacks',
      component:()=>import('../views/web/hospital/feedback-view.vue')
    },
    {
      path:'/hospital/appointments',
      name:'appointments',
      component: () => import('../views/web/hospital/appointment-view.vue')
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('../views/web/user/map-view.vue')
    },
    {
      path: '/myHospital',
      name: 'myHospital',
      component: () => import('../views/web/hospital/hospital-view.vue')
    },
    {
      path:'/hospital/doctors',
      name:'doctors',
      component:()=>import('../views/web/hospital/add-doctor-view.vue')
    },
    {
      path: '/',
      name: 'user-hospital',
      component: () => import('../views/web/user/hospital-view.vue')
    },
    {
      path:'/doctor/dashboard',
      name:'doctor-dashboard',
      component:()=>import('../views/web/doctor/dashboard.vue')
    },
    {
      path:'/doctor/appointment',
      name:'doctor-appointment',
      component:()=>import('../views/web/doctor/appointment.vue')
    },
    {
      path: '/favorite',
      name: 'favorite',
      component: () => import('../views/web/user/favorite-view.vue')
    },
    {
      path:'/forgot-password',
      name:'forgot-password',
      component: () => import('../views/admin/auth/forgot-password.vue')
    },
    {
      path:'/reset-password',
      name:'reset-password',
      component: () => import('../views/admin/auth/reset-password.vue')
    },
    {
      path:'/not-found',
      name:'not-found',
      component: () => import('../views/web/404/not-found-view.vue')

    }
    ,
    {
      path:'/not-found-page',
      name:'not-found-page',
      redirect: '/not-found'
    },
    {
      path:'/hospital/calendar',
      name:'hospital-calendar',
      component:() => import('../views/web/hospital/calendar-view.vue')
    },
    {
      path:'/doctor/calendar',
      name:'doctor-calendar',
      component:() => import('../views/web/doctor/calendar-view.vue')
    },
    {
      path:'/calendar',
      name:'user-calendar',
      component:() => import('../views/web/user/calendar-view.vue')
    }
    ,
    {
      path:'/hospital/promotion',
      name:'upload/promotion',
      component: () => import('../views/web/hospital/upload-promotion.vue')
    }
    ,
    {
      path:'/hospital/service',
      name:'service-hospital',
      component: () => import('../views/web/hospital/service-hospital.vue')
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('../views/web/discovery/explore-view.vue')
    },
    {
      path: '/nearby',
      name: 'nearby',
      component: () => import('../views/web/discovery/nearby-view.vue')
    },
    {
      path: '/emergency-info',
      name: 'emergency-info',
      component: () => import('../views/web/discovery/emergency-info-view.vue')
    },
    {
      path: '/doctor/schedule',
      name: 'doctor-schedule',
      component: () => import('../views/web/doctor/schedule-view.vue')
    },
    {
      // Full-screen page for the hospital's check-in tablet (pairs with a device key, no login).
      path: '/kiosk',
      name: 'kiosk',
      component: () => import('../views/kiosk/kiosk-view.vue')
    },
    {
      path: '/hospital/queue',
      name: 'hospital-queue',
      component: () => import('../views/web/hospital/queue-view.vue')
    },
    {
      path: '/doctor/queue',
      name: 'doctor-queue',
      component: () => import('../views/web/hospital/queue-view.vue')
    },
    {
      path: '/hospital/kiosks',
      name: 'hospital-kiosks',
      component: () => import('../views/web/hospital/kiosks-view.vue')
    },
    {
      path: '/hospital/team',
      name: 'hospital-team',
      component: () => import('../views/web/hospital/team-view.vue')
    },
    {
      // Reached from an invitation email; shows its own sign-in prompt when logged out.
      path: '/accept-invite',
      name: 'accept-invite',
      component: () => import('../views/admin/auth/accept-invite-view.vue')
    },
    {
      path: '/hospital/new',
      name: 'hospital-new',
      component: () => import('../views/web/hospital/new-hospital-view.vue')
    },
    {
      path: '/hospital/site',
      name: 'hospital-site-editor',
      component: () => import('../views/web/hospital/site-editor-view.vue')
    }
  ],
  linkExactActiveClass: 'active'
})

router.beforeEach(async (to, from, next) => {
  // Site visitors are anonymous; skip the /me round trip entirely.
  if (tenant) return next()
  const publicPages = ['/landing', '/login', '/about', '/contact','/forgot-password','/reset-password','/not-found','/not-found-page','/explore','/nearby','/emergency-info','/hospital/detail','/accept-invite','/kiosk']
  const authRequired = !publicPages.includes(to.path)
  const store = useAuthStore()
  try {
    const { data } = await axiosInstance.get('/me')
    store.isAuthenticated = true
    store.user = data
    store.hospital = data.hospital ?? 'No hospital'
    store.hospitals = data.hospitals ?? []
    store.permissions = data.permissions
    store.roles = data.roles
    const rules = () => defineAclRules((setRule) => {
      store.permissions.forEach((permission: string) => {
        setRule(permission, () => true)
      })
    })
    simpleAcl.rules = rules()
  } catch (error) {
    //
  }
  if (authRequired && !store.isAuthenticated) {
    next('/landing')
  } else {
    next()
  }
})

export default { router, simpleAcl }
