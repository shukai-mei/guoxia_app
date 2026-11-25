import { createMemoryHistory, createRouter } from 'vue-router'
import type { Component, Directive } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import Vant from 'vant'

const Dummy = { template: '<div />' }

// jsdom 无 IntersectionObserver 与布局，vant 的 lazy 指令不会触发加载；
// 测试中直接写入 src，让图片立即渲染
const lazyDirective: Directive<HTMLElement, string> = {
  beforeMount(el, binding) {
    if (binding.value) el.setAttribute('src', binding.value)
  },
  updated(el, binding) {
    if (binding.value) el.setAttribute('src', binding.value)
  }
}

export function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/properties/:id', name: 'tenant-property-detail', component: Dummy },
      { path: '/booking-success/:appointmentId', name: 'tenant-booking-success', component: Dummy },
      { path: '/my-appointments', name: 'tenant-my-appointments', component: Dummy },
      { path: '/agreement/:type', name: 'tenant-agreement', component: Dummy },
      { path: '/admin/properties/new', name: 'admin-property-new', component: Dummy },
      { path: '/admin/properties/:id/edit', name: 'admin-property-edit', component: Dummy },
      { path: '/admin/buildings/new', name: 'admin-building-new', component: Dummy },
      { path: '/admin/buildings/:id/edit', name: 'admin-building-edit', component: Dummy },
      { path: '/admin/housekeepers', name: 'admin-housekeeper-list', component: Dummy }
    ]
  })
}

export async function mountAt(component: Component, path: string) {
  const router = makeRouter()
  const replaceSpy = vi.spyOn(router, 'replace')
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [Vant, router], directives: { lazy: lazyDirective } } })
  return { wrapper, router, replaceSpy }
}

export { mount }
