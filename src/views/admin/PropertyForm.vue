<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { adminListBuildings, createProperty, getProperty, updateProperty } from '../../api'
import { ApiError } from '../../api/http'
import type { Building, MediaInput, MediaType, PropertyInput } from '../../api/types'
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
  description: '',
  ttlockLockId: ''
})
const surroundings = ref<UploadedMedia[]>([])
const videos = ref<UploadedMedia[]>([])

const buildings = ref<Building[]>([])
const buildingId = ref<number | null>(null)
const buildingPickerShow = ref(false)

const loading = ref(isEdit.value)
const loadError = ref('')
const submitting = ref(false)

function toUploaded(type: MediaType, items: UploadedMedia[]): UploadedMedia[] {
  return [...items]
    .filter((m) => m.type === type)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({ type, key: m.key, url: m.url, sortOrder: m.sortOrder }))
}

const buildingName = computed(
  () => buildings.value.find((b) => b.id === buildingId.value)?.name ?? ''
)
const buildingOptions = computed(() =>
  buildings.value.map((b) => ({ ...b, className: 'building-column' }))
)

onMounted(async () => {
  try {
    const list = await adminListBuildings()
    buildings.value = list
    if (isEdit.value) {
      const property = await getProperty(propertyId as string)
      form.value = {
        title: property.title,
        location: property.location,
        layout: property.layout,
        area: String(property.area),
        rent: String(property.rent),
        contact: property.contact,
        description: property.description ?? '',
        ttlockLockId: property.ttlockLockId ?? ''
      }
      buildingId.value = property.buildingId
      surroundings.value = toUploaded('SURROUNDING', property.media as UploadedMedia[])
      videos.value = toUploaded('VIDEO', property.media as UploadedMedia[])
    }
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
  if (buildingId.value === null) {
    return '请选择所属楼栋'
  }
  return null
}

function buildMedia(): MediaInput[] {
  const groups: Record<MediaType, UploadedMedia[]> = {
    SURROUNDING: surroundings.value,
    VIDEO: videos.value
  }
  const result: MediaInput[] = []
  for (const type of Object.keys(groups) as MediaType[]) {
    groups[type].forEach((item, index) => {
      result.push({ type, key: item.key, sortOrder: index })
    })
  }
  return result
}

function onBuildingConfirm({ selectedValues }: { selectedValues: Array<string | number> }) {
  buildingId.value = (selectedValues[0] as number | null) ?? null
  buildingPickerShow.value = false
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
    buildingId: buildingId.value as number,
    media: buildMedia()
  }
  if (form.value.description.trim()) {
    input.description = form.value.description.trim()
  }
  if (form.value.ttlockLockId.trim()) {
    input.ttlockLockId = form.value.ttlockLockId.trim()
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
                :model-value="buildingName"
                readonly
                is-link
                label="所属楼栋"
                placeholder="请选择所属楼栋"
                :rules="[{ required: true, message: '请选择所属楼栋' }]"
                @click="buildingPickerShow = true"
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
              <van-field
                v-model="form.ttlockLockId"
                maxlength="64"
                label="通通锁锁具编号"
                placeholder="选填，用于预约开始前自动派发房门密码"
              />
            </van-cell-group>

            <div class="media-section">
              <MediaUploader v-model="surroundings" type="SURROUNDING" />
              <div class="uploader-gap"></div>
              <MediaUploader v-model="videos" type="VIDEO" :max="1" />
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

    <van-popup v-model:show="buildingPickerShow" position="bottom" round>
      <van-picker
        title="选择所属楼栋"
        :columns="buildingOptions"
        :columns-field-names="{ value: 'id' }"
        @confirm="onBuildingConfirm"
        @cancel="buildingPickerShow = false"
      >
        <template #option="option">
          {{ option.name }}
        </template>
      </van-picker>
    </van-popup>
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

:deep(.building-column) {
  text-align: left;
}
</style>
