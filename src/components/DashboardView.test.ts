import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DashboardView from './DashboardView.vue'
import { createAppStore } from '../stores/appStore'

describe('DashboardView', () => {
  it('shows validation issues before generation starts', async () => {
    const store = createAppStore()
    const wrapper = mount(DashboardView, { props: { store } })
    await wrapper.find('[data-test="start-generation"]').trigger('click')
    expect(wrapper.text()).toContain('产出资源目录')
    expect(wrapper.text()).toContain('模板')
    expect(wrapper.text()).toContain('Agent')
  })

  it('disables compression before the task is completed', () => {
    const store = createAppStore()
    const wrapper = mount(DashboardView, { props: { store } })
    const compressButton = wrapper.find('[data-test="compress-task"]')
    expect(compressButton.attributes('disabled')).toBeDefined()
  })

  it('shows the latest runtime error from the store', () => {
    const store = createAppStore()
    store.operation.value.lastError = {
      code: 'mock-node-failed',
      message: '节点生成失败',
      recoverable: true
    }
    const wrapper = mount(DashboardView, { props: { store } })
    expect(wrapper.text()).toContain('节点生成失败')
  })
})
