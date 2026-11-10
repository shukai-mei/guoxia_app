import { createRouter, createWebHistory } from 'vue-router'

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
    }
  ]
})

export default router
