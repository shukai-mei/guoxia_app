import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import App from './App.vue'

const useRouteMock = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRoute: useRouteMock
}))

const STUBS = {
  RouterView: { template: '<div class="router-view-stub" />' },
  ContactFloating: { template: '<div class="contact-floating-stub" />' }
}

function mountApp() {
  return shallowMount(App, { global: { stubs: STUBS } })
}

beforeEach(() => {
  useRouteMock.mockReset()
})

describe('App', () => {
  it('renders router view', () => {
    useRouteMock.mockReturnValue({ path: '/' })
    const wrapper = mountApp()
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })

  it('shows contact floating on tenant pages', () => {
    useRouteMock.mockReturnValue({ path: '/my-appointments' })
    const wrapper = mountApp()
    expect(wrapper.find('.contact-floating-stub').exists()).toBe(true)
  })

  it('hides contact floating on admin pages', () => {
    useRouteMock.mockReturnValue({ path: '/admin/buildings' })
    const wrapper = mountApp()
    expect(wrapper.find('.contact-floating-stub').exists()).toBe(false)
  })
})
