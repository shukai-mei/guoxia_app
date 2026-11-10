<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
const errorText = ref('')
const properties = ref<Property[]>([])

async function load() {
  loading.value = true
  errorText.value = ''
  try {
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
    properties.value = await listProperties(params)
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
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

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="果下租房" />

    <div class="filter-area">
      <van-search
        v-model="keyword"
        placeholder="搜索标题或位置"
        @search="load"
        @clear="load"
      />
      <div class="rent-filter">
        <van-field v-model="rentMin" type="digit" placeholder="最低租金（元）" class="rent-field" />
        <span class="rent-sep">-</span>
        <van-field v-model="rentMax" type="digit" placeholder="最高租金（元）" class="rent-field" />
        <van-button size="small" type="primary" class="filter-btn" @click="load">筛选</van-button>
        <van-button size="small" plain class="filter-btn" @click="clearFilter">清除</van-button>
      </div>
    </div>

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
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
              <div class="property-title">{{ property.title }}</div>
              <div class="property-desc">
                {{ property.location }} · {{ property.layout }} · {{ property.area }}㎡
              </div>
              <div class="property-rent">
                <span class="rent-value">¥{{ property.rent }}</span>
                <span class="rent-unit">/月</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-area {
  background: #fff;
  padding-bottom: 4px;
}

.rent-filter {
  display: flex;
  align-items: center;
  padding: 0 8px 12px;
  gap: 6px;
}

.rent-field {
  flex: 1;
  padding: 6px 10px;
  background: #f7f8fa;
  border-radius: 6px;
}

.rent-sep {
  color: #969799;
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
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.property-cover {
  width: 108px;
  height: 96px;
  object-fit: cover;
  flex-shrink: 0;
}

.property-body {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.property-title {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-desc {
  font-size: 12px;
  color: #646566;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-rent {
  color: #ee0a24;
}

.rent-value {
  font-size: 17px;
  font-weight: 600;
}

.rent-unit {
  font-size: 12px;
  margin-left: 2px;
}
</style>
