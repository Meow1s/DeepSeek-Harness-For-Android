# DeepSeek Harness For Android

> 把 DeepSeek Harness 放到手机主屏的 Miuix 风格启动器。

[English](README.md)

| 浅色 | 深色 |
| --- | --- |
| ![浅色](docs/preview.png) | ![深色](docs/preview-dark.png) |

![设置界面](docs/settings.png)

> **非官方社区项目。** 与 DeepSeek、小米均无隶属或背书关系。  
> 这是一个 **PWA 启动器**，附带可选的薄 APK WebView 壳；不是独立的原生 DSH 客户端，也不是 DeepSeek 官方 Android 客户端。它需要 DSH 在 Android 的 Linux 用户空间（Eta、Termux/proot 等）中运行。

## 为什么

DSH 在桌面上很好用，但在手机上通常要打开终端、启动 `dsh web`、复制 token 链接。这个项目把它变成主屏上的一个 App：

- 自动启动或接管本地 `dsh web`；
- 从 DSH 日志自动找访问 token，不需要手工复制；
- 把 DSH 嵌进带返回键的手机壳里，提供「启动器」和「对话」按钮；
- 内置 **dsh-web-mobile** 做手机端 DSH UI，内置 **dsh-ops** 提供原生文件 / Shell 工具；
- 进入时清掉 DSH 右侧文档预览 / 文件 diff 的旧布局，避免手机宽度下只剩一个 diff 面板；
- 跟随系统浅色 / 深色，使用 Miuix 视觉语言。

数据全部留在本机，没有遥测、账号或外部服务。

## 功能

- **一键启动并进入**：没有 DSH 时自动拉起 `dsh web`。
- **自动接管**：已经在 3080 运行的 DSH 会从日志找 token 接管。
- **内嵌 DSH**：全高 iframe，顶部「启动器」返回，另有「对话」复位按钮。
- **内置插件**：打包 **dsh-web-mobile**（手机端 DSH UI）和 **dsh-ops**（原生文件 / Shell 工具），自动链接进 `web` profile。
- **回到对话**：清除 `dsh.sidebar-right.*` 持久化布局，不再被 `preview.png` / 文件 diff 挡住。
- **配置**：在手机上切换 Profile、工作区、端口、监听地址。
- **PWA**：可添加到主屏，Service Worker 离线壳，独立窗口显示。
- **APK 壳**：可选的签名 Android WebView 包装，直接打开本地启动器。
- **Miuix 返回**：启用 Android 13+ 预测性返回；DSH 返回使用缩放/圆角过渡。
- **任务通知**：DSH 工作时显示常驻通知，含已用时间和当前工作过程；完成 / 失败时各发一条通知。
- **开机自启**：可选 KernelSU `service.d` 钩子；只启动启动器，不自动启动 DSH。
- **安全默认值**：默认只监听回环地址；监听其它地址时要求访问密钥；日志会脱敏 token / API key。
- **零运行时 npm 依赖**：Node 标准库 + 内置的 Miuix CSS。

## 环境要求

- Android 上的 Linux 用户空间：Eta（Debian proot）、Termux/proot 等。仓库内的开机钩子默认按 Eta 编写，但启动器本身是通用 Linux 程序。
- Node.js 24+（内置的 dsh-web-mobile 插件要求）。
- 已安装 DSH 0.2.1+，且 `web` profile 可用。
- Chrome 等 Chromium 浏览器用于安装 PWA；`127.0.0.1` 属于安全上下文。
- 可选：root + KernelSU，用于 Android 开机钩子。

## 快速开始

```sh
git clone https://github.com/Meow1s/DeepSeek-Harness-For-Android.git
cd DeepSeek-Harness-For-Android
sh scripts/start.sh
```

打开：

```text
http://127.0.0.1:3081/
```

启动器默认在 3081，DSH 默认在 3080。DSH 已在运行时启动器会直接接管；否则点「启动并进入」，它会启动 `dsh web`。

### 安装到手机主屏

1. 用手机 Chrome 打开 `http://127.0.0.1:3081/`。
2. 点右上角下载图标，或「设置 → 安装到主屏」。
3. 如果没弹出安装提示，打开 Chrome 菜单 →「添加到主屏幕 / 安装应用」。

如果通过 `localhost` 打开启动器，DSH 链接也会使用 `localhost`，让 iframe 内的认证 cookie 保持 same-site。

## Android APK

签名 APK 已发布到 [GitHub Releases](https://github.com/Meow1s/DeepSeek-Harness-For-Android/releases/latest)：

```text
dsh-launcher-1.0.4.apk
```

APK 是一个**很薄的 WebView 壳**：

- 打开 `http://127.0.0.1:3081/`，全屏 WebView；
- **不**内置 Node / DSH / proot rootfs；本地启动器仍需在 Eta / Termux 中运行；
- 本地服务没启动时，原生错误页提供「重试」和「启动本地服务」（需要 Root /
  KernelSU，执行 `/data/adb/service.d/dsh-launcher.sh`）；
- 包名 `com.meow1s.dshlauncher`，minSdk 26，targetSdk 34；
- 图标使用 DSH 官方鲸鱼标志；
- Android 13+ 预测性返回；DSH 返回使用 Miuix 风格缩放/圆角过渡；
- 进行中常驻通知带计时和工作过程；完成 / 失败通知。

从 [android-app/README.md](android-app/README.md) 可以自行构建。发布 APK 使用本地
keystore 签名；如果要持续发布更新，请保管好这个 key。

## 内置 DSH 插件

仓库在 `plugins/` 下打包了两个 DSH 插件的源码快照：

- **dsh-web-mobile 3.2.1** — 手机端 DSH UI：左上角抽屉按钮、移动顶栏、底部 sheet、安全区处理、触屏输入区。MIT，作者 [mexiaosqwq](https://github.com/mexiaosqwq/dsh-web-mobile)。
- **dsh-ops 0.4.1** — DSH 的原生文件 / Shell 工具。MIT AND Apache-2.0，作者 [T-Auto](https://github.com/T-Auto/dsh-ops)。

`scripts/install-plugins.sh` 会用 `dsh plugin add link:...` 把两个目录链接进 `web` profile，并确保它们出现在 `dsh.profile.bundles`。`scripts/start.sh` 和 Android 开机钩子会尽力自动执行。装完必须**重启 DSH**；客户端插件只在 DSH 服务启动时加载。

```sh
sh scripts/install-plugins.sh
```

手机端 UI（包括抽屉和账号菜单）由 dsh-web-mobile 提供，启动器不再额外注入底栏。快照不是 git submodule；版本、许可证和更新注意事项见 [plugins/README.md](plugins/README.md)。

## 回到对话桥

DSH 会把右侧文档预览 / diff 的布局存到以 `dsh.sidebar-right.` 开头的 localStorage 键里。手机宽度下恢复这个布局会占满页面，看起来像整个 DSH 变成了代码 diff。

启动器通过一个 DSH 同源的重置页解决：

```text
public/dsh-pocket-reset.html
    → 复制到 DSH 的 @deepseek-ai/dsh-web-frontend/dist/
```

在启动器 iframe 里打开 `/open` 时，会先经过这个页面，清掉右侧栏布局，再跳转到真正的 DSH token URL。直接在新标签页打开时它只转发 token，不会动已保存的布局。

安装或修复：

```sh
sh scripts/install-dsh-reset-page.sh
```

`scripts/start.sh` 和 Android 开机钩子会尽力自动补装。DSH 升级后如果重置页消失，`/open` 会自动回退到普通进入方式；重新运行安装脚本即可恢复。

## Android 开机自启（可选）

`android/dsh-launcher-boot.sh` 是一个 KernelSU `service.d` 示例：等系统启动、等 Eta Debian rootfs 可读，然后在 proot 中启动启动器。它 **不会** 自动启动 DSH。

复制到手机（先按自己的环境修改顶部路径）：

```sh
su -c 'cp android/dsh-launcher-boot.sh /data/adb/service.d/dsh-launcher.sh'
su -c 'chmod 755 /data/adb/service.d/dsh-launcher.sh'
```

默认目标为 Eta 的 `/data/user/0/io.github.mangi.eta` 和 workspace `/data/local/tmp/eta`。可通过 `DSH_LAUNCHER_WORKSPACE`、`DSH_LAUNCHER_APP_DIR`、`DSH_LAUNCHER_DATA_HOST`、`DSH_LAUNCHER_HOST`、`DSH_LAUNCHER_PORT` 覆盖。

## 配置

设置面板写入 `data/config.json`：

```json
{
  "profile": "web",
  "workspace": "/home/me/workspace",
  "host": "127.0.0.1",
  "port": 3080
}
```

- `profile`：包含 `@deepseek-ai/dsh-web-app` 的 Profile。
- `workspace`：DSH 工作区绝对路径。
- `host`：本机具体 IPv4 地址；DSH 不接受通配地址。
- `port`：DSH Web 端口。

启动器自己的端口和地址：

```sh
node server.mjs --host 127.0.0.1 --port 3081
# 或
DSH_LAUNCHER_PORT=3081 DSH_LAUNCHER_HOST=127.0.0.1 sh scripts/start.sh
```

其他环境变量：

| 变量 | 用途 |
| --- | --- |
| `DSH_LAUNCHER_DATA` | 数据目录，默认 `./data` |
| `DSH_LAUNCHER_DSH_COMMAND` | DSH 可执行文件路径 |
| `DSH_LAUNCHER_ACCESS_KEY` | 监听非回环地址时的访问密钥 |
| `DSH_WEB_FRONTEND_DIST` | 重置桥安装目标 DSH 前端 dist |

## 安全

- 默认只监听 `127.0.0.1`。
- 监听非回环地址时自动生成 `data/access-key`，要求带密钥的 Cookie。
- DSH token 只留在服务端和 `/open` 跳转中，不出现在 `/api/status`。
- `/api/logs` 会脱敏 `token=…`、`sk-…` 和 Bearer token。
- 写接口要求同源 JSON POST。
- 不要把 3080 / 3081 直接暴露到公网；远程访问请用 Tailscale / SSH 隧道等。

## 工作原理

```text
PWA (3081)
  ├─ GET /api/status
  ├─ 没有 DSH：spawn dsh --profile web --host 127.0.0.1 --port 3080 --no-open
  ├─ 从日志解析 token
  ├─ 校验 token（DSH 返回 303）
  ├─ GET /open
  │    └─ DSH 同源 dsh-pocket-reset.html?token=…
  │         ├─ iframe 内清掉 dsh.sidebar-right.*
  │         └─ 跳转到 /?token=…
  └─ iframe 内嵌 DSH，顶部「启动器」/「对话」
       └─ web profile 加载内置 dsh-web-mobile + dsh-ops
```

启动器拉起的 DSH 以 detached 进程组运行，启动器停止后 DSH 仍可用；下次启动会从 `data/managed.json` 恢复托管关系。外部启动的 DSH 只能打开，不能在启动器内停止/重启。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/status` | 启动器、DSH、配置、最近会话 |
| GET | `/api/logs?lines=220` | 脱敏日志尾部 |
| POST | `/api/start` | 启动托管 DSH |
| POST | `/api/stop` | 停止托管 DSH |
| POST | `/api/restart` | 重启托管 DSH |
| POST | `/api/settings` | 保存 Profile/工作区/端口/地址 |
| POST | `/api/dismiss` | 清除错误 |
| GET | `/open` | 经重置桥 302 到带 token 的 DSH |
| GET | `/healthz` | 健康检查 |

## 测试

```sh
node --check server.mjs
node --check public/app.js
node --check public/sw.js
sh -n scripts/install-plugins.sh
sh -n android-app/build.sh
node --check public/dsh-notify.js
sh -n scripts/install-dsh-notify.sh
node test/smoke.mjs
```

Smoke 测试使用 mock DSH，完整跑一遍启动 → 找 token → `/open` 302 → 脱敏日志 → 停止 → 保存设置。GitHub Actions 在 Node 24 上运行同一套测试。

每次改动都可以用下面的脚本提交并推送：

```sh
sh scripts/sync-github.sh "feat: 描述这次改动"
```

## 故障排查

**提示「找不到 DSH 访问令牌」** — 重启 DSH。启动器会扫描 `/workspace/daemon/dm_*.log`、`/workspace/dsh/*.log` 和自己的 `data/logs/dsh-*.log`。托管实例可直接点「重启」。

**提示「端口已被占用」** — 改设置里的 DSH 端口，或停止 3080 上的进程。

**嵌入页空白** — 点「新页面」或设置里的「直接打开 DSH」。如果 DSH 未来禁止 iframe，嵌入会失效，但新标签页仍可用。

**进入后仍是文件 diff / 右侧栏** — 点 DSH 顶栏的「对话」。需要重装重置桥时运行 `sh scripts/install-dsh-reset-page.sh`。

**重启后没有手机 UI** — 先运行 `sh scripts/install-plugins.sh`，然后重启 DSH（不是只刷新浏览器）。手机 UI 是客户端插件，只在 DSH 服务启动时加载。

**PWA 一直是旧界面** — 把 `public/sw.js` 的 `VERSION` 加一，然后重新打开 / 清除站点数据。

**开机后没有启动器** — 检查 `/data/adb/service.d/dsh-launcher.sh` 和 `data/boot.log`；默认路径按 Eta 写的，其它环境需要改。

## 已知限制

- APK 是薄 WebView 壳，不内置 Node / DSH / proot rootfs。
- **dsh-web-mobile 和 dsh-ops 是固定版本的第三方快照；升级需要替换目录并重新验证 DSH 兼容性。dsh-ops 的原生运行时支持与平台相关。**
- 外部启动的 DSH 不能在启动器内停止/重启。
- Android 开机钩子默认依赖 Eta 路径和 root/KernelSU。
- PWA 安装只在安全上下文（127.0.0.1 / HTTPS）可用，普通局域网 HTTP 不行。

## 致谢

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。
- [dsh-web-mobile](https://github.com/mexiaosqwq/dsh-web-mobile)（MIT，作者 mexiaosqwq）— 内置手机端 DSH UI。
- [dsh-ops](https://github.com/T-Auto/dsh-ops)（MIT AND Apache-2.0，作者 T-Auto）— 内置原生工具。
- [Miuix](https://github.com/compose-miuix-ui/miuix) 设计语言；Web tokens / 组件 CSS 来自 [miuix-vue](https://github.com/YuKongA/miuix-vue)（Apache-2.0）。
- Miuix 视觉仅作风格参考；本项目与小米、MIUI / HyperOS 无隶属或背书关系。
- DSH 鲸鱼标志仅用于标识本地 DSH 启动器。

## License

MIT，见 [LICENSE](LICENSE)。内置 Miuix CSS 为 Apache-2.0，见 [public/vendor/miuix/LICENSE](public/vendor/miuix/LICENSE)。内置插件保留各自许可证，见 [plugins/](plugins/README.md)。
