import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HistoryView from './HistoryView.vue'
import { createAppStore } from '../stores/appStore'

describe('HistoryView', () => {
  it('shows an empty state when no generation history exists', () => {
    const store = createAppStore()
    const wrapper = mount(HistoryView, { props: { store } })
    expect(wrapper.text()).toContain('暂无历史记录')
  })
})
