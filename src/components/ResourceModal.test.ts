import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ResourceModal from './ResourceModal.vue'

describe('ResourceModal', () => {
  it('does not render an HTML code editor for html-demo resources', () => {
    const wrapper = mount(ResourceModal, {
      props: {
        resource: {
          id: 'html-1',
          type: 'html-demo',
          name: '演示 HTML 界面',
          content: '<main>demo</main>',
          previewLabel: '本地预览',
          generatedAt: '2026-04-30 12:00:00',
          regenerateCount: 0,
          suggestions: []
        }
      }
    })
    expect(wrapper.text()).toContain('预览')
    expect(wrapper.find('textarea').exists()).toBe(false)
  })
})
