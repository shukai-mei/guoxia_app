import { createRouter, createWebHistory } from 'vue-router'
import { getAdminAuthToken } from '../utils/adminAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'tenant-property-list',
      component: () => import('../views/tenant/PropertyList.vue')
    },
    {
      path: '/properties/:id',
      name: 'tenant-property-detail',
      component: () => import('../views/tenant/PropertyDetail.vue')
    },
    {
      path: '/booking-success/:appointmentId',
      name: 'tenant-booking-success',
      component: () => import('../views/tenant/BookingSuccess.vue')
    },
    {
      path: '/my-appointments',
      name: 'tenant-my-appointments',
      component: () => import('../views/tenant/MyAppointments.vue')
    },
    {
      path: '/consultation',
      name: 'tenant-consultation',
      component: () => import('../views/tenant/Consultation.vue')
    },
    {
      path: '/agreement/:type',
      name: 'tenant-agreement',
      component: () => import('../views/tenant/Agreement.vue')
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/LoginView.vue')
    },
    {
      path: '/admin',
      name: 'admin-home',
      component: () => import('../views/admin/AdminHome.vue')
    },
    {
      path: '/admin/properties',
      name: 'admin-property-list',
      component: () => import('../views/admin/AdminPropertyList.vue')
    },
    {
      path: '/admin/properties/new',
      name: 'admin-property-new',
      component: () => import('../views/admin/PropertyForm.vue')
    },
    {
      path: '/admin/properties/:id/edit',
      name: 'admin-property-edit',
      component: () => import('../views/admin/PropertyForm.vue')
    },
    {
      path: '/admin/appointments',
      name: 'admin-appointment-list',
      component: () => import('../views/admin/AdminAppointmentList.vue')
    },
    {
      path: '/admin/buildings',
      name: 'admin-building-list',
      component: () => import('../views/admin/BuildingList.vue')
    },
    {
      path: '/admin/buildings/new',
      name: 'admin-building-new',
      component: () => import('../views/admin/BuildingForm.vue')
    },
    {
      path: '/admin/buildings/:id/edit',
      name: 'admin-building-edit',
      component: () => import('../views/admin/BuildingForm.vue')
    },
    {
      path: '/admin/daily-passwords',
      name: 'admin-daily-password-list',
      component: () => import('../views/admin/DailyPasswordList.vue')
    },
    {
      path: '/admin/wechat-config',
      name: 'admin-wechat-config',
      component: () => import('../views/admin/WechatConfig.vue')
    },
    {
      path: '/admin/content-config',
      name: 'admin-content-config',
      component: () => import('../views/admin/AdminContentConfig.vue')
    }
  ]
})

router.beforeEach((to) => {
  if (to.path.startsWith('/admin') && to.path !== '/admin/login') {
    if (!getAdminAuthToken()) {
      return { path: '/admin/login', query: { redirect: to.fullPath } }
    }
  }
  if (to.path === '/admin/login' && getAdminAuthToken()) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : ''
    return redirect || '/admin'
  }
  return true
})

export default router
