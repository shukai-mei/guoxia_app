<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { adminCreateBuilding, adminGetBuilding, adminUpdateBuilding } from '../../api'
import { ApiError } from '../../api/http'
import type { BuildingInput, BuildingMediaItem } from '../../api/types'
import MediaUploader, { type UploadedMedia } from '../../components/MediaUploader.vue'
import { errorMessageOf } from '../../utils/error'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'admin-building-edit')
const buildingId = route.params.id as string | undefined

const form = ref({
  name: '',
  address: '',
  hasElevator: false,
  totalFloors: '',
  elevatorRatio: '',
  deliveryFacilities: '',
  livingExperience: '',
  slotStartTime: '',
  slotEndTime: '',
  slotDurationMinutes: '',
  accessDeviceSerial: ''
})
const media = ref<UploadedMedia[]>([])

const loading = ref(isEdit.value)
const loadError = ref('')
const submitting = ref(false)

const timePickerShow = ref(false)
const timePickerTarget = ref<'start' | 'end'>('start')
const pickedTime = ref<string[]>(['09', '00'])

function pad2(value: string): string {
  return value.padStart(2, '0')
}

function toMediaUploaded(items: BuildingMediaItem[]): UploadedMedia[] {
  return [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      type: 'SURROUNDING' as const,
      key: item.key,
      url: item.url,
      sortOrder: item.sortOrder
    }))
}

onMounted(async () => {
  if (!isEdit.value) {
    return
  }
  try {
    const building = await adminGetBuilding(buildingId as string)
    form.value = {
      name: building.name,
      address: building.address,
      hasElevator: building.hasElevator ?? false,
      totalFloors: building.totalFloors != null ? String(building.totalFloors) : '',
      elevatorRatio: building.elevatorRatio ?? '',
      deliveryFacilities: building.deliveryFacilities ?? '',
      livingExperience: building.livingExperience ?? '',
      slotStartTime: building.slotStartTime,
      slotEndTime: building.slotEndTime,
      slotDurationMinutes: String(building.slotDurationMinutes),
      accessDeviceSerial: building.accessDeviceSerial ?? ''
    }
    media.value = toMediaUploaded(building.media)
  } catch (error) {
    loadError.value =
      error instanceof ApiError && error.code === 404
        ? '楼栋不存在'
        : errorMessageOf(error)
  } finally {
    loading.value = false
  }
})

function validate(): string | null {
  const f = form.value
  if (!f.name.trim()) {
    return '请填写楼栋名称'
  }
  if (!f.address.trim()) {
    return '请填写地址'
  }
  if (!f.slotStartTime) {
    return '请选择每日可约开始时间'
  }
  if (!f.slotEndTime) {
    return '请选择每日可约结束时间'
  }
  if (f.slotEndTime <= f.slotStartTime) {
    return '结束时间必须晚于开始时间'
  }
  const duration = Number(f.slotDurationMinutes)
  if (f.slotDurationMinutes.trim() === '' || !Number.isInteger(duration) || duration < 30) {
    return '时段长度至少 30 分钟'
  }
  return null
}

function openTimePicker(target: 'start' | 'end') {
  timePickerTarget.value = target
  const current = target === 'start' ? form.value.slotStartTime : form.value.slotEndTime
  pickedTime.value = current ? current.split(':') : ['09', '00']
  timePickerShow.value = true
}

function onTimeConfirm() {
  const [hour, minute] = pickedTime.value
  if (hour !== undefined && minute !== undefined) {
    const value = `${pad2(hour)}:${pad2(minute)}`
    if (timePickerTarget.value === 'start') {
      form.value.slotStartTime = value
    } else {
      form.value.slotEndTime = value
    }
  }
  timePickerShow.value = false
}

function buildInput(): BuildingInput {
  const f = form.value
  const input: BuildingInput = {
    name: f.name.trim(),
    address: f.address.trim(),
    slotStartTime: f.slotStartTime,
    slotEndTime: f.slotEndTime,
    slotDurationMinutes: Number(f.slotDurationMinutes),
    media: media.value.map((item, index) => ({ key: item.key, sortOrder: index }))
  }
  input.hasElevator = f.hasElevator
  if (f.totalFloors.trim()) {
    input.totalFloors = Number(f.totalFloors)
  }
  if (f.elevatorRatio.trim()) {
    input.elevatorRatio = f.elevatorRatio.trim()
  }
  if (f.deliveryFacilities.trim()) {
    input.deliveryFacilities = f.deliveryFacilities.trim()
  }
  if (f.livingExperience.trim()) {
    input.livingExperience = f.livingExperience.trim()
  }
  if (f.accessDeviceSerial.trim()) {
    input.accessDeviceSerial = f.accessDeviceSerial.trim()
  }
  return input
}

async function onSubmit() {
  const error = validate()
  if (error) {
    showToast(error)
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await adminUpdateBuilding(buildingId as string, buildInput())
      showSuccessToast('保存成功')
    } else {
      await adminCreateBuilding(buildInput())
      showSuccessToast('登记成功')
    }
    router.replace('/admin/buildings')
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
      :title="isEdit ? '编辑楼栋' : '登记楼栋'"
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
                v-model="form.name"
                label="楼栋名称"
                placeholder="请输入楼栋名称"
                :rules="[{ required: true, message: '请填写楼栋名称' }]"
              />
              <van-field
                v-model="form.address"
                label="地址"
                placeholder="请输入地址"
                :rules="[{ required: true, message: '请填写地址' }]"
              />
              <van-field name="hasElevator" label="电梯">
                <template #input>
                  <van-switch v-model="form.hasElevator" size="20px" />
                </template>
              </van-field>
              <van-field
                v-model="form.totalFloors"
                type="digit"
                label="总楼层"
                placeholder="选填，请输入总楼层"
              />
              <van-field
                v-model="form.elevatorRatio"
                label="梯户比"
                placeholder="选填，如：两梯四户"
              />
              <van-field
                v-model="form.deliveryFacilities"
                label="快递与生活配套"
                type="textarea"
                rows="2"
                autosize
                placeholder="选填，请输入快递与生活配套描述"
              />
              <van-field
                v-model="form.livingExperience"
                label="采光噪音体验"
                type="textarea"
                rows="2"
                autosize
                placeholder="选填，请输入采光噪音体验描述"
              />
              <van-field
                :model-value="form.slotStartTime"
                readonly
                is-link
                label="每日开始时间"
                placeholder="请选择每日可约开始时间"
                @click="openTimePicker('start')"
              />
              <van-field
                :model-value="form.slotEndTime"
                readonly
                is-link
                label="每日结束时间"
                placeholder="请选择每日可约结束时间"
                @click="openTimePicker('end')"
              />
              <van-field
                v-model="form.slotDurationMinutes"
                type="digit"
                label="时段长度（分钟）"
                placeholder="请输入时段长度，至少 30 分钟"
              />
              <van-field
                v-model="form.accessDeviceSerial"
                maxlength="64"
                label="门禁设备序列号"
                placeholder="选填，用于预约时段内自助开门"
              />
            </van-cell-group>

            <div class="media-section">
              <MediaUploader v-model="media" type="SURROUNDING" label="地址参考图" />
            </div>

            <div class="submit-wrap">
              <van-button round block type="primary" native-type="submit" :loading="submitting">
                {{ isEdit ? '保存修改' : '登记楼栋' }}
              </van-button>
            </div>
          </van-form>
        </template>
      </div>
    </div>

    <van-popup v-model:show="timePickerShow" position="bottom" round>
      <van-time-picker
        v-model="pickedTime"
        title="选择时间"
        :columns-type="['hour', 'minute']"
        @confirm="onTimeConfirm"
        @cancel="timePickerShow = false"
      />
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

.submit-wrap {
  padding: 16px;
}
</style>
