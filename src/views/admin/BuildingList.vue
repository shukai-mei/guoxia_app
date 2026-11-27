<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import type { ListInstance } from 'vant'
import { adminDeleteBuilding, adminListBuildings } from '../../api'
import type { Building } from '../../api/types'
import { errorMessageOf } from '../../utils/error'

const router = useRouter()

const listRef = ref<ListInstance | null>(null)
const loading = ref(false)
const loaded = ref(false)
const finished = ref(false)
const listError = ref(false)
const errorText = ref('')
const buildings = ref<Building[]>([])
const page = ref(1)

let loadGeneration = 0

async function fetchPage() {
  const generation = loadGeneration
  try {
    const result = await adminListBuildings(page.value)
    if (generation !== loadGeneration) {
      return
    }
    buildings.value.push(...result.items)
    page.value += 1
    finished.value = !result.hasMore
    listError.value = false
    loaded.value = true
    errorText.value = ''
  } catch (error) {
    if (generation !== loadGeneration) {
      return
    }
    if (buildings.value.length === 0) {
      errorText.value = errorMessageOf(error)
    } else {
      listError.value = true
      showToast(errorMessageOf(error))
    }
  } finally {
    if (generation === loadGeneration) {
      loading.value = false
    }
  }
}

function onLoad() {
  fetchPage()
}

function resetPage() {
  loadGeneration += 1
  buildings.value = []
  page.value = 1
  finished.value = false
  listError.value = false
  errorText.value = ''
  loaded.value = false
  loading.value = false
}

function reload() {
  resetPage()
  nextTick(() => listRef.value?.check())
}

function goCreate() {
  router.push('/admin/buildings/new')
}

function goEdit(building: Building) {
  router.push(`/admin/buildings/${building.id}/edit`)
}

function slotSummaryOf(building: Building): string {
  return `每日 ${building.slotStartTime}~${building.slotEndTime}，每 ${building.slotDurationMinutes} 分钟`
}

async function onDelete(building: Building) {
  try {
    await showConfirmDialog({
      title: '删除楼栋',
      message: `确认删除「${building.name}」吗？`
    })
  } catch {
    return
  }
  try {
    await adminDeleteBuilding(building.id)
    showSuccessToast('删除成功')
    reload()
  } catch (error) {
    showToast(errorMessageOf(error))
  }
}
</script>

<template>
  <div>
    <van-nav-bar title="楼栋管理" right-text="登记" @click-right="goCreate" />

    <div class="page">
      <div class="page-content">
        <van-list
          ref="listRef"
          v-model:loading="loading"
          :finished="finished"
          :finished-text="buildings.length === 0 ? '' : '没有更多了'"
          :error="listError"
          error-text="加载失败，点击重试"
          @update:error="listError = $event"
          @load="onLoad"
        >
          <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
            加载中...
          </van-loading>

          <van-empty v-else-if="errorText" image="error" :description="errorText">
            <van-button size="small" type="primary" @click="reload">重试</van-button>
          </van-empty>

          <van-empty v-else-if="loaded && buildings.length === 0" description="暂无楼栋">
            <van-button size="small" type="primary" @click="goCreate">登记楼栋</van-button>
          </van-empty>

          <div v-else class="building-list">
            <div v-for="building in buildings" :key="building.id" class="admin-card">
              <div class="admin-card-header">
                <span class="admin-card-title">{{ building.name }}</span>
                <van-tag v-if="building.totalFloors" plain type="primary">
                  {{ building.totalFloors }} 层
                </van-tag>
              </div>
              <div class="admin-card-desc">{{ building.address }}</div>
              <div class="admin-card-desc">{{ slotSummaryOf(building) }}</div>
              <div class="admin-card-desc">管家：{{ building.housekeeper?.name ?? '未配置' }}</div>
              <div class="admin-card-actions">
                <van-button size="small" plain type="primary" @click="goEdit(building)">
                  编辑
                </van-button>
                <van-button size="small" plain type="danger" @click="onDelete(building)">
                  删除
                </van-button>
              </div>
            </div>
          </div>
        </van-list>
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

.building-list {
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
  justify-content: space-between;
  gap: 8px;
}

.admin-card-title {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-card-desc {
  margin-top: 6px;
  font-size: 12px;
  color: #646566;
}

.admin-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
</style>
