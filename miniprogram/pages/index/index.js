const BASE_URL = 'https://www.qingtinkanfang.com/'

Page({
  data: {
    webviewSrc: BASE_URL
  },

  onLoad() {
    wx.login({
      success: (res) => {
        if (res.code) {
          this.setData({ webviewSrc: `${BASE_URL}?wxcode=${res.code}` })
        }
      }
    })
  }
})
