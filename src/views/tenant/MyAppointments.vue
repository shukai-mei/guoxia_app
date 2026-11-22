<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import type { ListInstance } from 'vant'
import { getMyAppointments, getViewingRules, openDoor } from '../../api'
import type { AppointmentStatus, MyAppointment } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { formatDateTime, toLocalTime } from '../../utils/format'
import { copyText } from '../../utils/clipboard'

const router = useRouter()

const listRef = ref<ListInstance | null>(null)
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const listError = ref(false)
const appointments = ref<MyAppointment[]>([])
const page = ref(1)
const viewingRules = ref<string[]>([])
const openingId = ref<number | null>(null)
const expandedId = ref<number | null>(null)

let pendingLoad: Promise<void> | null = null

const STATUS_TEXT: Record<AppointmentStatus, string> = {
  PENDING: '待处理',
  CONFIRMED: '已确认',
  REJECTED: '已拒绝'
}

function tagTextOf(status: AppointmentStatus): string {
  return STATUS_TEXT[status] ?? status
}

function slotText(item: MyAppointment): string {
  const start = formatDateTime(item.slotStart)
  const end = formatDateTime(item.slotEnd)
  if (!start || !end) {
    return ''
  }
  return `${start}~${end.slice(11)}`
}

async function fetchPage() {
  try {
    const result = await getMyAppointments(page.value)
    appointments.value.push(...result.items)
    page.value += 1
    finished.value = !result.hasMore
    listError.value = false
  } catch (error) {
    listError.value = true
  } finally {
    loading.value = false
  }
}

function onLoad() {
  pendingLoad = fetchPage()
}

function resetPage() {
  appointments.value = []
  page.value = 1
  finished.value = false
  listError.value = false
  loading.value = false
}

async function onRefresh() {
  refreshing.value = true
  resetPage()
  await nextTick()
  listRef.value?.check()
  await nextTick()
  if (pendingLoad) {
    await pendingLoad
  }
  refreshing.value = false
}

async function loadRules() {
  try {
    viewingRules.value = (await getViewingRules()).items ?? []
  } catch {
    viewingRules.value = []
  }
}

function isBeforeWindow(item: MyAppointment): boolean {
  const start = toLocalTime(item.slotStart)
  return start !== null && Date.now() < start
}

function isAfterWindow(item: MyAppointment): boolean {
  const end = toLocalTime(item.slotEnd)
  return end !== null && Date.now() > end
}

function inProgressOf(item: MyAppointment): boolean {
  return item.status === 'CONFIRMED' && !isBeforeWindow(item) && !isAfterWindow(item)
}

function passcodePendingOf(item: MyAppointment): boolean {
  return item.status === 'CONFIRMED' && item.lockSupported && isBeforeWindow(item)
}

function doorPendingOf(item: MyAppointment): boolean {
  return item.status === 'CONFIRMED' && item.doorSupported && isBeforeWindow(item)
}

function passcodeUnconfirmedOf(item: MyAppointment): boolean {
  return item.status === 'PENDING' && item.lockSupported && !isAfterWindow(item)
}

function doorUnconfirmedOf(item: MyAppointment): boolean {
  return item.status === 'PENDING' && item.doorSupported && !isAfterWindow(item)
}

async function onOpenDoor(item: MyAppointment) {
  if (openingId.value !== null) {
    return
  }
  openingId.value = item.id
  try {
    await openDoor(item.id)
    showSuccessToast('门禁已开启')
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    openingId.value = null
  }
}

function onOpenDoorPending() {
  showToast('预约时间段内才能操作门禁')
}

function onOpenDoorUnconfirmed() {
  showToast('预约确认后可用')
}

function toggleDetail(item: MyAppointment) {
  expandedId.value = expandedId.value === item.id ? null : item.id
}

function goPropertyDetail(item: MyAppointment) {
  router.push({
    name: 'tenant-property-detail',
    params: { id: item.propertyId },
    query: { from: 'appointment' }
  })
}

function selectFallback(text: string) {
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  window.setTimeout(() => el.remove(), 3000)
}

async function onCopyPasscode(item: MyAppointment) {
  if (!item.passcode) {
    return
  }
  const ok = await copyText(item.passcode)
  if (ok) {
    showSuccessToast('房门密码已复制')
  } else {
    selectFallback(item.passcode)
    showToast('复制失败，请手动复制房门密码')
  }
}

onMounted(loadRules)
</script>

<template>
  <div>
    <van-nav-bar title="我的预约" left-arrow @click-left="router.back()" />

    <div class="page">
      <div class="page-content">
        <div
          v-if="viewingRules.length > 0"
          class="rules"
        >
          <div class="rt">
            <span class="ic">!</span>
            看房规则须知
          </div>
          <ul>
            <li v-for="(rule, index) in viewingRules" :key="index">
              {{ rule }}
            </li>
          </ul>
        </div>

        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list
            ref="listRef"
            v-model:loading="loading"
            :finished="finished"
            :finished-text="appointments.length === 0 ? '' : '没有更多了'"
            :error="listError"
            error-text="加载失败，点击重试"
            @update:error="listError = $event"
            @load="onLoad"
          >
            <van-empty
              v-if="appointments.length === 0"
              description="暂无预约记录"
            />

            <div v-else class="appointment-list">
            <div
              v-for="item in appointments"
              :key="item.id"
              class="appointment-card"
              :class="{ 'appointment-card--ended': isAfterWindow(item) }"
              @click="toggleDetail(item)"
            >
              <div class="card-head">
                <div class="card-title">
                  {{ item.propertyTitle }}
                  <span v-if="isAfterWindow(item)" class="spec-tag status-tag ended-tag">已过期</span>
                  <span v-else-if="inProgressOf(item)" class="spec-tag spec-tag--hl">进行中</span>
                  <span v-else-if="item.status !== 'CONFIRMED'" class="spec-tag status-tag">
                    {{ tagTextOf(item.status) }}
                  </span>
                </div>
                <van-icon
                  class="card-arrow"
                  :name="expandedId === item.id ? 'arrow-up' : 'arrow-down'"
                  size="14"
                  :color="isAfterWindow(item) ? '#B4B2A9' : '#888780'"
                />
              </div>
              <div class="card-time">看房时间：{{ slotText(item) }}</div>
              <div v-if="item.status === 'REJECTED' && item.rejectReason" class="card-reject">
                拒绝原因：{{ item.rejectReason }}
              </div>
              <div v-if="passcodePendingOf(item)" class="passcode-pending">
                <div class="passcode-pending-title">房门密码：暂未下发</div>
                <div class="passcode-pending-sub">密码将在预约时间段前5分钟下发</div>
              </div>
              <div v-else-if="passcodeUnconfirmedOf(item)" class="passcode-pending">
                <div class="passcode-pending-title">房门密码：暂未下发</div>
                <div class="passcode-pending-sub">预约确认后，密码将在预约时间段前5分钟下发</div>
              </div>
              <div v-if="item.passcode && !isAfterWindow(item)" class="passcode-row">
                <span class="passcode-label">房门密码</span>
                <span class="passcode-value">{{ item.passcode }}</span>
                <van-button size="mini" plain type="primary" @click.stop="onCopyPasscode(item)">
                  复制
                </van-button>
              </div>
              <div class="card-actions">
                <van-button
                  v-if="item.canOpenDoor && !isAfterWindow(item)"
                  class="action-btn action-btn--primary"
                  :loading="openingId === item.id"
                  :disabled="openingId !== null"
                  @click.stop="onOpenDoor(item)"
                >
                  门禁开门
                </van-button>
                <van-button
                  v-else-if="doorPendingOf(item)"
                  class="action-btn action-btn--pending"
                  @click.stop="onOpenDoorPending"
                >
                  门禁开门
                </van-button>
                <van-button
                  v-else-if="doorUnconfirmedOf(item)"
                  class="action-btn action-btn--pending"
                  @click.stop="onOpenDoorUnconfirmed"
                >
                  门禁开门
                </van-button>
                <van-button class="action-btn action-btn--plain" @click.stop="goPropertyDetail(item)">
                  房源详情
                </van-button>
              </div>
              <div v-if="expandedId === item.id" class="card-detail">
                <div class="detail-grid">
                  <div class="detail-cell">
                    <span class="detail-label">楼栋</span>
                    <span class="detail-value">{{ item.buildingName ?? '—' }}</span>
                  </div>
                  <div class="detail-cell">
                    <span class="detail-label">户型</span>
                    <span class="detail-value">{{ item.propertyLayout ?? '—' }}</span>
                  </div>
                  <div class="detail-cell">
                    <span class="detail-label">地址</span>
                    <span class="detail-value">{{ item.buildingAddress ?? '—' }}</span>
                  </div>
                  <div class="detail-cell">
                    <span class="detail-label">位置</span>
                    <span class="detail-value">{{ item.propertyLocation ?? '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </van-list>
        </van-pull-refresh>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rules {
  background: linear-gradient(135deg, #fff7ee, #fef0e3);
  border: 0.5px solid #f6dfc4;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 12px;
  position: relative;
  overflow: hidden;
}

.rules::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--brand);
}

.rules .rt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-strong);
  margin-bottom: 8px;
}

.rules .rt .ic {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--brand);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.rules ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rules li {
  font-size: 12px;
  color: var(--sub);
  padding-left: 16px;
  position: relative;
  margin-bottom: 6px;
  line-height: 1.5;
}

.rules li:last-child {
  margin-bottom: 0;
}

.rules li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
}

.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 24px;
}

.appointment-card {
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
  padding: 14px;
}

.appointment-card--ended {
  opacity: 0.65;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.spec-tag {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 400;
  border: 0.5px solid var(--line2);
  border-radius: 7px;
  padding: 2px 9px;
  color: var(--sub);
  line-height: 1.5;
}

.spec-tag--hl {
  color: var(--brand);
  background: var(--brand-light);
  border-color: transparent;
}

.status-tag {
  color: var(--sub);
}

.ended-tag {
  color: var(--muted);
}

.card-arrow {
  flex-shrink: 0;
}

.card-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 0.5px dashed var(--line);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.detail-label {
  color: var(--hint);
}

.detail-value {
  color: var(--ink);
  word-break: break-all;
}

.card-time {
  margin-top: 10px;
  font-size: 12px;
  color: var(--sub);
}

.card-reject {
  margin-top: 6px;
  font-size: 12px;
  color: var(--sub);
}

.passcode-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 9px;
  background: #f2f3f5;
}

.passcode-pending {
  margin-top: 10px;
  padding: 9px 11px;
  border-radius: 9px;
  background: var(--brand-light);
  font-size: 11px;
}

.passcode-pending-title {
  font-weight: 600;
  color: var(--brand-strong);
}

.passcode-pending-sub {
  margin-top: 2px;
  color: #d9864a;
}

.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  border-radius: 12px;
  font-size: 14px;
  border: none;
}

.action-btn--primary {
  background: var(--brand);
  color: #fff;
}

.action-btn--plain {
  background: #fff;
  border: 0.5px solid var(--brand);
  color: var(--brand);
}

.action-btn--pending {
  background: #f2f3f5;
  color: var(--muted);
}

.passcode-label {
  font-size: 12px;
  color: var(--muted);
  flex-shrink: 0;
}

.passcode-value {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--brand);
}
</style>
