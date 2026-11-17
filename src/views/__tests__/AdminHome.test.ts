import { describe, expect, it, vi } from 'vitest'
import { mountAt } from './helpers'
import AdminHome from '../admin/AdminHome.vue'

describe('AdminHome', () => {
  it('renders all admin entries including content config', async () => {
    const { wrapper } = await mountAt(AdminHome, '/admin')
    expect(wrapper.text()).toContain('房源管理')
    expect(wrapper.text()).toContain('预约管理')
    expect(wrapper.text()).toContain('楼栋管理')
    expect(wrapper.text()).toContain('每日密码')
    expect(wrapper.text()).toContain('企微客服配置')
    expect(wrapper.text()).toContain('咨询内容配置')
    expect(wrapper.text()).toContain('咨询常见问题与看房须知')
  })

  it('navigates to content config on entry click', async () => {
    const { wrapper, router } = await mountAt(AdminHome, '/admin')
    const pushSpy = vi.spyOn(router, 'push')
    const cells = wrapper.findAll('.van-cell')
    const entry = cells.find((cell) => cell.text().includes('咨询内容配置'))
    expect(entry).toBeDefined()
    await entry!.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/admin/content-config')
  })
})
