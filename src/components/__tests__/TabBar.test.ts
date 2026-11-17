import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Vant from 'vant'
import TabBar from '../TabBar.vue'

const useRouteMock = vi.hoisted(() => vi.fn())
const pushMock = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRoute: useRouteMock,
  useRouter: () => ({ push: pushMock })
}))

function mountTabBar() {
  return mount(TabBar, { global: { plugins: [Vant] } })
}

function activeLabels(wrapper: ReturnType<typeof mountTabBar>): string[] {
  return wrapper
    .findAll('.tab-item--active .tab-label')
    .map((node) => node.text())
}

beforeEach(() => {
  vi.clearAllMocks()
  useRouteMock.mockReturnValue({ path: '/' })
})

describe('TabBar', () => {
  it.each([
    ['/', '房源'],
    ['/my-appointments', '预约'],
    ['/booking-success/123', '预约'],
    ['/consultation', '咨询']
  ])('derives active tab from path %s', (path, label) => {
    useRouteMock.mockReturnValue({ path })
    const wrapper = mountTabBar()
    expect(activeLabels(wrapper)).toEqual([label])
  })

  it('renders three tabs with labels', () => {
    const wrapper = mountTabBar()
    expect(wrapper.findAll('.tab-item')).toHaveLength(3)
    expect(wrapper.findAll('.tab-label').map((n) => n.text())).toEqual(['房源', '预约', '咨询'])
  })

  it('navigates to the tapped tab', async () => {
    useRouteMock.mockReturnValue({ path: '/' })
    const wrapper = mountTabBar()
    const tabs = wrapper.findAll('.tab-item')

    await tabs[1].trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/my-appointments')

    await tabs[2].trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/consultation')
  })

  it('does not navigate when tapping the active tab', async () => {
    useRouteMock.mockReturnValue({ path: '/' })
    const wrapper = mountTabBar()
    await wrapper.findAll('.tab-item')[0].trigger('click')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('outputs a placeholder block for content avoidance', () => {
    const wrapper = mountTabBar()
    expect(wrapper.find('.tab-bar-holder').exists()).toBe(true)
  })
})
