<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { listProperties } from '../../api'
import type { Property } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { isPositiveNumber } from '../../utils/validate'

const router = useRouter()

const keyword = ref('')
const rentMin = ref('')
const rentMax = ref('')

const loading = ref(false)
const loaded = ref(false)
const refreshing = ref(false)
const errorText = ref('')
const properties = ref<Property[]>([])

function buildParams(): { keyword?: string; rentMin?: number; rentMax?: number } {
  const params: { keyword?: string; rentMin?: number; rentMax?: number } = {}
  if (keyword.value.trim()) {
    params.keyword = keyword.value.trim()
  }
  if (isPositiveNumber(rentMin.value)) {
    params.rentMin = Number(rentMin.value)
  }
  if (isPositiveNumber(rentMax.value)) {
    params.rentMax = Number(rentMax.value)
  }
  return params
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    properties.value = await listProperties(buildParams())
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  try {
    properties.value = await listProperties(buildParams())
    errorText.value = ''
  } catch (error) {
    if (properties.value.length === 0) {
      errorText.value = errorMessageOf(error)
    } else {
      showToast(errorMessageOf(error))
    }
  } finally {
    refreshing.value = false
  }
}

function clearFilter() {
  keyword.value = ''
  rentMin.value = ''
  rentMax.value = ''
  load()
}

function coverOf(property: Property): string | undefined {
  return property.media
    .filter((m) => m.type === 'SURROUNDING')
    .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url
}

function openDetail(property: Property) {
  router.push(`/properties/${property.id}`)
}

function goMyAppointments() {
  router.push('/my-appointments')
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="轻亭看房" />

    <div class="my-entry" @click="goMyAppointments">
      <div class="my-entry-card">
        <div class="my-entry-title">我的预约</div>
        <div class="my-entry-sub">看房时段 · 开门密码 · 门禁开门</div>
      </div>
    </div>

    <div class="filter-area">
      <van-search
        v-model="keyword"
        placeholder="搜索标题或位置"
        @search="load"
        @clear="load"
      />
      <div class="rent-filter">
        <van-field v-model="rentMin" type="digit" placeholder="¥ 最低" class="rent-field" />
        <van-field v-model="rentMax" type="digit" placeholder="¥ 最高" class="rent-field" />
        <van-button size="small" type="primary" class="filter-btn" @click="load">筛选</van-button>
        <van-button size="small" plain class="filter-btn" @click="clearFilter">清除</van-button>
      </div>
    </div>

    <div class="page">
      <div class="page-content">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-loading v-if="loading && !loaded" class="state-block">
            加载中...
          </van-loading>

          <van-empty v-else-if="errorText" image="error" :description="errorText">
            <van-button size="small" type="primary" @click="load">重试</van-button>
          </van-empty>

          <van-empty v-else-if="loaded && properties.length === 0" description="暂无在租房源" />

          <div v-else class="property-list">
            <div
              v-for="property in properties"
              :key="property.id"
              class="property-card"
              @click="openDetail(property)"
            >
              <img
                v-if="coverOf(property)"
                :src="coverOf(property)"
                class="property-cover"
                alt="房源图片"
              />
              <div class="property-body">
                <div>
                  <div class="property-title">{{ property.title }}</div>
                  <div class="property-location">{{ property.location }}</div>
                  <div class="property-meta">{{ property.layout }} · {{ property.area }}㎡</div>
                </div>
                <div class="property-rent">
                  <span class="rent-value">¥{{ property.rent }}</span>
                  <span class="rent-unit">/月</span>
                </div>
              </div>
            </div>
          </div>
        </van-pull-refresh>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-entry {
  padding: 12px 12px 0;
}

.my-entry-card {
  padding: 13px 14px;
  border-radius: 14px;
  background: var(--brand);
  color: #fff;
  cursor: pointer;
}

.my-entry-title {
  font-size: 15px;
  font-weight: 600;
}

.my-entry-sub {
  margin-top: 3px;
  font-size: 11px;
  opacity: 0.85;
}

.filter-area {
  padding: 0 12px 12px;
}

.filter-area :deep(.van-search) {
  background: transparent;
  padding: 0 0 8px;
}

.filter-area :deep(.van-search__content) {
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
}

.rent-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rent-field {
  flex: 1;
  padding: 7px 10px;
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
}

.filter-btn {
  flex-shrink: 0;
}

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

.property-card {
  display: flex;
  gap: 10px;
  padding: 14px;
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
}

.property-cover {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.property-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.property-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-location {
  margin-top: 3px;
  font-size: 11px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--hint);
}

.property-rent {
  margin-top: 6px;
  color: var(--brand);
}

.rent-value {
  font-size: 15px;
  font-weight: 600;
}

.rent-unit {
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
  margin-left: 2px;
}
</style>
