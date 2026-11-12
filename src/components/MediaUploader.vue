<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { uploadFile } from '../api'
import type { MediaType } from '../api/types'
import { errorMessageOf } from '../utils/error'
import { validateMediaFile } from '../utils/validate'

export interface UploadedMedia {
  type: MediaType
  key: string
  url: string
  sortOrder: number
}

const props = withDefaults(
  defineProps<{
    type: MediaType
    modelValue?: UploadedMedia[]
    max?: number
    label?: string
  }>(),
  { modelValue: () => [], max: Infinity, label: '' }
)

const emit = defineEmits<{
  'update:modelValue': [value: UploadedMedia[]]
}>()

const TYPE_LABEL: Record<MediaType, string> = {
  SURROUNDING: '周边图',
  VIDEO: '内屋视频'
}

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const items = computed(() => props.modelValue)
const label = computed(() => props.label || TYPE_LABEL[props.type])
const accept = computed(() =>
  props.type === 'VIDEO'
    ? 'video/mp4,.mp4'
    : 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
)
const canAdd = computed(() => items.value.length < props.max)

function triggerSelect() {
  if (canAdd.value && !uploading.value) {
    fileInput.value?.click()
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  const error = validateMediaFile(file)
  if (error) {
    showToast(error)
    return
  }
  uploading.value = true
  uploadFile(file)
    .then((result) => {
      const next = [
        ...items.value,
        { type: props.type, key: result.key, url: result.url, sortOrder: items.value.length }
      ]
      emit('update:modelValue', next)
    })
    .catch((error) => showToast(errorMessageOf(error)))
    .finally(() => {
      uploading.value = false
    })
}

function removeAt(index: number) {
  const next = items.value
    .filter((_, i) => i !== index)
    .map((item, i) => ({ ...item, sortOrder: i }))
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="media-uploader">
    <div class="media-uploader-header">
      <span class="media-uploader-label">{{ label }}</span>
      <span v-if="type === 'VIDEO'" class="media-uploader-hint">至多 1 个</span>
      <span v-else class="media-uploader-hint">已添加 {{ items.length }} 个</span>
    </div>
    <div class="media-uploader-grid">
      <div v-for="(item, index) in items" :key="item.key" class="media-uploader-item">
        <img v-if="type !== 'VIDEO'" :src="item.url" class="media-uploader-thumb" alt="媒体预览" />
        <video v-else :src="item.url" class="media-uploader-thumb" muted preload="metadata"></video>
        <div class="media-uploader-remove" @click="removeAt(index)">×</div>
      </div>
      <div v-if="canAdd" class="media-uploader-add" @click="triggerSelect">
        <van-loading v-if="uploading" size="20px" />
        <template v-else>+</template>
      </div>
    </div>
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      class="media-uploader-input"
      @change="onFileChange"
    />
  </div>
</template>

<style scoped>
.media-uploader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.media-uploader-label {
  font-size: 14px;
  font-weight: 600;
}

.media-uploader-hint {
  font-size: 12px;
  color: #969799;
}

.media-uploader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}

.media-uploader-item {
  position: relative;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  background: #f2f3f5;
}

.media-uploader-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.media-uploader-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
}

.media-uploader-add {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #c8c9cc;
  border-radius: 6px;
  font-size: 24px;
  color: #969799;
  background: #fff;
}

.media-uploader-input {
  display: none;
}
</style>
