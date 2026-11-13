<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showImagePreview, showSuccessToast, showToast } from 'vant'
import { getProperty, getSlots, sendVerificationCode, submitAppointment } from '../../api'
import { ApiError } from '../../api/http'
import type { MediaItem, Property, Slot } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { toDateString } from '../../utils/format'
import { isValidPhone } from '../../utils/validate'

const route = useRoute()
const router = useRouter()

const propertyId = route.params.id as string

const loading = ref(true)
const offShelf = ref(false)
const errorText = ref('')
const property = ref<Property | null>(null)

const appointment = ref({ name: '', phone: '', code: '' })
const codeSending = ref(false)
const codeCountdown = ref(0)
let codeTimer: ReturnType<typeof setInterval> | undefined
const datePickerShow = ref(false)
const pickedDate = ref<string[]>([])
const selectedDate = ref('')
const slotsLoading = ref(false)
const slotsError = ref('')
const slotSupported = ref(true)
const slots = ref<Slot[]>([])
const selectedSlot = ref<Slot | null>(null)
const submitting = ref(false)

const minDate = new Date()
minDate.setHours(0, 0, 0, 0)
const maxDate = new Date(2036, 11, 31)

let refreshedOnce = false
let refreshing = false

function datePartsOf(value: Date): string[] {
  return [
    String(value.getFullYear()),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0')
  ]
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    property.value = await getProperty(propertyId)
    offShelf.value = false
  } catch (error) {
    if (error instanceof ApiError && error.code === 404) {
      offShelf.value = true
    } else {
      errorText.value = errorMessageOf(error)
    }
  } finally {
    loading.value = false
  }
}

function sortByOrder(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

const surrounding = computed(() =>
  sortByOrder(property.value?.media.filter((m) => m.type === 'SURROUNDING') ?? [])
)
const video = computed(() => property.value?.media.find((m) => m.type === 'VIDEO'))
const building = computed(() => property.value?.building ?? null)
const addressMedia = computed(() =>
  [...(building.value?.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
)

const supportsAppointment = computed(() => building.value !== null)

async function refreshMedia() {
  if (refreshedOnce || refreshing) {
    return
  }
  refreshing = true
  try {
    const fresh = await getProperty(propertyId)
    property.value = fresh
    refreshedOnce = true
  } catch {
    // 刷新失败保持现状，避免无限重试
  } finally {
    refreshing = false
  }
}

function previewImages(items: MediaItem[], startIndex: number) {
  showImagePreview({ images: items.map((item) => item.url), startPosition: startIndex })
}

function previewAddressImages(startIndex: number) {
  showImagePreview({ images: addressMedia.value.map((item) => item.url), startPosition: startIndex })
}

function pad2(value: string): string {
  return value.padStart(2, '0')
}

function openDatePicker() {
  pickedDate.value = selectedDate.value
    ? selectedDate.value.split('-')
    : datePartsOf(new Date())
  datePickerShow.value = true
}

async function onDateConfirm() {
  const [year, month, day] = pickedDate.value
  if (!year || !month || !day) {
    datePickerShow.value = false
    return
  }
  selectedDate.value = `${year}-${pad2(month)}-${pad2(day)}`
  datePickerShow.value = false
  await loadSlots()
}

async function loadSlots() {
  if (!selectedDate.value) {
    return
  }
  slotsLoading.value = true
  slotsError.value = ''
  selectedSlot.value = null
  try {
    const result = await getSlots(propertyId, selectedDate.value)
    slotSupported.value = result.supported
    slots.value = result.slots
  } catch (error) {
    slotSupported.value = true
    slots.value = []
    slotsError.value = errorMessageOf(error)
  } finally {
    slotsLoading.value = false
  }
}

function selectSlot(slot: Slot) {
  if (!slot.available) {
    return
  }
  selectedSlot.value = slot
}

async function onSendCode() {
  if (!isValidPhone(appointment.value.phone)) {
    showToast('请输入有效的手机号')
    return
  }
  codeSending.value = true
  try {
    await sendVerificationCode(appointment.value.phone)
    showToast('验证码已发送')
    codeCountdown.value = 60
    codeTimer = setInterval(() => {
      codeCountdown.value -= 1
      if (codeCountdown.value <= 0) {
        clearInterval(codeTimer)
        codeTimer = undefined
      }
    }, 1000)
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    codeSending.value = false
  }
}

watch(
  () => appointment.value.phone,
  () => {
    appointment.value.code = ''
  }
)

onUnmounted(() => {
  if (codeTimer !== undefined) {
    clearInterval(codeTimer)
  }
})

async function onSubmit() {
  if (!appointment.value.name.trim()) {
    showToast('请填写姓名')
    return
  }
  if (!isValidPhone(appointment.value.phone)) {
    showToast('请输入有效的手机号')
    return
  }
  if (!/^\d{6}$/.test(appointment.value.code)) {
    showToast('请输入 6 位验证码')
    return
  }
  if (!selectedDate.value) {
    showToast('请选择看房日期')
    return
  }
  if (!selectedSlot.value) {
    showToast('请选择看房时段')
    return
  }
  submitting.value = true
  try {
    const result = await submitAppointment(propertyId, {
      name: appointment.value.name.trim(),
      phone: appointment.value.phone,
      code: appointment.value.code,
      date: selectedDate.value,
      slotStart: selectedSlot.value.start,
      slotEnd: selectedSlot.value.end
    })
    showSuccessToast('预约成功')
    router.replace({
      path: `/booking-success/${result.id}`,
      query: {
        propertyId: String(property.value?.id ?? ''),
        date: selectedDate.value,
        slotStart: selectedSlot.value.start,
        slotEnd: selectedSlot.value.end
      }
    })
  } catch (error) {
    showToast(errorMessageOf(error))
    if (error instanceof ApiError && error.code === 404) {
      load()
      return
    }
    if (error instanceof ApiError && error.code === 409) {
      loadSlots()
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  selectedDate.value = toDateString(new Date())
  await load()
  if (!offShelf.value && building.value) {
    loadSlots()
  }
})
</script>

<template>
  <div>
    <van-nav-bar title="房源详情" left-arrow @click-left="router.back()" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading" class="state-block" color="#1989fa">加载中...</van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <van-empty v-else-if="offShelf" description="房源已下架" />

        <template v-else-if="property">
          <div class="detail-card">
            <div class="detail-title">{{ property.title }}</div>
            <div class="detail-location">{{ property.location }}</div>
            <div class="detail-tags">
              <van-tag plain type="primary">{{ property.layout }}</van-tag>
              <van-tag plain type="primary">{{ property.area }}㎡</van-tag>
              <van-tag plain color="#ee0a24">¥{{ property.rent }}/月</van-tag>
            </div>
            <div v-if="property.description" class="detail-description">
              {{ property.description }}
            </div>
            <div class="detail-contact">联系方式：{{ property.contact }}</div>
          </div>

          <template v-if="building">
            <div class="section-title">楼栋信息</div>
            <div class="detail-card building-card">
              <div class="building-name">{{ building.name }}</div>
              <div class="building-address">{{ building.address }}</div>
              <div class="building-attrs">
                <div v-if="building.totalFloors" class="building-attr">
                  总楼层：{{ building.totalFloors }} 层
                </div>
                <div v-if="building.elevatorRatio" class="building-attr">
                  梯户比：{{ building.elevatorRatio }}
                </div>
                <div class="building-attr">
                  电梯：{{ building.hasElevator ? '有' : '无' }}
                </div>
                <div v-if="building.deliveryFacilities" class="building-attr">
                  快递与生活配套：{{ building.deliveryFacilities }}
                </div>
                <div v-if="building.livingExperience" class="building-attr">
                  采光噪音体验：{{ building.livingExperience }}
                </div>
              </div>
              <template v-if="addressMedia.length > 0">
                <div class="media-grid">
                  <van-image
                    v-for="(item, index) in addressMedia"
                    :key="item.key"
                    :src="item.url"
                    width="100%"
                    height="96px"
                    fit="cover"
                    radius="6"
                    @error="refreshMedia"
                    @click="previewAddressImages(index)"
                  />
                </div>
              </template>
            </div>
          </template>

          <template v-if="surrounding.length > 0">
            <div class="section-title">周边图</div>
            <div class="media-grid">
              <van-image
                v-for="(item, index) in surrounding"
                :key="item.key"
                :src="item.url"
                width="100%"
                height="96px"
                fit="cover"
                radius="6"
                @error="refreshMedia"
                @click="previewImages(surrounding, index)"
              />
            </div>
          </template>

          <template v-if="video">
            <div class="section-title">内屋视频</div>
            <video
              :key="video.key"
              :src="video.url"
              class="detail-video"
              controls
              playsinline
              @error="refreshMedia"
            ></video>
          </template>

          <div class="appointment-card">
            <div class="section-title">预约看房</div>
            <template v-if="supportsAppointment">
              <van-form @submit="onSubmit">
                <van-cell-group inset>
                  <van-field
                    v-model="appointment.name"
                    name="name"
                    label="姓名"
                    placeholder="请输入姓名"
                    :rules="[{ required: true, message: '请填写姓名' }]"
                  />
                  <van-field
                    v-model="appointment.phone"
                    name="phone"
                    type="tel"
                    label="手机号"
                    placeholder="请输入 11 位手机号"
                    :rules="[{ required: true, message: '请填写手机号' }]"
                  >
                    <template #button>
                      <van-button
                        class="send-code-btn"
                        size="small"
                        type="primary"
                        plain
                        :loading="codeSending"
                        :disabled="codeCountdown > 0"
                        @click="onSendCode"
                      >
                        {{ codeCountdown > 0 ? `重新获取(${codeCountdown}s)` : '获取验证码' }}
                      </van-button>
                    </template>
                  </van-field>
                  <van-field
                    v-model="appointment.code"
                    name="code"
                    type="tel"
                    maxlength="6"
                    label="验证码"
                    placeholder="请输入 6 位验证码"
                    :rules="[{ required: true, message: '请填写验证码' }]"
                  />
                  <van-field
                    :model-value="selectedDate"
                    name="date"
                    readonly
                    is-link
                    label="看房日期"
                    placeholder="请选择看房日期"
                    @click="openDatePicker"
                  />
                </van-cell-group>

                <div class="slot-area">
                  <div class="slot-area-title">
                    选择看房时段
                    <span class="slot-date">{{ selectedDate }}</span>
                  </div>
                  <van-loading v-if="slotsLoading" class="slot-state" size="20px" color="#1989fa" />
                  <div v-else-if="slotsError" class="slot-state slot-error">
                    {{ slotsError }}
                    <van-button size="mini" type="primary" plain @click="loadSlots">重试</van-button>
                  </div>
                  <div v-else-if="!slotSupported" class="slot-state">
                    该房源暂不支持预约看房
                  </div>
                  <div v-else-if="slots.length === 0" class="slot-state">当日无可约时段</div>
                  <div v-else class="slot-grid">
                    <div
                      v-for="slot in slots"
                      :key="`${slot.start}-${slot.end}`"
                      class="slot-chip"
                      :class="{
                        'slot-chip-disabled': !slot.available,
                        'slot-chip-selected': selectedSlot === slot
                      }"
                      @click="selectSlot(slot)"
                    >
                      {{ slot.start }}~{{ slot.end }}
                    </div>
                  </div>
                </div>

                <div class="submit-wrap">
                  <van-button
                    round
                    block
                    type="primary"
                    native-type="submit"
                    :loading="submitting"
                  >
                    提交预约
                  </van-button>
                </div>
              </van-form>
            </template>
            <div v-else class="unsupported-tip">该房源暂不支持预约看房</div>
          </div>
        </template>
      </div>
    </div>

    <van-popup v-model:show="datePickerShow" position="bottom" round>
      <van-date-picker
        v-model="pickedDate"
        title="选择看房日期"
        :columns-type="['year', 'month', 'day']"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="datePickerShow = false"
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

.detail-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
}

.detail-location {
  margin-top: 6px;
  font-size: 13px;
  color: #646566;
}

.detail-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.detail-description {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #323233;
  white-space: pre-wrap;
}

.detail-contact {
  margin-top: 12px;
  font-size: 13px;
  color: #646566;
}

.building-card {
  padding: 12px 16px;
}

.building-name {
  font-size: 16px;
  font-weight: 600;
}

.building-address {
  margin-top: 4px;
  font-size: 13px;
  color: #646566;
}

.building-attrs {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.building-attr {
  font-size: 13px;
  color: #323233;
}

.building-card .media-grid {
  margin-top: 10px;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.detail-video {
  width: 100%;
  border-radius: 8px;
  background: #000;
}

.appointment-card {
  margin-top: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 12px 0 16px;
}

.slot-area {
  margin: 12px 16px 0;
}

.slot-area-title {
  font-size: 13px;
  color: #323233;
  margin-bottom: 8px;
}

.slot-date {
  margin-left: 4px;
  color: #969799;
}

.slot-state {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  font-size: 13px;
  color: #969799;
}

.slot-error {
  color: #ee0a24;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.slot-chip {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdee0;
  border-radius: 6px;
  font-size: 13px;
  color: #323233;
  background: #fff;
}

.slot-chip-disabled {
  color: #c8c9cc;
  border-color: #ebedf0;
  background: #f7f8fa;
}

.slot-chip-selected {
  color: #1989fa;
  border-color: #1989fa;
  background: #ecf5ff;
}

.unsupported-tip {
  padding: 20px 16px 8px;
  text-align: center;
  font-size: 14px;
  color: #969799;
}

.submit-wrap {
  padding: 16px 16px 0;
}
</style>
