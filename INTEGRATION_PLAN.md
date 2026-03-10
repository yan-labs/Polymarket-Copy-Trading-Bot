# Phase 3: 后端集成计划

## 当前状态
- ✅ SaaS 前端完成（Next.js + React + Tailwind）
- ✅ 原始 bot 后端完成（tradeMonitor + tradeExecutor）
- ❌ 前端和后端未连接

## 架构设计

### 问题
原始 bot 设计：
- 从环境变量 `USER_ADDRESSES` 读取跟单地址
- 单用户模式（一个 proxy wallet）
- 数据存储在以钱包地址命名的集合中

SaaS 需求：
- 多用户模式（每个用户有自己的 proxy wallet）
- 用户可动态添加/删除跟单地址
- 前端需要实时显示数据

### 解决方案

**架构选择**：分离但共享数据库

```
┌─────────────────────┐
│  Next.js Frontend   │
│  (SaaS Web UI)      │
└──────────┬──────────┘
           │
           │ MongoDB
           │
┌──────────┴──────────┐
│  Backend Service    │
│  (Node.js Process)  │
│  - tradeMonitor     │
│  - tradeExecutor    │
└─────────────────────┘
```

**数据模型整合**：

1. **User** (SaaS 用户)
   - email, password
   - proxyWallet (用户的 Polymarket 钱包)
   - privateKey (加密存储)

2. **Settings** (用户设置)
   - followedTraders: string[] (要跟单的地址)
   - copyStrategy, copySize, 等

3. **user_activities_{address}** (交易活动 - 每个 trader 一个集合)
   - 原始 bot 的模型
   - 被 tradeMonitor 写入

4. **user_positions_{address}** (持仓 - 每个 trader 一个集合)
   - 原始 bot 的模型
   - 被 tradeMonitor 写入

**关键修改**：

### 后端修改（src/）

1. **config/env.ts** - 添加多用户支持
   - 移除 `USER_ADDRESSES` 环境变量要求
   - 添加从数据库读取设置的逻辑

2. **services/tradeMonitor.ts** - 修改为多用户
   - 从 `Settings.followedTraders` 读取地址
   - 为每个用户监控其跟单列表
   - 定期检查设置变化

3. **services/tradeExecutor.ts** - 修改为多用户
   - 为每个用户的每个跟单地址执行交易
   - 使用用户的 `proxyWallet` 和私钥

### 前端 API Routes（web/app/api/）

已有：
- `/api/auth/register` - 注册
- `/api/auth/[...nextauth]` - 认证
- `/api/settings` - 设置 CRUD
- `/api/traders` - 跟单交易员 CRUD
- `/api/positions` - 持仓查询
- `/api/activity` - 活动日志查询

需要添加：
- `/api/bot/status` - Bot 运行状态
- `/api/bot/start` - 启动 Bot
- `/api/bot/stop` - 停止 Bot
- `/api/bot/health` - 健康检查

### 实时数据推送

**选项 1：轮询（简单）**
- 前端每 5-10 秒调用 `/api/positions` 和 `/api/activity`
- 优点：实现简单
- 缺点：不是真正的实时

**选项 2：WebSocket（推荐）**
- 后端推送更新到前端
- 优点：真正的实时
- 缺点：实现复杂

**Phase 3 先用轮询，Phase 4 再实现 WebSocket**

## 实施步骤

### Step 1: 修改后端支持多用户
1. 创建 `src/services/userManager.ts` - 管理用户设置
2. 修改 `src/services/tradeMonitor.ts` - 多用户支持
3. 修改 `src/services/tradeExecutor.ts` - 多用户支持
4. 更新 `src/config/env.ts` - 移除单用户限制

### Step 2: 创建 Bot 管理 API
1. `/api/bot/status` - Bot 状态
2. `/api/bot/start` - 启动
3. `/api/bot/stop` - 停止

### Step 3: 连接前端和后端数据
1. 修改 `/api/positions` - 返回真实持仓数据
2. 修改 `/api/activity` - 返回真实活动数据
3. 修改 Dashboard - 显示真实数据

### Step 4: 测试和调试
1. 测试多用户支持
2. 测试实时数据更新
3. 测试 Bot 启动/停止

## 挑战和风险

### 1. Bot 进程管理
- **问题**：Next.js 不适合运行长期后台进程
- **解决**：Bot 作为独立 Node.js 进程运行，通过 API 或进程管理器控制

### 2. 多用户隔离
- **问题**：需要确保用户数据隔离
- **解决**：
  - 每个用户有自己的 proxyWallet 和私钥
  - Settings.followedTraders 只包含用户自己的地址
  - API 验证用户权限

### 3. 实时数据推送
- **问题**：前端需要实时看到数据变化
- **解决**：
  - Phase 3：轮询（每 5 秒）
  - Phase 4：WebSocket 实时推送

## 下一步

开始 Step 1：修改后端支持多用户