# Bilibili Live Helper

Bilibili直播相关自动化脚本

## 功能

### 主站

- [x] 每日登录
- [x] 每日观看视频
- [x] 每日分享视频（并不会实际分享）
- [x] 自动领取年度大会员B币卷
- [x] 自动使用年度大会员B币卷为自己充电或者兑换为直播电池

### 直播区

- [x] 每日签到
- [x] 应援团签到
- [x] 粉丝勋章弹幕打卡
- [x] 自动赠送背包礼物
- [x] 自动点赞直播间3次
- [x] 自动分享直播间5次（并不会实际分享）
- [x] 自动观看直播间30分钟

## 获取 Cookies

程序会依序尝试从以下途径获取Cookies
  * `.env`中的`COOKIES`
  * 环境变量`COOKIES`
  * 已配置的[CookieCloud](https://github.com/easychen/CookieCloud)服务
  * `.cookies`文件内容

### 获取现有的 Cookies

打开无痕模式，随便打开一个直播间，然后打开开发人员工具，在网络/Network选项卡内过滤`bilibili.com`的`Fetch/XHR`请求，随意挑选一个请求，然后在请求头中找到Cookie，复制冒号后面的内容（即下图浅蓝色部分）。

![How to find Cookies](HOWTO-Cookies.jpg)

### 获取新的 Cookies

```bash
# Docker
docker run --name bilibili rhyster/bilibili-live-helper:latest pnpm start:cookies && docker cp bilibili:/usr/src/app/.cookies bilibili.cookies && docker rm -f bilibili
# Node
pnpm install
pnpm start:cookies
```

使用手机客户端扫描显示的二维码完成登录后，工具将自动将Cookies写入.cookies文件。

### 配置 CookieCloud

配置环境变量`COOKIE_CLOUD_URL`、`COOKIE_CLOUD_UUID`和`COOKIE_CLOUD_KEY`，在同步域名关键词中加入`bilibili.com`。

## 配置与运行

### Docker

```bash
vi .env
docker pull rhyster/bilibili-live-helper:latest
docker run --rm --env-file .env --name bilibili rhyster/bilibili-live-helper:latest
```

### Node

1. 运行环境

需要环境 Node.js >= 14.18.2

2. 配置

```bash
cp .env.example .env
vi .env
```

根据注释修改，如果需要禁用某项功能，将等号后置空或者改为0。

3. 开始运行

```bash
pnpm install
pnpm build
pnpm start
```

## 许可

MIT License
