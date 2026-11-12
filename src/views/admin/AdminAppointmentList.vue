<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import {
  adminListAppointments,
  confirmAppointment,
  rejectAppointment,
  resendAppointmentSms
} from '../../api'
import { ApiError } from '../../api/http'
import type { Appointment } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { formatDateTime, formatTime } from '../../utils/format'

const STATUS_TEXT: Record<string, string> = {
  PENDING: '待处理',
  CONFIRMED: '已确认',
  REJECTED: '已拒绝'
}

const STATUS_TYPE: Record<string, 'warning' | 'success' | 'default'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'default'
}

const CHANNEL_TEXT: Record<string, string> = {
  MANUAL: '人工通过',
  AUTO: '自动通过'
}

const loading = ref(false)
const loaded = ref(false)
const errorText = ref('')
const appointments = ref<Appointment[]>([])

const rejecting = ref<Appointment | null>(null)
const rejectReason = ref('')
const rejectSubmitting = ref(false)
const resendingId = ref<number | null>(null)

const rejectPopupShow = computed({
  get: () => rejecting.value !== null,
  set: (value: boolean) => {
    if (!value) {
      rejecting.value = null
    }
  }
})

function smsText(status: string | null): string {
  if (status === 'SENT') {
    return '已发送'
  }
  if (status === 'FAILED') {
    return '发送失败'
  }
  return '未发送'
}

function smsType(status: string | null): 'success' | 'danger' | 'default' {
  if (status === 'SENT') {
    return 'success'
  }
  if (status === 'FAILED') {
    return 'danger'
  }
  return 'default'
}

function slotText(item: Appointment): string {
  return `${formatDateTime(item.slotStart)} ~ ${formatTime(item.slotEnd)}`
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    appointments.value = await adminListAppointments()
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

async function onConfirm(item: Appointment) {
  try {
    await confirmAppointment(item.id)
    showSuccessToast('已确认')
    load()
  } catch (error) {
    showToast(errorMessageOf(error))
    if (error instanceof ApiError && error.code === 409) {
      load()
    }
  }
}

function openReject(item: Appointment) {
  rejecting.value = item
  rejectReason.value = ''
}

async function onRejectSubmit() {
  if (!rejectReason.value.trim()) {
    showToast('必须填写拒绝原因')
    return
  }
  const item = rejecting.value
  if (!item) {
    return
  }
  rejectSubmitting.value = true
  try {
    await rejectAppointment(item.id, rejectReason.value.trim())
    showSuccessToast('已拒绝')
    rejecting.value = null
    load()
  } catch (error) {
    showToast(errorMessageOf(error))
    if (error instanceof ApiError && error.code === 409) {
      rejecting.value = null
      load()
    }
  } finally {
    rejectSubmitting.value = false
  }
}

async function onResend(item: Appointment) {
  resendingId.value = item.id
  try {
    await resendAppointmentSms(item.id)
    showSuccessToast('已重发')
    load()
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    resendingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="预约管理" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
          加载中...
        </van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <van-empty v-else-if="loaded && appointments.length === 0" description="暂无预约申请" />

        <div v-else class="appointment-list">
          <div v-for="item in appointments" :key="item.id" class="appointment-card">
            <div class="appointment-header">
              <span class="appointment-name">{{ item.tenantName }}</span>
              <div class="appointment-tags">
                <van-tag v-if="item.status === 'CONFIRMED' && item.confirmChannel" plain type="primary">
                  {{ CHANNEL_TEXT[item.confirmChannel] ?? item.confirmChannel }}
                </van-tag>
                <van-tag :type="STATUS_TYPE[item.status] ?? 'default'">
                  {{ STATUS_TEXT[item.status] ?? item.status }}
                </van-tag>
              </div>
            </div>
            <div class="appointment-line">手机号：{{ item.phone }}</div>
            <div class="appointment-line">预约时段：{{ slotText(item) }}</div>
            <div class="appointment-line">关联房源：{{ item.propertyTitle }}</div>
            <div class="appointment-line appointment-sms">
              预约短信：
              <van-tag :type="smsType(item.bookingSmsStatus)" plain>
                {{ smsText(item.bookingSmsStatus) }}
              </van-tag>
              密码短信：
              <van-tag :type="smsType(item.passwordSmsStatus)" plain>
                {{ smsText(item.passwordSmsStatus) }}
              </van-tag>
              <van-button
                v-if="item.bookingSmsStatus === 'FAILED' || item.passwordSmsStatus === 'FAILED'"
                size="mini"
                plain
                type="primary"
                :loading="resendingId === item.id"
                @click="onResend(item)"
              >
                重发
              </van-button>
            </div>
            <div
              v-if="item.status === 'PENDING' && !item.passwordSet"
              class="appointment-line appointment-password-warn"
            >
              当日密码未设置，确认前请先在「每日密码」中设置
            </div>
            <div v-if="item.rejectReason" class="appointment-reject">
              拒绝原因：{{ item.rejectReason }}
            </div>
            <div v-if="item.status === 'PENDING'" class="appointment-actions">
              <van-button size="small" type="primary" @click="onConfirm(item)">确认</van-button>
              <van-button size="small" type="danger" plain @click="openReject(item)">
                拒绝
              </van-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <van-popup v-model:show="rejectPopupShow" position="bottom" round>
      <div class="reject-panel">
        <div class="reject-title">拒绝预约</div>
        <van-field
          v-model="rejectReason"
          type="textarea"
          rows="2"
          autosize
          maxlength="500"
          show-word-limit
          placeholder="请填写拒绝原因"
        />
        <div class="reject-actions">
          <van-button size="small" plain @click="rejecting = null">取消</van-button>
          <van-button
            size="small"
            type="danger"
            :loading="rejectSubmitting"
            @click="onRejectSubmit"
          >
            提交拒绝
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.state-block {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.appointment-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.appointment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.appointment-name {
  font-size: 16px;
  font-weight: 600;
}

.appointment-tags {
  display: flex;
  align-items: center;
  gap: 4px;
}

.appointment-line {
  margin-top: 6px;
  font-size: 13px;
  color: #646566;
}

.appointment-sms {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.appointment-password-warn {
  color: #ed6a0c;
}

.appointment-reject {
  margin-top: 6px;
  font-size: 13px;
  color: #ee0a24;
}

.appointment-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.reject-panel {
  padding: 16px;
}

.reject-title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 12px;
}

.reject-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
