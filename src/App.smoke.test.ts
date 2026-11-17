import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import App from './App.vue'

const useRouteMock = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRoute: useRouteMock
}))

const STUBS = {
  RouterView: { template: '<div class="router-view-stub" />' },
  TabBar: { template: '<div class="tab-bar-stub" />' }
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

  it.each(['/', '/my-appointments', '/consultation', '/booking-success/123'])(
    'shows tab bar on tenant page %s',
    (path) => {
      useRouteMock.mockReturnValue({ path })
      const wrapper = mountApp()
      expect(wrapper.find('.tab-bar-stub').exists()).toBe(true)
    }
  )

  it.each(['/properties/123', '/admin', '/admin/buildings'])(
    'hides tab bar on %s',
    (path) => {
      useRouteMock.mockReturnValue({ path })
      const wrapper = mountApp()
      expect(wrapper.find('.tab-bar-stub').exists()).toBe(false)
    }
  )
})
