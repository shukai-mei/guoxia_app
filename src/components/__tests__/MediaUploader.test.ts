import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Vant from 'vant'
import MediaUploader, { type UploadedMedia } from '../MediaUploader.vue'
import type { MediaType } from '../../api/types'

interface UploaderProps {
  type: MediaType
  modelValue?: UploadedMedia[]
  max?: number
  label?: string
}

function mountUploader(props: UploaderProps) {
  return mount(MediaUploader, {
    props,
    global: { plugins: [Vant] }
  })
}

describe('MediaUploader', () => {
  it('uses default label per type', () => {
    const wrapper = mountUploader({ type: 'SURROUNDING' })
    expect(wrapper.find('.media-uploader-label').text()).toBe('周边图')
  })

  it('overrides label via label prop', () => {
    const wrapper = mountUploader({ type: 'SURROUNDING', label: '地址参考图' })
    expect(wrapper.find('.media-uploader-label').text()).toBe('地址参考图')
  })

  it('hides add cell when reaching max', () => {
    const wrapper = mountUploader({
      type: 'SURROUNDING',
      max: 1,
      modelValue: [{ type: 'SURROUNDING', key: 'k', url: 'u', sortOrder: 0 }]
    })
    expect(wrapper.find('.media-uploader-add').exists()).toBe(false)
  })

  it('emits updated list without removed item on remove', async () => {
    const wrapper = mountUploader({
      type: 'SURROUNDING',
      modelValue: [
        { type: 'SURROUNDING', key: 'a', url: 'u1', sortOrder: 0 },
        { type: 'SURROUNDING', key: 'b', url: 'u2', sortOrder: 1 }
      ]
    })
    await wrapper.findAll('.media-uploader-remove')[0].trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
    expect(emitted![0][0]).toEqual([{ type: 'SURROUNDING', key: 'b', url: 'u2', sortOrder: 0 }])
  })
})
