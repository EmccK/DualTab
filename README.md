# MonkNow Clone

一个基于 React + TypeScript + Vite 的 Chrome 新标签页扩展，复刻 MonkNow 的功能。

## 功能

- 网站书签管理（添加、编辑、删除）
- 分组管理（添加、编辑、删除自定义分组）
- 多搜索引擎支持（Google、Baidu、Bing、DuckDuckGo）
- 主题切换（深色/浅色）
- 壁纸设置（官方、本地上传、纯色）
- 实时时钟显示
- 数据本地存储
- 用户登录/注册（使用 MonkNow API）
- 云端数据同步（登录后自动从服务器恢复书签）
- 推荐书签列表（从 MonkNow API 获取热门网站）

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建后在 Chrome 扩展管理页面加载 `dist` 目录即可使用。

## MonkNow API

- **API Base**: `https://dynamic-api.monknow.com`
- **登录**: `POST /user/login` - 返回用户信息和 secret token
- **注册**: `POST /user/register` - 需要验证码
- **获取数据**: `GET /user/data/info?type={type}` - 获取服务器备份数据
  - type: icons | common | background | searcher | sidebar | todos | standby
- **推荐书签**: `GET /icon/list?cate_id={id}&keyword=&size={n}` - 获取推荐书签列表
  - 分类 ID: hot=24, shopping=9, social=10, entertainment=26, news=11, efficiency=14, builtin=25, image=15, lifestyle=16, travel=17, tech=18, finance=19

## 注意事项

- 登录后会自动从服务器恢复书签数据
- 数据保存在本地 localStorage/chrome.storage.local
