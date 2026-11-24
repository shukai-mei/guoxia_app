<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface Section {
  heading: string
  paragraphs: string[]
}

interface LegalDoc {
  title: string
  updated: string
  intro: string[]
  sections: Section[]
}

const serviceAgreement: LegalDoc = {
  title: '用户服务协议',
  updated: '2026年11月22日',
  intro: [
    '欢迎使用"轻亭看房"服务！《用户服务协议》（以下简称"本协议"）由您与深圳市品悦家兴物业管理有限公司（以下简称"我们"）就您使用"轻亭看房"小程序及网页版（以下简称"本服务"）所订立。请您在使用本服务前仔细阅读并充分理解本协议。您勾选同意或实际使用本服务，即视为您已阅读并同意本协议全部内容。'
  ],
  sections: [
    {
      heading: '一、服务内容',
      paragraphs: [
        '本服务为您提供房源浏览、预约看房、预约进度查询等信息服务。',
        '我们有权根据业务发展需要增加、调整或停止部分或全部服务内容，并通过页面公告等方式进行通知。'
      ]
    },
    {
      heading: '二、账号与预约',
      paragraphs: [
        '预约看房时，您应填写真实的姓名和手机号码，并通过短信验证码验证手机号码的有效性。',
        '您承诺不冒用他人信息、不利用本服务进行虚假预约；因您提供的信息不真实而导致的一切后果由您自行承担。'
      ]
    },
    {
      heading: '三、用户行为规范',
      paragraphs: [
        '您在使用本服务时应遵守中华人民共和国法律法规，不得利用本服务从事任何违法违规活动。',
        '不得以任何方式干扰本服务的正常运行，包括但不限于利用技术手段攻击、篡改、侵入本服务系统。'
      ]
    },
    {
      heading: '四、服务的变更、中断与终止',
      paragraphs: [
        '因系统维护或升级需要，本服务可能暂停部分或全部功能，我们将尽量提前通过页面公告等方式通知。',
        '如您违反本协议或法律法规，我们有权暂停或终止向您提供服务。'
      ]
    },
    {
      heading: '五、免责声明',
      paragraphs: [
        '因不可抗力、第三方原因（如电信运营商、短信服务商、电力或网络故障等）或您自身原因导致的服务中断、延迟或损失，我们在法律允许的范围内不承担责任。',
        '本服务中的房源信息由相关权利人提供，我们不对其真实性作超出合理范围的保证，请您以实地看房为准。'
      ]
    },
    {
      heading: '六、知识产权',
      paragraphs: [
        '本服务涉及的文字、图片、视频等内容的知识产权归我们或相关权利人所有。未经许可，您不得擅自复制、转载、传播或用于商业用途。'
      ]
    },
    {
      heading: '七、法律适用与争议解决',
      paragraphs: [
        '本协议的订立、履行与解释适用中华人民共和国法律。',
        '因本协议产生的争议，双方应友好协商解决；协商不成的，任何一方均可向有管辖权的人民法院提起诉讼。'
      ]
    },
    {
      heading: '八、联系我们',
      paragraphs: ['运营主体：深圳市品悦家兴物业管理有限公司', '客服电话：0755-36527999']
    }
  ]
}

const privacyPolicy: LegalDoc = {
  title: '隐私政策',
  updated: '2026年11月22日',
  intro: [
    '深圳市品悦家兴物业管理有限公司（以下简称"我们"）深知个人信息对您的重要性，并将尽全力保护您的个人信息安全。本《隐私政策》（以下简称"本政策"）适用于"轻亭看房"小程序及网页版（以下简称"本服务"）。请您在使用本服务前仔细阅读本政策，您勾选同意即表示您已充分理解并同意本政策全部内容。'
  ],
  sections: [
    {
      heading: '一、我们收集的信息',
      paragraphs: [
        '您在预约看房时主动填写的姓名、手机号码；',
        '您使用本服务过程中产生的预约记录（包括房源信息、看房日期与时段等）。'
      ]
    },
    {
      heading: '二、收集和使用信息的目的、方式与用途',
      paragraphs: [
        '手机号码：用于向您发送短信验证码以完成预约核验，并在预约成功后与您联系确认看房事宜；',
        '姓名：用于确认预约人身份并生成预约记录；',
        '预约记录：用于为您安排看房时段并提供预约相关服务。',
        '我们仅在您自愿填写相关信息并勾选同意本政策后，才收集和使用上述信息。'
      ]
    },
    {
      heading: '三、信息的存储与保护',
      paragraphs: [
        '您的个人信息将存储在中华人民共和国境内的服务器上，仅在实现上述目的所必需的期限内保存；',
        '我们采取加密传输、访问控制等安全措施保护您的个人信息，防止信息泄露、损毁或丢失。'
      ]
    },
    {
      heading: '四、信息的共享、转让与公开披露',
      paragraphs: [
        '我们不会向任何第三方出售您的个人信息；',
        '仅为向您发送验证码短信和预约通知短信，我们会向短信服务商提供您的手机号码，并要求其承担保密义务；',
        '除法律法规规定或司法机关、行政机关依法要求外，我们不会向任何第三方披露您的个人信息。'
      ]
    },
    {
      heading: '五、您的权利',
      paragraphs: [
        '您可以随时联系我们查询、更正或删除您的个人信息；',
        '您可以撤回授权同意，撤回后我们将停止收集和使用您的相关信息；撤回同意不影响撤回前基于您的同意已进行的个人信息处理活动的效力。'
      ]
    },
    {
      heading: '六、未成年人保护',
      paragraphs: ['如您为未满18周岁的未成年人，请在监护人指导下使用本服务。']
    },
    {
      heading: '七、政策的更新',
      paragraphs: ['本政策可能适时更新。发生重大变更时，我们将通过页面公告等显著方式通知您。']
    },
    {
      heading: '八、联系我们',
      paragraphs: ['运营主体：深圳市品悦家兴物业管理有限公司', '客服电话：0755-36527999']
    }
  ]
}

const route = useRoute()
const router = useRouter()

const doc = computed<LegalDoc>(() =>
  route.params.type === 'privacy' ? privacyPolicy : serviceAgreement
)
</script>

<template>
  <div>
    <van-nav-bar :title="doc.title" left-arrow @click-left="router.back()" />

    <div class="page">
      <div class="page-content">
        <div class="agreement-card">
          <div class="doc-updated">更新日期：{{ doc.updated }}　生效日期：{{ doc.updated }}</div>
          <p v-for="(paragraph, index) in doc.intro" :key="`intro-${index}`" class="doc-p">
            {{ paragraph }}
          </p>
          <template v-for="(section, sectionIndex) in doc.sections" :key="`section-${sectionIndex}`">
            <div class="doc-heading">{{ section.heading }}</div>
            <p v-for="(paragraph, index) in section.paragraphs" :key="`p-${index}`" class="doc-p">
              {{ paragraph }}
            </p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agreement-card {
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
  padding: 16px 14px;
}

.doc-updated {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 12px;
}

.doc-heading {
  margin-top: 14px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.doc-p {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink);
  text-align: justify;
}
</style>
