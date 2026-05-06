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
})
