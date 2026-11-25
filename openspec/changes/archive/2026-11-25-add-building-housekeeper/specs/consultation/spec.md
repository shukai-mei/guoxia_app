# Spec Delta

## REMOVED Requirements

### Requirement: 展示管家联系方式与复制微信号

**Reason**: 管家微信改为按楼栋配置（见 building-housekeeper 能力），平台级企微配置下线，咨询页无楼栋上下文，不再展示管家联系方式。

**Migration**: 删除咨询页管家联系卡、复制微信号按钮及企微配置接口调用；租客按预约成功页中对应楼栋管家的微信号添加管家。
