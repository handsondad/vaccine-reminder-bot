# 小孩打疫苗提醒机器人 🤖💉

使用飞书 CLI + GitHub Actions 开发的疫苗提醒机器人，支持自动定时提醒。

## 功能特性

- ✅ **定时提醒**：每天早上 8 点（北京时间）自动检查并发送提醒
- ✅ **飞书日历**：自动在飞书日历中创建疫苗接种日程
- ✅ **即时通知**：通过飞书消息即时推送提醒
- ✅ **手动触发**：支持 GitHub Actions 手动触发测试
- ✅ **跨平台**：可在本地或 GitHub 云端运行
- ✅ **多维表格**：使用飞书多维表格存储和管理疫苗记录

## 项目结构

```
vaccine-reminder-bot/
├── .github/
│   └── workflows/
│       └── vaccine-reminder.yml  # GitHub Actions 工作流
├── check-and-remind.js           # 核心提醒逻辑
├── index.js                      # 本地定时任务启动文件
├── package.json                  # 项目配置
├── .gitignore                    # Git 忽略文件
└── README.md                     # 项目文档
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 安装飞书 CLI

```bash
npx @larksuite/cli@latest install
```

### 3. 飞书授权

```bash
lark-cli auth login
```

### 4. 配置环境变量

**重要安全提示**：请勿将包含敏感信息的 .env 文件提交到 GitHub！

复制示例配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的配置：
```bash
VACCINE_BASE_TOKEN=您的多维表格Token
VACCINE_TABLE_ID=您的表格ID
```

### 5. 在飞书多维表格中添加疫苗记录

打开您的飞书多维表格，添加疫苗接种记录：
- 文本字段：疫苗名称（如：乙肝第二针）
- 日期字段：接种日期（如：2026-06-01）

### 6. 运行方式

**单次检查提醒：**
```bash
node check-and-remind.js
```

**创建疫苗日程：**
```bash
node check-and-remind.js --create-calendar
```

**启动本地定时服务（每天早8点提醒）：**
```bash
npm start
```

## 交互式机器人管理

### 启动交互式机器人

```bash
node vaccine-bot.js
```

机器人会监听您的飞书消息，支持以下命令：

### 可用命令

#### 1. 添加疫苗记录

发送消息格式：
```
添加疫苗: [疫苗名称] 日期: [YYYY-MM-DD]
```

示例：
```
添加疫苗: 乙肝第三针 日期: 2026-07-01
```

#### 2. 查询疫苗记录

发送消息：
```
查询疫苗
```

或：
```
查询所有疫苗
```

#### 3. 帮助信息

发送消息：
```
帮助
```

或：
```
--help
```

### 飞书多维表格

机器人会自动将疫苗记录存储在飞书多维表格中：

- **Base Token**: `MSMIbrG00adIT5spm4fccwbEnng`
- **表格链接**: https://my.feishu.cn/base/MSMIbrG00adIT5spm4fccwbEnng

您可以在飞书中打开这个表格，手动查看、编辑和管理疫苗记录。

### 配置说明

编辑 `vaccine-bot.js` 文件可以修改：
- Base Token（`BASE_TOKEN`）
- 表格 ID（`TABLE_ID`）

## GitHub 部署（推荐）

### 1. 创建 GitHub 仓库

```bash
git init
git add .
git commit -m "feat: 初始化疫苗提醒机器人"
git remote add origin https://github.com/你的用户名/vaccine-reminder-bot.git
git push -u origin main
```

### 2. 配置 GitHub Secrets

**重要**：敏感信息必须存储在 GitHub Secrets 中，绝不能硬编码到代码中！

在 GitHub 仓库中配置以下 secrets：

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下 secrets：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|----------|
| `VACCINE_BASE_TOKEN` | 飞书多维表格 Token | 从多维表格 URL 中获取 |
| `VACCINE_TABLE_ID` | 飞书多维表格 ID | 从多维表格 URL 中获取 |
| `VACCINE_USER_ID` | 飞书用户 ID | 在飞书中查看个人资料 |
| `LARK_DEVICE_CODE` | 飞书设备授权码 | 使用命令获取（见下文） |

### 3. 获取 LARK_DEVICE_CODE

在本地终端运行以下命令获取设备授权码：

```bash
npx lark-cli auth login --scope "calendar:calendar.event:create,im:message:send_as_user,bitable:app:readonly" --no-wait --json
```

会返回设备码，复制返回的 `device_code` 值，添加到 GitHub Secrets。

### 4. 启用 GitHub Actions

Push 代码后，GitHub Actions 会自动运行。

查看运行状态：**Actions** → **Vaccine Reminder Bot**

### 5. 手动触发测试

1. 进入仓库的 **Actions** 页面
2. 选择 **Vaccine Reminder Bot** 工作流
3. 点击 **Run workflow**
4. 选择模式：
   - `remind`: 运行提醒检查
   - `create-calendar`: 创建疫苗日程
   - `test`: 测试模式

## 工作流程

### 自动运行（每天 08:00 UTC）

1. GitHub Actions 自动触发
2. 检出代码
3. 安装依赖和 lark-cli
4. **从 Secrets 读取环境变量**（安全）
5. 进行飞书授权
6. 运行提醒检查脚本
7. 发送飞书消息（如有提醒）

### 手动触发

可通过 GitHub Actions 界面手动运行，支持三种模式。

## 安全说明

### 为什么使用 GitHub Secrets？

| 方案 | 安全性 | 推荐度 |
|------|--------|--------|
| 硬编码到代码 | ❌ 危险 | 不推荐 |
| .env 文件（本地） | ✅ 安全 | 本地使用 |
| GitHub Secrets | ✅✅ 最安全 | GitHub Actions 使用 |

### GitHub Secrets 特性

- ✅ **加密存储**：所有 secrets 都经过加密
- ✅ **不暴露在日志**：Secrets 不会出现在 GitHub Actions 日志中
- ✅ **不暴露在代码**：Secrets 不会出现在代码仓库中
- ✅ **版本控制分离**：密钥与代码分离管理

## 自定义配置

### 修改提醒时间

编辑 `.github/workflows/vaccine-reminder.yml` 中的 cron 表达式：

```yaml
schedule:
  - cron: '0 0 * * *'  # 每天 00:00 UTC = 08:00 北京时间
```

### 修改疫苗时间表

编辑 `check-and-remind.js` 中的 `VACCINE_SCHEDULE` 数组。

### 修改接收人

设置环境变量 `VACCINE_USER_ID`：

**本地：**
```bash
export VACCINE_USER_ID="ou_xxxxxxxx"
node check-and-remind.js
```

**GitHub Secrets：**
添加 `VACCINE_USER_ID` secret。

## 环境变量

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `VACCINE_USER_ID` | 飞书用户 open_id | 否 | 本地配置的 user_id |

## 常见问题

### Q: 授权失败怎么办？

确保已运行 `lark-cli auth login` 并完成授权。如果在 GitHub Actions 中运行，确保 secrets 配置正确。

### Q: 如何添加新的疫苗？

编辑 `check-and-remind.js` 中的 `VACCINE_SCHEDULE` 数组，添加新的疫苗记录。

### Q: 可以发送到群聊吗？

可以！修改 `check-and-remind.js` 中的消息发送逻辑，使用 `--chat-id` 参数代替 `--user-id`。

### Q: 时区如何调整？

GitHub Actions 使用 UTC 时间。如需北京时间 8 点，设置为 `0 0 * * *`（00:00 UTC）。

## 技术栈

- **Node.js**: JavaScript 运行时
- **lark-cli**: 飞书命令行工具
- **GitHub Actions**: CI/CD 和定时任务
- **飞书开放平台**: 日历和消息 API

## License

MIT License

## Contributing

欢迎提交 Issue 和 Pull Request！
