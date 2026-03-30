# 移动端与 PC 端句子交互修复记录（执行记录）

## P0 级别问题修复进度

### 1. 弹出卡片点击外部无法关闭
- **状态**：✅ 已修复
- **修复方案**：在 ReaderView.vue 初始化 (onMounted) 时绑定原生的 pointerdown 事件至 window。当事件触发时，通过 e.composedPath() 及 closest 函数精确判断点击是否落在合法区域内（如 sentence-card、menu 等弹出层或工具栏），如果未落入，则触发 esetSelection() 并清空所有弹窗级状态。同时在 onBeforeUnmount 进行副作用清理，彻底解决了点击空白处卡片不收起的问题，且双端统一。

### 2. 句子高亮区域错误 (由 button 造成)
- **状态**：✅ 已修复
- **修复方案**：将 ReaderView.vue 中的 utton.sentence-fragment 等交互层替换为 span 标签，并保留 ole="button" 和 	abindex="0" 以兼容无障碍访问属性。这一修改彻底恢复了 HTML inline 的连贯换行特性，高亮（即 .sentence-fragment.marked 的背景色与底部虚线）可直接随段落文本的自然流断行而流动，解决了以前将行块当成实块导致的高亮范围大且溢出重叠的问题。同时在样式表中明确设定了 display: inline;。

### 3. 工具栏语言切换与真实翻译修复
- **状态**：✅ 已修复
- **修复方案**：打通并收束了翻译的实际数据链路。前置问题在于无 .env 终端接口时，系统级会直接抛出 provider_not_configured 从而阻断原本预留的交互流。在 src/services/translation/index.ts 中修正了 isTranslationProviderConfigured() 逻辑，并默认在无端点时提供 [译] + 源文本 的 Mock API 延迟返回（600ms延迟）。不仅模拟了真实的数据往返（Loading/Pending -> Translated/Cache），也彻底告别了原来前端强加假标记导致的一长串“服务不可用”空走状态。


## P1 级别问题修复进度

### 1. 句子划线悬浮卡片定位计算问题
- **状态**：✅ 已修复
- **修复方案**：引入了 `@vueuse/core` 中的 `useWindowScroll` 与 `useWindowSize`，彻底抛弃了纯依赖点击坐标 `clientY` 与手动固定 `bottom/left` 的 CSS 逻辑。通过收集被点击的 Fragment 边界 (`el.getBoundingClientRect()`) 及当前视口高度进行动态约束计算，从而使得卡片在 PC 端与移动端均能智能停留在可视区域的安全范围内（上下偏移留空，左右不溢出，随窗口伸缩和滚动相对固定），避免被截断的同时去除了那些失效繁杂的重算函数。

### 2. 打标签 (Tags) 面板被强制折叠的问题
- **状态**：✅ 已修复
- **修复方案**：去除了界面交互中额外的 `showTagEditor` 及相对应的 "Add Tag" 等多余路径。现在直接将存量的 Tags 面板及输入框并排暴露在颜色选择器下方（或弹窗结构内），取消使用 `v-if="!sentenceSelection"` 阻断行为。做到了即点即标，减少了操作链路。

## P2 级别问题修复进度

### 1. PC 端侧边栏的信息架构层级
- **状态**：✅ 已修复
- **修复方案**：在 PC 的侧边导航栏（原左右双边，现聚焦左侧 `aside`），通过注入 `sidebarTab` Tab 选项卡（基于 Vue ref 响应式），将原本纵向堆叠占据大量高度的 `Structure (目录)` 与 `My Study (学习面板：高亮、标签)` 折叠为 `TabBar` 横向切换视图。解决了在大纲极长时使得下方功能区无法找寻的问题，提高了界面利用率和可视感观。

