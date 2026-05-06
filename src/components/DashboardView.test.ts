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
})
