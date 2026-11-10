<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { adminListProperties, updatePropertyStatus } from '../../api'
import type { Property, PropertyStatus } from '../../api/types'
import { errorMessageOf } from '../../utils/error'

const router = useRouter()

const loading = ref(false)
const loaded = ref(false)
const errorText = ref('')
const properties = ref<Property[]>([])

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    properties.value = await adminListProperties()
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

function goCreate() {
  router.push('/admin/properties/new')
}

function goEdit(property: Property) {
  router.push(`/admin/properties/${property.id}/edit`)
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
    property.status = target
    showSuccessToast(`${actionText}成功`)
  } catch (error) {
    showToast(errorMessageOf(error))
  }
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="房源管理" right-text="录入" @click-right="goCreate" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
          加载中...
        </van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <van-empty v-else-if="loaded && properties.length === 0" description="暂无房源">
          <van-button size="small" type="primary" @click="goCreate">录入房源</van-button>
        </van-empty>

        <div v-else class="property-list">
          <div v-for="property in properties" :key="property.id" class="admin-card">
            <div class="admin-card-header">
              <span class="admin-card-title">{{ property.title }}</span>
              <van-tag :type="property.status === 'AVAILABLE' ? 'success' : 'default'">
                {{ property.status === 'AVAILABLE' ? '在租' : '下架' }}
              </van-tag>
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
}
</style>
