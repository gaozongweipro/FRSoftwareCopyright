import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsView from './SettingsView.vue'
import { createAppStore } from '../stores/appStore'

describe('SettingsView', () => {
  it('shows template parsing as agent analysis of ordinary docx structure and styles', async () => {
    const store = createAppStore()
    const wrapper = mount(SettingsView, { props: { store } })
    await wrapper.find('[data-test="add-manual-template"]').trigger('click')
    await wrapper.find('[data-test="parse-template"]').trigger('click')
    expect(wrapper.text()).toContain('结构节点')
    expect(wrapper.text()).toContain('动态内容字段')
    expect(wrapper.text()).toContain('样式规则')
  })

  it('shows agent unavailable when runtime test fails', async () => {
    const store = createAppStore()
    const wrapper = mount(SettingsView, { props: { store } })
    await wrapper.find('[data-test="test-agent"]').trigger('click')
    expect(wrapper.text()).toContain('unavailable')
  })

  it('shows a parse status while template parsing is controlled by the store', async () => {
    const store = createAppStore()
    const wrapper = mount(SettingsView, { props: { store } })
    await wrapper.find('[data-test="add-manual-template"]').trigger('click')
    expect(wrapper.text()).toContain('pending')
    await wrapper.find('[data-test="parse-template"]').trigger('click')
    expect(wrapper.text()).toContain('completed')
  })

  it('shows runtime mode and refresh action', async () => {
    const store = createAppStore()
    await store.refreshRuntimeStatus()
    const wrapper = mount(SettingsView, { props: { store } })

    expect(wrapper.text()).toContain('浏览器模拟运行时')
    expect(wrapper.find('[data-test="refresh-runtime-status"]').exists()).toBe(true)
  })

  it('shows runtime environment errors', async () => {
    const store = createAppStore()
    store.runtimeStatus.value = {
      mode: 'tauri',
      label: '桌面运行时',
      available: false,
      checkedAt: '2026-05-06T00:00:00.000Z',
      issues: [{ code: 'runtime-directory-readonly', message: '目录不可写', recoverable: true }]
    }
    const wrapper = mount(SettingsView, { props: { store } })

    expect(wrapper.text()).toContain('桌面运行时')
    expect(wrapper.text()).toContain('目录不可写')
  })
})
