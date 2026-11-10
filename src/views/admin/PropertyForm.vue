<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { createProperty, getProperty, updateProperty } from '../../api'
import { ApiError } from '../../api/http'
import type { MediaInput, MediaType, PropertyInput } from '../../api/types'
import MediaUploader, { type UploadedMedia } from '../../components/MediaUploader.vue'
import { errorMessageOf } from '../../utils/error'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'admin-property-edit')
const propertyId = route.params.id as string | undefined

const form = ref({
  title: '',
  location: '',
  layout: '',
  area: '',
  rent: '',
  contact: '',
  description: ''
})
const surroundings = ref<UploadedMedia[]>([])
const videos = ref<UploadedMedia[]>([])
const guides = ref<UploadedMedia[]>([])

const loading = ref(isEdit.value)
const loadError = ref('')
const submitting = ref(false)

function toUploaded(type: MediaType, items: UploadedMedia[]): UploadedMedia[] {
  return [...items]
    .filter((m) => m.type === type)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({ type, key: m.key, url: m.url, sortOrder: m.sortOrder }))
}

onMounted(async () => {
  if (!isEdit.value) {
    return
  }
  try {
    const property = await getProperty(propertyId as string)
    form.value = {
      title: property.title,
      location: property.location,
      layout: property.layout,
      area: String(property.area),
      rent: String(property.rent),
      contact: property.contact,
      description: property.description ?? ''
    }
    surroundings.value = toUploaded('SURROUNDING', property.media as UploadedMedia[])
    videos.value = toUploaded('VIDEO', property.media as UploadedMedia[])
    guides.value = toUploaded('GUIDE', property.media as UploadedMedia[])
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code === 404
        ? '房源不存在'
        : errorMessageOf(error)
  } finally {
    loading.value = false
  }
})

function validate(): string | null {
  const f = form.value
  if (!f.title.trim()) {
    return '请填写标题'
  }
  if (!f.location.trim()) {
    return '请填写位置'
  }
  if (!f.layout.trim()) {
    return '请填写户型'
  }
  const area = Number(f.area)
  if (f.area.trim() === '' || !Number.isFinite(area) || area <= 0) {
    return '请填写有效的面积'
  }
  const rent = Number(f.rent)
  if (f.rent.trim() === '' || !Number.isFinite(rent) || rent <= 0) {
    return '请填写有效的月租金'
  }
  if (!f.contact.trim()) {
    return '请填写联系方式'
  }
  return null
}

function buildMedia(): MediaInput[] {
  const groups: Record<MediaType, UploadedMedia[]> = {
    SURROUNDING: surroundings.value,
    VIDEO: videos.value,
    GUIDE: guides.value
  }
  const result: MediaInput[] = []
  for (const type of Object.keys(groups) as MediaType[]) {
    groups[type].forEach((item, index) => {
      result.push({ type, key: item.key, sortOrder: index })
    })
  }
  return result
}

async function onSubmit() {
  const error = validate()
  if (error) {
    showToast(error)
    return
  }
  const input: PropertyInput = {
    title: form.value.title.trim(),
    location: form.value.location.trim(),
    layout: form.value.layout.trim(),
    area: Number(form.value.area),
    rent: Number(form.value.rent),
    contact: form.value.contact.trim(),
    media: buildMedia()
  }
  if (form.value.description.trim()) {
    input.description = form.value.description.trim()
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateProperty(propertyId as string, input)
      showSuccessToast('保存成功')
    } else {
      await createProperty(input)
      showSuccessToast('录入成功')
    }
    router.replace('/admin/properties')
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div>
    <van-nav-bar
      :title="isEdit ? '编辑房源' : '录入房源'"
      left-arrow
      @click-left="goBack"
    />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading" class="state-block" color="#1989fa">加载中...</van-loading>

        <van-empty v-else-if="loadError" image="error" :description="loadError">
          <van-button size="small" type="primary" @click="goBack">返回</van-button>
        </van-empty>

        <template v-else>
          <van-form @submit="onSubmit">
            <van-cell-group inset>
              <van-field
                v-model="form.title"
                label="标题"
                placeholder="请输入房源标题"
                :rules="[{ required: true, message: '请填写标题' }]"
              />
              <van-field
                v-model="form.location"
                label="位置"
                placeholder="请输入位置"
                :rules="[{ required: true, message: '请填写位置' }]"
              />
              <van-field
                v-model="form.layout"
                label="户型"
                placeholder="如：两室一厅"
                :rules="[{ required: true, message: '请填写户型' }]"
              />
              <van-field
                v-model="form.area"
                type="digit"
                label="面积（㎡）"
                placeholder="请输入面积"
                :rules="[{ required: true, message: '请填写面积' }]"
              />
              <van-field
                v-model="form.rent"
                type="digit"
                label="月租金（元）"
                placeholder="请输入月租金"
                :rules="[{ required: true, message: '请填写月租金' }]"
              />
              <van-field
                v-model="form.contact"
                label="联系方式"
                placeholder="请输入联系方式"
                :rules="[{ required: true, message: '请填写联系方式' }]"
              />
              <van-field
                v-model="form.description"
                label="描述"
                type="textarea"
                rows="3"
                autosize
                placeholder="选填，请输入房源描述"
              />
            </van-cell-group>

            <div class="media-section">
              <MediaUploader v-model="surroundings" type="SURROUNDING" />
              <div class="uploader-gap"></div>
              <MediaUploader v-model="videos" type="VIDEO" :max="1" />
              <div class="uploader-gap"></div>
              <MediaUploader v-model="guides" type="GUIDE" />
            </div>

            <div class="submit-wrap">
              <van-button round block type="primary" native-type="submit" :loading="submitting">
                {{ isEdit ? '保存修改' : '录入房源' }}
              </van-button>
            </div>
          </van-form>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.state-block {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.media-section {
  background: #fff;
  border-radius: 8px;
  margin: 12px 16px 0;
  padding: 12px;
}

.uploader-gap {
  height: 16px;
}

.submit-wrap {
  padding: 16px;
}
</style>
