import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import App from './App.vue'

describe('App', () => {
  it('renders router view', () => {
    const wrapper = shallowMount(App, {
      global: {
        stubs: { RouterView: { template: '<div class="router-view-stub" />' } }
      }
    })
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })
})
