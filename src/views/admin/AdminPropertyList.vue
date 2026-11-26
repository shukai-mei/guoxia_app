<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showDialog, showSuccessToast, showToast } from 'vant'
import {
  adminListProperties,
  batchUpdatePropertyStatus,
  updatePropertyRentStatus,
  updatePropertyStatus
} from '../../api'
import type { Property, PropertyStatus, RentStatus } from '../../api/types'
import { ApiError } from '../../api/http'
import { errorMessageOf, isShelfDeviceBlockedError } from '../../utils/error'

const router = useRouter()

const loading = ref(false)
const loaded = ref(false)
const errorText = ref('')
const properties = ref<Property[]>([])

const keyword = ref('')
const statusFilter = ref('')
const rentStatusFilter = ref('')

const selectedIds = ref<number[]>([])

const STATUS_OPTIONS = [
  { text: '全部', value: '' },
  { text: '上架', value: 'AVAILABLE' },
  { text: '下架', value: 'OFF_SHELF' }
]

const RENT_STATUS_OPTIONS = [
  { text: '全部', value: '' },
  { text: '待租出', value: 'PENDING_RENT' },
  { text: '已租出', value: 'RENTED' }
]

const hasFilter = computed(
  () => keyword.value.trim() !== '' || statusFilter.value !== '' || rentStatusFilter.value !== ''
)

const allSelected = computed(
  () => properties.value.length > 0 && properties.value.every((p) => selectedIds.value.includes(p.id))
)

function buildParams(): {
  keyword?: string
  status?: PropertyStatus
  rentStatus?: RentStatus
} {
  const params: { keyword?: string; status?: PropertyStatus; rentStatus?: RentStatus } = {}
  if (keyword.value.trim()) {
    params.keyword = keyword.value.trim()
  }
  if (statusFilter.value) {
    params.status = statusFilter.value as PropertyStatus
  }
  if (rentStatusFilter.value) {
    params.rentStatus = rentStatusFilter.value as RentStatus
  }
  return params
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    properties.value = await adminListProperties(buildParams())
    selectedIds.value = []
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

watch([keyword, statusFilter, rentStatusFilter], load)

function goCreate() {
  router.push('/admin/properties/new')
}

function goEdit(property: Property) {
  router.push(`/admin/properties/${property.id}/edit`)
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = properties.value.map((p) => p.id)
  }
}

function toggleSelect(id: number) {
  const index = selectedIds.value.indexOf(id)
  if (index >= 0) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

async function onBatchPublish() {
  if (selectedIds.value.length === 0) {
    return
  }
  try {
    await showConfirmDialog({
      title: '批量上架',
      message: `确认上架所选 ${selectedIds.value.length} 个房源吗？`
    })
  } catch {
    return
  }
  try {
    await batchUpdatePropertyStatus(selectedIds.value, 'AVAILABLE')
    showSuccessToast('上架成功')
    await load()
  } catch (error) {
    if (error instanceof ApiError && isShelfDeviceBlockedError(error.code)) {
      showDialog({ message: error.message })
    } else {
      showToast(errorMessageOf(error))
    }
  }
}

async function toggleStatus(property: Property) {
  const target: PropertyStatus = property.status === 'AVAILABLE' ? 'OFF_SHELF' : 'AVAILABLE'
  const actionText = target === 'OFF_SHELF' ? '下架' : '上架'
  try {
    await showConfirmDialog({
      title: `${actionText}房源`,
      message: `确认${actionText}「${property.title}」吗？`
    })
  } catch {
    return
  }
  try {
    await updatePropertyStatus(property.id, target)
    showSuccessToast(`${actionText}成功`)
    await load()
  } catch (error) {
    if (error instanceof ApiError && isShelfDeviceBlockedError(error.code)) {
      showDialog({ message: error.message })
    } else {
      showToast(errorMessageOf(error))
    }
  }
}

async function toggleRentStatus(property: Property) {
  const target: RentStatus = property.rentStatus === 'RENTED' ? 'PENDING_RENT' : 'RENTED'
  const markRented = target === 'RENTED'
  try {
    await showConfirmDialog({
      title: markRented ? '标记已租出' : '改回待租出',
      message: markRented
        ? `确认标记「${property.title}」为已租出吗？该房源未结束的预约将失效并短信通知租客。`
        : `确认将「${property.title}」改回待租出吗？改回后租客可重新预约看房。`
    })
  } catch {
    return
  }
  try {
    await updatePropertyRentStatus(property.id, target)
    showSuccessToast(markRented ? '已标记已租出' : '已改回待租出')
    await load()
  } catch (error) {
    showToast(errorMessageOf(error))
  }
}

function clearFilter() {
  keyword.value = ''
  statusFilter.value = ''
  rentStatusFilter.value = ''
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="房源管理" right-text="录入" @click-right="goCreate" />

    <div class="filter-area">
      <van-search v-model="keyword" placeholder="搜索房源名称或位置" />
      <van-dropdown-menu>
        <van-dropdown-item v-model="statusFilter" :options="STATUS_OPTIONS" />
        <van-dropdown-item v-model="rentStatusFilter" :options="RENT_STATUS_OPTIONS" />
      </van-dropdown-menu>
    </div>

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
          加载中...
        </van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <van-empty
          v-else-if="loaded && properties.length === 0"
          :description="hasFilter ? '没有符合条件的房源' : '暂无房源'"
        >
          <van-button v-if="hasFilter" size="small" type="primary" @click="clearFilter">
            清除筛选
          </van-button>
          <van-button v-else size="small" type="primary" @click="goCreate">录入房源</van-button>
        </van-empty>

        <template v-else>
          <div v-if="loaded && properties.length > 0" class="batch-bar">
            <van-checkbox
              :model-value="allSelected"
              icon-size="16px"
              @update:model-value="toggleAll"
            >
              全选
            </van-checkbox>
            <van-button
              size="small"
              type="primary"
              :disabled="selectedIds.length === 0"
              @click="onBatchPublish"
            >
              批量上架({{ selectedIds.length }})
            </van-button>
          </div>

          <div class="property-list">
            <div v-for="property in properties" :key="property.id" class="admin-card">
              <div class="admin-card-header">
                <van-checkbox
                  :model-value="selectedIds.includes(property.id)"
                  icon-size="16px"
                  @update:model-value="toggleSelect(property.id)"
                />
                <span class="admin-card-title">{{ property.title }}</span>
                <div class="admin-card-tags">
                  <van-tag :type="property.status === 'AVAILABLE' ? 'success' : 'default'">
                    {{ property.status === 'AVAILABLE' ? '上架' : '下架' }}
                  </van-tag>
                  <van-tag :type="property.rentStatus === 'RENTED' ? 'warning' : 'primary'">
                    {{ property.rentStatus === 'RENTED' ? '已租出' : '待租出' }}
                  </van-tag>
                </div>
              </div>
              <div class="admin-card-desc">
                {{ property.location }} · {{ property.layout }} · {{ property.area }}㎡
              </div>
              <div class="admin-card-rent">¥{{ property.rent }}/月</div>
              <div class="admin-card-actions">
                <van-button size="small" plain type="primary" @click="goEdit(property)">
                  编辑
                </van-button>
                <van-button
                  v-if="property.status === 'AVAILABLE'"
                  size="small"
                  plain
                  type="warning"
                  @click="toggleStatus(property)"
                >
                  下架
                </van-button>
                <van-button v-else size="small" plain type="success" @click="toggleStatus(property)">
                  上架
                </van-button>
                <van-button
                  v-if="property.rentStatus === 'PENDING_RENT'"
                  size="small"
                  plain
                  type="warning"
                  @click="toggleRentStatus(property)"
                >
                  标记已租出
                </van-button>
                <van-button
                  v-else
                  size="small"
                  plain
                  type="success"
                  @click="toggleRentStatus(property)"
                >
                  改回待租出
                </van-button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-area {
  padding: 0 12px;
}

.filter-area :deep(.van-search) {
  background: transparent;
  padding: 0;
}

.filter-area :deep(.van-search__content) {
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
}

.state-block {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.admin-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-card-title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-card-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.admin-card-desc {
  margin-top: 6px;
  font-size: 12px;
  color: #646566;
}

.admin-card-rent {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #ee0a24;
}

.admin-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
</style>
