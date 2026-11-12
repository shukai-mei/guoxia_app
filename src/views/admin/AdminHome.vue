<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const entries = [
  { title: '房源管理', desc: '录入与上下架房源', path: '/admin/properties' },
  { title: '预约管理', desc: '处理看房预约申请', path: '/admin/appointments' },
  { title: '楼栋管理', desc: '楼栋信息与看房时段', path: '/admin/buildings' },
  { title: '每日密码', desc: '按房源按天维护临时密码', path: '/admin/daily-passwords' },
  { title: '企微客服配置', desc: '客服微信号与二维码', path: '/admin/wechat-config' }
]

function go(path: string) {
  router.push(path)
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
      </div>
    </div>
  </div>
</template>
