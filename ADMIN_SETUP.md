# 品牌展示应用 - 管理员设置指南

## 应用概述

这是一个品牌展示型应用，包含：
- **普通用户视图**：首页、产品页、账户页（只读）
- **管理员入口**：右下角的"管理员入口"按钮（隐藏功能）
- **管理员功能**：问卷数据、测试协议、测试日志管理

## 快速开始

应用已经完全部署并运行在：http://localhost:5000

### 1. 访问应用
打开浏览器访问：http://localhost:5000

- 普通用户可以看到首页、产品页和账户页
- 所有页面都是只读的，无需登录

### 2. 创建管理员账户

由于应用不提供公开注册功能，需要通过以下方式创建管理员：

**方法 A：使用初始化 API（推荐）**

```bash
curl -X POST http://localhost:5000/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

成功后会返回管理员信息。

**方法 B：使用 Node.js 脚本**

```bash
cd /workspace/projects
node scripts/create-admin.js admin@example.com admin123
```

**方法 C：直接在数据库中创建**

如果以上方法都失败，可以直接使用 coze-coding-ai 工具连接数据库：

```sql
-- 先获取密码哈希（在 Node.js 中运行）
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log(hash);

-- 然后在数据库中执行
INSERT INTO users (email, password, name, is_admin, provider)
VALUES ('admin@example.com', '$2a$10$...', 'Admin', true, 'email');
```

### 3. 登录管理员

1. 点击页面右下角的"管理员入口"按钮
2. 输入管理员邮箱和密码
3. 登录成功后进入管理仪表盘

## 管理功能

### 创建测试协议
1. 在管理员仪表盘的"Protocols"标签页
2. 填写标题和描述（可选）
3. 点击"Create Protocol"创建协议
4. 复制分享链接发送给外部人员

### 外部人员提交日志
1. 外部人员通过分享链接访问：`http://localhost:5000/protocol/{shareLink}`
2. 填写 JSON 格式的测试数据，例如：
   ```json
   {
     "testId": "001",
     "result": "passed",
     "duration": 120,
     "notes": "All tests passed successfully"
   }
   ```
3. 点击"Submit Log"提交

### 查看数据
管理员可以在仪表盘中查看：
- **Surveys**：所有问卷数据
- **Protocols**：所有测试协议及其分享链接
- **Logs**：所有提交的测试日志

## 权限规则

- **普通用户**：只能浏览品牌内容，无法访问管理功能
- **非管理员登录**：即使登录成功，也会提示"无管理员权限"
- **管理员**：可以查看和管理所有数据

## 默认测试账户

为了方便测试，可以使用以下账户（请先创建）：
- 邮箱：`admin@example.com`
- 密码：`admin123`

## 技术栈

- **前端**：Next.js 16 (App Router) + React 19 + TypeScript
- **UI**：Tailwind CSS 4 + shadcn/ui
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL + Drizzle ORM
- **认证**：JWT

## 文件结构

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx             # 首页
│   ├── collection/          # 产品页
│   ├── account/             # 账户页
│   ├── admin/               # 管理员页面
│   │   ├── login/           # 登录页
│   │   └── page.tsx         # 仪表盘
│   ├── protocol/            # 协议提交页
│   │   └── [shareLink]/
│   └── api/                 # API 路由
│       ├── admin/           # 管理员 API
│       │   ├── login/       # 登录
│       │   ├── me/          # 获取当前用户
│       │   ├── init/        # 初始化管理员
│       │   ├── surveys/     # 问卷数据
│       │   ├── protocols/   # 协议管理
│       │   └── logs/        # 日志查看
│       └── public/          # 公开 API
│           └── submit-log/  # 提交日志
├── components/              # React 组件
│   ├── AdminEntryButton.tsx # 管理员入口按钮
│   └── ui/                  # shadcn/ui 组件
├── lib/                     # 工具函数
│   └── auth.ts              # 认证工具
└── storage/                 # 数据存储
    └── database/            # 数据库相关
        ├── shared/
        │   └── schema.ts    # 数据库模型
        ├── userManager.ts
        ├── surveyManager.ts
        ├── protocolManager.ts
        └── logManager.ts
```

## 安全注意事项

1. 生产环境必须更改 `JWT_SECRET` 环境变量
2. 管理员密码应使用强密码（至少 12 位，包含大小写字母、数字和特殊字符）
3. 建议定期备份数据库
4. 删除 `/api/admin/init` 端点（生产环境不应保留）
5. 考虑添加 IP 白名单或两步验证
