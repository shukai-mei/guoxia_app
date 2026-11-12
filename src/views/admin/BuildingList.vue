<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { adminDeleteBuilding, adminListBuildings } from '../../api'
import type { Building } from '../../api/types'
import { errorMessageOf } from '../../utils/error'

const router = useRouter()

const loading = ref(false)
const loaded = ref(false)
const errorText = ref('')
const buildings = ref<Building[]>([])

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    buildings.value = await adminListBuildings()
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
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
    load()
  } catch (error) {
    showToast(errorMessageOf(error))
  }
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="楼栋管理" right-text="登记" @click-right="goCreate" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
          加载中...
        </van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="load">重试</van-button>
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
