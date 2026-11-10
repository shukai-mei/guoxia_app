<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showImagePreview, showSuccessToast, showToast } from 'vant'
import { getProperty, submitAppointment } from '../../api'
import { ApiError } from '../../api/http'
import type { MediaItem, Property } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { isValidPhone } from '../../utils/validate'

const route = useRoute()
const router = useRouter()

const propertyId = route.params.id as string

const loading = ref(true)
const offShelf = ref(false)
const errorText = ref('')
const property = ref<Property | null>(null)

const appointment = ref({ name: '', phone: '', preferredTime: '' })
const timePickerShow = ref(false)
const datePickerShow = ref(false)
const pickedDate = ref<string[]>(['2026', '11', '15'])
const pickedTime = ref<string[]>(['10', '00'])
const submitting = ref(false)

const minDate = new Date(2026, 0, 1)
const maxDate = new Date(2036, 11, 31)

let refreshedOnce = false
let refreshing = false

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
const guide = computed(() => sortByOrder(property.value?.media.filter((m) => m.type === 'GUIDE') ?? []))
const video = computed(() => property.value?.media.find((m) => m.type === 'VIDEO'))

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

function pad2(value: string): string {
  return value.padStart(2, '0')
}

function onDateConfirm() {
  datePickerShow.value = false
  timePickerShow.value = true
}

function onTimeConfirm() {
  const [year, month, day] = pickedDate.value
  const [hour, minute] = pickedTime.value
  if (year && month && day && hour !== undefined && minute !== undefined) {
    appointment.value.preferredTime = `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(
      minute
    )}:00`
  }
  timePickerShow.value = false
}

async function onSubmit() {
  if (!appointment.value.name.trim()) {
    showToast('请填写姓名')
    return
  }
  if (!isValidPhone(appointment.value.phone)) {
    showToast('请输入有效的手机号')
    return
  }
  if (!appointment.value.preferredTime) {
    showToast('请选择期望看房时间')
    return
  }
  submitting.value = true
  try {
    await submitAppointment(propertyId, {
      name: appointment.value.name.trim(),
      phone: appointment.value.phone,
      preferredTime: appointment.value.preferredTime
    })
    showSuccessToast('提交成功')
    appointment.value = { name: '', phone: '', preferredTime: '' }
  } catch (error) {
    showToast(errorMessageOf(error))
    if (error instanceof ApiError && (error.code === 404 || error.code === 409)) {
      load()
    }
  } finally {
    submitting.value = false
  }
}

onMounted(load)
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

          <template v-if="guide.length > 0">
            <div class="section-title">找房指引图</div>
            <div class="media-grid">
              <van-image
                v-for="(item, index) in guide"
                :key="item.key"
                :src="item.url"
                width="100%"
                height="96px"
                fit="cover"
                radius="6"
                @error="refreshMedia"
                @click="previewImages(guide, index)"
              />
            </div>
          </template>

          <div class="appointment-card">
            <div class="section-title">预约看房</div>
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
                />
                <van-field
                  v-model="appointment.preferredTime"
                  name="preferredTime"
                  readonly
                  is-link
                  label="期望时间"
                  placeholder="请选择期望看房时间"
                  :rules="[{ required: true, message: '请选择期望看房时间' }]"
                  @click="datePickerShow = true"
                />
              </van-cell-group>
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
          </div>
        </template>
      </div>
    </div>

    <van-popup v-model:show="datePickerShow" position="bottom" round>
      <van-date-picker
        v-model="pickedDate"
        title="选择期望看房日期"
        :columns-type="['year', 'month', 'day']"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="datePickerShow = false"
      />
    </van-popup>

    <van-popup v-model:show="timePickerShow" position="bottom" round>
      <van-time-picker
        v-model="pickedTime"
        title="选择期望看房时间"
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

.submit-wrap {
  padding: 16px 16px 0;
}
</style>
