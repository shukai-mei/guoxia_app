<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { http } from '../../api/http'
import { clearAdminAuth } from '../../utils/adminAuth'
import { errorMessageOf } from '../../utils/error'

const router = useRouter()

const entries = [
  { title: '房源管理', desc: '录入与上下架房源', path: '/admin/properties' },
  { title: '预约管理', desc: '处理看房预约申请', path: '/admin/appointments' },
  { title: '楼栋管理', desc: '楼栋信息与看房时段', path: '/admin/buildings' },
  { title: '每日密码', desc: '按房源按天维护临时密码', path: '/admin/daily-passwords' },
  { title: '管家管理', desc: '管家档案与二维码', path: '/admin/housekeepers' },
  { title: '咨询内容配置', desc: '咨询常见问题与看房须知', path: '/admin/content-config' }
]

const loggingOut = ref(false)

function go(path: string) {
  router.push(path)
}

async function logout() {
  loggingOut.value = true
  try {
    await http.post('/admin/api/auth/logout')
    clearAdminAuth()
    await router.replace('/admin/login')
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div>
    <van-nav-bar title="管理后台" />

    <div class="page">
      <div class="page-content">
        <van-cell-group inset>
          <van-cell
            v-for="entry in entries"
            :key="entry.path"
            :title="entry.title"
            :label="entry.desc"
            is-link
            @click="go(entry.path)"
          />
        </van-cell-group>

        <div class="logout-wrap">
          <van-button
            round
            block
            plain
            type="danger"
            :loading="loggingOut"
            @click="logout"
          >
            退出登录
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logout-wrap {
  padding: 24px 16px;
}
</style>
