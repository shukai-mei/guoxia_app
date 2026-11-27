<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import type { ListInstance } from 'vant'
import { listProperties } from '../../api'
import type { Property, RentStatus } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { isPositiveNumber } from '../../utils/validate'

const router = useRouter()

const keyword = ref('')
const rentMin = ref('')
const rentMax = ref('')
const rentStatus = ref('')

const RENT_STATUS_OPTIONS = [
  { text: '全部', value: '' },
  { text: '待租', value: 'PENDING_RENT' },
  { text: '已租出', value: 'RENTED' }
]

const listRef = ref<ListInstance | null>(null)
const loading = ref(false)
const loaded = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const listError = ref(false)
const errorText = ref('')
const properties = ref<Property[]>([])
const page = ref(1)

let loadGeneration = 0

function buildParams(): {
  keyword?: string
  rentMin?: number
  rentMax?: number
  rentStatus?: RentStatus
} {
  const params: {
    keyword?: string
    rentMin?: number
    rentMax?: number
    rentStatus?: RentStatus
  } = {}
  if (keyword.value.trim()) {
    params.keyword = keyword.value.trim()
  }
  if (isPositiveNumber(rentMin.value)) {
    params.rentMin = Number(rentMin.value)
  }
  if (isPositiveNumber(rentMax.value)) {
    params.rentMax = Number(rentMax.value)
  }
  if (rentStatus.value) {
    params.rentStatus = rentStatus.value as RentStatus
  }
  return params
}

async function fetchPage() {
  const generation = loadGeneration
  try {
    const result = await listProperties(buildParams(), page.value)
    if (generation !== loadGeneration) {
      return
    }
    properties.value.push(...result.items)
    page.value += 1
    finished.value = !result.hasMore
    listError.value = false
    loaded.value = true
    errorText.value = ''
  } catch (error) {
    if (generation !== loadGeneration) {
      return
    }
    if (properties.value.length === 0) {
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
  properties.value = []
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

async function onRefresh() {
  refreshing.value = true
  const generation = ++loadGeneration
  try {
    const result = await listProperties(buildParams(), 1)
    if (generation !== loadGeneration) {
      return
    }
    properties.value = result.items
    page.value = 2
    finished.value = !result.hasMore
    listError.value = false
    loaded.value = true
    errorText.value = ''
  } catch (error) {
    if (generation !== loadGeneration) {
      return
    }
    if (properties.value.length === 0) {
      errorText.value = errorMessageOf(error)
    } else {
      showToast(errorMessageOf(error))
    }
  } finally {
    refreshing.value = false
  }
}

watch(rentStatus, reload)

function coverOf(property: Property): string | undefined {
  return property.media
    .filter((m) => m.type === 'SURROUNDING')
    .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url
}

function openDetail(property: Property) {
  router.push(`/properties/${property.id}`)
}
</script>

<template>
  <div>
    <van-nav-bar title="轻亭看房" />

    <div class="filter-area">
      <van-search
        v-model="keyword"
        placeholder="搜索标题或位置"
        @search="reload"
        @clear="reload"
      />
      <div class="filter-chips">
        <div
          v-for="option in RENT_STATUS_OPTIONS"
          :key="option.value"
          class="chip"
          :class="{ on: rentStatus === option.value }"
          @click="rentStatus = option.value"
        >
          {{ option.text }}
        </div>
      </div>
      <div class="rent-filter">
        <van-field v-model="rentMin" type="digit" placeholder="¥ 最低" class="rent-field" />
        <van-field v-model="rentMax" type="digit" placeholder="¥ 最高" class="rent-field" />
        <van-button size="small" type="primary" class="filter-btn" @click="reload">筛选</van-button>
      </div>
    </div>

    <div class="page">
      <div class="page-content">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list
            ref="listRef"
            v-model:loading="loading"
            :finished="finished"
            finished-text=""
            :error="listError"
            error-text="加载失败，点击重试"
            @update:error="listError = $event"
            @load="onLoad"
          >
            <van-loading v-if="loading && !loaded" class="state-block">
              加载中...
            </van-loading>

            <van-empty v-else-if="errorText" image="error" :description="errorText">
              <van-button size="small" type="primary" @click="reload">重试</van-button>
            </van-empty>

            <van-empty v-else-if="loaded && properties.length === 0" description="暂无在租房源" />

            <div v-else class="property-list">
              <div
                v-for="property in properties"
                :key="property.id"
                class="property-card"
                :class="{ 'property-card-rented': property.rentStatus === 'RENTED' }"
                @click="openDetail(property)"
              >
                <img
                  v-if="coverOf(property)"
                  :src="coverOf(property)"
                  class="property-cover"
                  alt="房源图片"
                  loading="lazy"
                />
                <div
                  v-else
                  class="property-cover cover-placeholder"
                  :class="{ 'cover-placeholder-gray': property.rentStatus === 'RENTED' }"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  >
                    <path d="M3 11l9-7 9 7" />
                    <path d="M5 10v9h14v-9" />
                    <path d="M10 19v-5h4v5" />
                  </svg>
                  <span class="cover-placeholder-txt">暂无周边图</span>
                </div>
                <div class="property-body">
                  <div>
                    <div class="property-title">
                      {{ property.title }}
                      <span
                        class="status-tag"
                        :class="property.rentStatus === 'RENTED' ? 'status-tag--rented' : 'status-tag--rent'"
                      >
                        {{ property.rentStatus === 'RENTED' ? '已租出' : '待租' }}
                      </span>
                    </div>
                    <div class="property-location">{{ property.location }}</div>
                    <div
                      v-if="property.building && property.rentStatus !== 'RENTED'"
                      class="visit-row"
                    >
                      <span class="lab">看房</span>
                      <span
                        class="visit-tag"
                        :class="property.building.selfOpenSupported ? 'self' : 'escort'"
                      >
                        {{ property.building.selfOpenSupported ? '自助看房' : '管家带看' }}
                      </span>
                    </div>
                    <div class="property-meta">{{ property.layout }} · {{ property.area }}㎡</div>
                  </div>
                  <div class="property-rent">
                    <span class="rent-value">{{ property.rent }}元起</span>
                    <span class="rent-unit">/月</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="finished && properties.length > 0" class="list-foot">
              <div class="fi">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                </svg>
              </div>
              <div class="ft">
                <div class="t">更多房源持续接入中</div>
                <div class="s">初版房源较少，管家正在持续录入，敬请期待更多优质房源</div>
              </div>
            </div>
          </van-list>
        </van-pull-refresh>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.filter-chips {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.chip {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: var(--sub);
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 20px;
  padding: 7px 0;
  cursor: pointer;
}

.chip.on {
  color: var(--brand);
  background: var(--brand-light);
  border-color: var(--brand);
  font-weight: 500;
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

.property-card-rented {
  opacity: 0.7;
}

.property-cover {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: linear-gradient(135deg, #fdf0e2, #f8e2cc);
  color: var(--brand);
}

.cover-placeholder svg {
  width: 26px;
  height: 26px;
  opacity: 0.9;
}

.cover-placeholder-txt {
  font-size: 9px;
  color: var(--brand-strong);
  opacity: 0.75;
  line-height: 1;
}

.cover-placeholder-gray {
  background: linear-gradient(135deg, #f0f1f2, #e8e9ea);
  color: var(--hint);
}

.cover-placeholder-gray .cover-placeholder-txt {
  color: var(--muted);
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

.visit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-top: 6px;
}

.visit-row .lab {
  color: var(--muted);
  flex-shrink: 0;
}

.visit-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 6px;
  padding: 1px 7px;
  line-height: 1.5;
}

.visit-tag.self {
  color: #2d5f3f;
  background: #eaf3ee;
}

.visit-tag.escort {
  color: #c75e18;
  background: var(--brand-light);
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

.list-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 0.5px dashed var(--line2);
  border-radius: 14px;
  padding: 14px;
  margin-top: 4px;
}

.list-foot .fi {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.list-foot .fi svg {
  width: 18px;
  height: 18px;
}

.list-foot .ft {
  flex: 1;
  min-width: 0;
}

.list-foot .ft .t {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.list-foot .ft .s {
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
  line-height: 1.5;
}
</style>
