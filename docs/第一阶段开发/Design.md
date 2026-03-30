# ReadFlow MVP（ODPM - Design）
> 目标文件: `Design.md`
> 版本: v1.0-draft-02
> 日期: 2026-03-17
> 状态: Proposed（待用户 Check）
> 文档目标: 把 `Orient` 冻结的 ReadFlow MVP 目标翻译为可实施、可验证、可回滚的技术蓝图。
> 上游依据: `产品需求.md`、`Orient.md`、`docs/ODPM-skill/odpm-authoring/SKILL.md`、`docs/ODPM-skill/odpm-authoring/references/authoring-spec.md`
> 采用优先级: `产品需求.md` + `Orient.md` > ODPM 编写规范 > 当前仓库现实 > 旧版 `Design.md`

---

## 0. 文档标准

### 0.1 本文负责什么

1. 给出 ReadFlow MVP 的工程基线、目录落位、模块边界和关键状态机。
2. 定义导入、解析、阅读、翻译、标注、恢复、离线与错误反馈的实现蓝图。
3. 定义 MVP 的本地数据模型、服务接口、测试与 Gate。
4. 给出后续 `Plan` 必须照此拆解的实施路径。

### 0.2 本文不负责什么

1. 不直接把任务拆到 `Task` 级执行清单。
2. 不输出最终代码实现或具体页面视觉稿。
3. 不绑定某个翻译供应商的商业合同与密钥分发方式。
4. 不替代用户对 `Design` 的正式 Check。

### 0.3 当前前提校核

1. 当前仓库没有任何工程代码，本设计必须从 0→1 建立可运行基线。
2. 本设计对象是完整 ReadFlow MVP，不是旧版文档中假定存在的“文档状态管理中台”。
3. 本设计不能再引用不存在的 `src/store/*` 作为前提，而必须定义真实的工程落位。

---

## 1. 核心开发结论

1. 工程形态冻结为单仓 Web/PWA 应用。
2. 前端技术基线冻结为 `Vue 3 + TypeScript + Vite + Pinia + Vue Router`。
3. PDF 能力冻结为浏览器端文本型 PDF 解析与渲染，采用 `pdf.js` 类能力接入。
4. 本地持久化冻结为 `IndexedDB` 主存储 + Service Worker 资源缓存。
5. 翻译能力冻结为 Provider 适配层，不把供应商细节直接耦合到 UI 与状态逻辑。
6. 测试基线冻结为 `Vitest` 单元测试 + `Playwright` 关键闭环 E2E。
7. 目录与模块边界按产品域拆分，避免重新演化为单一大 store。

---

## 2. 本轮写作 TodoList（已执行）

1. 回读 `Orient.md`，提取不可回退冻结点。
2. 盘点仓库现实，确认设计对象是从零搭建而非存量重构。
3. 按产品主链重组技术主题，覆盖导入、解析、阅读、翻译、标注、恢复、离线和测试。
4. 为工程骨架、模块边界、状态机、数据模型和 Gate 输出可执行蓝图。
5. 回归检查是否完整承接 `产品需求.md` 与 `Orient.md`。

---

## 3. 环境矩阵与模式矩阵

### 3.1 环境矩阵

| 环境 | 用途 | 翻译 Provider | 数据来源 | 备注 |
|---|---|---|---|---|
| Local Dev | 本地开发与调试 | Mock / Stub 优先 | 本地样例 PDF + IndexedDB | 不依赖真实后端即可跑通主链 |
| Local QA | 本地联调与回归 | Real Provider 可切换 | 本地导入 PDF | 用于验证真实翻译与降级 |
| Staging | 集成验收 | Real Provider | 浏览器真实数据 | 用于体验与验收 |
| Production | 正式交付 | Real Provider + Cache Fallback | 用户本地数据 | 需保证恢复与离线基本可用 |

### 3.2 模式矩阵

| 维度 | 模式 | 说明 |
|---|---|---|
| 阅读模式 | 原文 / 译文 / 双语 | 对同一段落的不同展示方式 |
| 网络模式 | online / degraded / offline-only | 决定翻译是否走实时请求或只走缓存 |
| 文档状态 | idle / importing / parsing / ready / error | 导入到可读的主链状态 |
| 恢复状态 | idle / restoring / restored / failed | 会话恢复链路 |
| 缓存状态 | idle / packing / ready / failed | 离线包准备链路 |

### 3.3 依赖矩阵

| 类别 | 依赖 | 作用 | 是否可替换 |
|---|---|---|---|
| 前端框架 | Vue 3 | 页面与组件组织 | 否，本版冻结 |
| 构建工具 | Vite | 开发、构建、PWA 接入 | 否，本版冻结 |
| 路由 | Vue Router | 页面路由与入口切换 | 否，本版冻结 |
| 状态管理 | Pinia | 跨页面状态与会话 | 否，本版冻结 |
| PDF 解析 | PDF.js 类能力 | PDF 渲染、文本提取 | 是，可在接口下替换 |
| 本地存储 | IndexedDB | 文档、会话、标注、缓存 | 否，能力层冻结 |
| 资源缓存 | Service Worker / PWA 插件 | Shell 离线与资源缓存 | 是，实现库可替换 |
| 单测 | Vitest | 逻辑与组件单测 | 否，本版冻结 |
| E2E | Playwright | 主链验收 | 否，本版冻结 |

---

## 4. 工作区与代码落位设计

### 4.1 仓库目标结构

```text
docs/
public/
  samples/
src/
  app/
  router/
  pages/
  components/
  features/
    library/
    reader/
    translation/
    annotations/
    session/
    offline/
  services/
    pdf/
    translation/
    storage/
    logging/
  stores/
  workers/
  types/
  utils/
tests/
  unit/
  e2e/
```

### 4.2 工作区原则

1. `features/` 负责产品域，不直接互相跨层读写内部实现。
2. `services/` 负责外部能力与底层资源访问。
3. `stores/` 只持有可共享状态，不吞并所有业务逻辑。
4. `workers/` 负责重计算与长耗时任务，如 PDF 文本提取。
5. `tests/` 覆盖单测与主链 E2E，不把验证散落在临时脚本中。

---

## 5. 分层设计与职责边界

### 5.1 总体分层

```text
UI Pages / Components
  -> Feature Facades
    -> Stores
      -> Domain Services
        -> Storage / PDF / Translation / PWA Adapters
```

### 5.2 模块职责表

| 模块 | 负责什么 | 不负责什么 |
|---|---|---|
| `library` | 文档导入、列表、切换、删除 | PDF 具体解析算法 |
| `reader` | 阅读上下文、段落展示、模式切换、可见范围 | 翻译 Provider 细节 |
| `translation` | 翻译队列、缓存、目标语言、降级 | 页面滚动与 UI 状态 |
| `annotations` | 高亮、标签、跳转索引 | 文档导入和翻译调度 |
| `session` | 阅读会话保存与恢复 | 资源缓存和 Service Worker 实现 |
| `offline` | 离线包、覆盖率、资源缓存状态 | 高亮和标签业务规则 |
| `services/pdf` | PDF 读取、文本提取、段落/锚点生成 | UI 展示逻辑 |
| `services/storage` | IndexedDB 仓储、序列化 | 业务域决策 |

### 5.3 Store 划分

| Store | 主职责 |
|---|---|
| `appStore` | 全局应用状态、网络状态、初始化结果 |
| `libraryStore` | 文档列表、当前文档元信息、导入/删除状态 |
| `readerStore` | 当前文档上下文、段落集、Unit、阅读模式、可见范围 |
| `translationStore` | 翻译队列、翻译缓存、目标语言、服务健康状态 |
| `annotationStore` | 高亮、标签、过滤与跳转索引 |
| `sessionStore` | 会话快照、恢复顺序与降级状态 |
| `offlineStore` | 离线包、覆盖率、资源缓存进度 |

### 5.4 分层纪律

1. `libraryStore` 不直接维护翻译队列。
2. `readerStore` 不直接操作 IndexedDB 表细节。
3. `translationStore` 不直接决定页面滚动锚点。
4. `annotationStore` 不反向控制文档主状态。
5. 所有持久化写入经 `services/storage` 统一封装。

---

## 6. 启动脚本、调试策略、CI 与回滚纪律

### 6.1 启动与构建脚本基线

| 脚本 | 目的 |
|---|---|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建 |
| `npm run preview` | 本地预览 |
| `npm run test:unit` | 单元测试 |
| `npm run test:e2e` | E2E 验收 |
| `npm run lint` | 静态检查 |

### 6.2 调试策略

1. 提供样例 PDF 以支撑本地无后端验证。
2. 翻译 Provider 必须提供 Mock 实现，保证无真实接口也能走通主链。
3. 对导入、解析、翻译、恢复、缓存等关键节点输出结构化日志。

### 6.3 CI 最低要求

1. 代码提交后至少跑 `lint + test:unit`。
2. 主分支合并前至少跑一次关键闭环 `test:e2e`。
3. 文档改动涉及 Design/Plan 时，需同步检查引用一致性。

### 6.4 回滚纪律

1. 出现重大问题时优先回滚到最近可运行的主链版本。
2. Provider 接入、PWA、离线包等高风险能力应具备开关或降级通道。
3. 不允许通过直接删除缓存或关闭恢复逻辑来掩盖问题。

---

## 7. 核心接口与服务设计

### 7.1 服务接口总表

| 接口 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `PdfImportService.import(file)` | PDF 文件 | `DocumentRecord` | 校验并创建文档记录 |
| `PdfParseService.parse(doc)` | 文档记录 | `ParagraphRecord[] + UnitRecord[]` | 抽取文本并生成段落锚点 |
| `TranslationProvider.translate(batch)` | 段落或句子批次 | `TranslationRecord[]` | 真实或 Mock 翻译 |
| `SessionService.save(snapshot)` | 会话快照 | `void` | 写入本地持久化 |
| `SessionService.restore()` | 无 | `ReaderSessionSnapshot?` | 读取上次会话 |
| `OfflinePackService.pack(docId)` | 文档 ID | `OfflinePackageRecord` | 生成离线包与覆盖率 |
| `StorageRepository.*` | 领域对象 | 领域对象 | 文档、段落、翻译、标注等仓储 |

### 7.2 Provider 边界

1. UI 只能调用 `translationStore`，不能直接调用具体翻译服务。
2. `translationStore` 只能依赖 `TranslationProvider` 抽象接口。
3. Mock 与 Real Provider 的切换必须是显式配置，而不是散布条件分支。

### 7.3 PDF 解析边界

1. 文本提取与段落切分归 `services/pdf`。
2. 阅读器只消费段落结构，不自行重新拆分 PDF 原始对象。
3. 锚点必须至少包含 `docId + paragraphId + pageIndex + order`。

---

## 8. 数据与字段设计

### 8.1 DocumentRecord

| 字段 | 说明 |
|---|---|
| `docId` | 文档唯一 ID |
| `fileName` | 原始文件名 |
| `fileSize` | 文件大小 |
| `pageCount` | 页数 |
| `sourceStatus` | 导入状态 |
| `parseStatus` | 解析状态 |
| `createdAt` | 导入时间 |
| `updatedAt` | 最近更新时间 |

### 8.2 ParagraphRecord

| 字段 | 说明 |
|---|---|
| `paragraphId` | 段落 ID |
| `docId` | 所属文档 |
| `unitId` | 所属阅读单元 |
| `pageIndex` | 来源页码 |
| `order` | 全局顺序 |
| `text` | 原文文本 |
| `anchor` | 稳定锚点 |
| `sentenceIds` | 句子索引 |

### 8.3 UnitRecord

| 字段 | 说明 |
|---|---|
| `unitId` | 阅读单元 ID |
| `docId` | 所属文档 |
| `label` | 单元名称 |
| `startParagraphId` | 起始段落 |
| `endParagraphId` | 结束段落 |
| `order` | 单元顺序 |

### 8.4 TranslationRecord

| 字段 | 说明 |
|---|---|
| `translationId` | 翻译 ID |
| `docId` | 所属文档 |
| `targetId` | 段落或句子 ID |
| `targetType` | `paragraph` / `sentence` |
| `targetLanguage` | 目标语言 |
| `content` | 译文 |
| `provider` | 来源 Provider |
| `status` | 翻译状态 |
| `updatedAt` | 更新时间 |

### 8.5 HighlightRecord

| 字段 | 说明 |
|---|---|
| `highlightId` | 高亮 ID |
| `docId` | 所属文档 |
| `paragraphId` | 主锚点段落 |
| `sentenceId` | 可选句子锚点 |
| `quote` | 原文快照 |
| `translationSnapshot` | 译文快照 |
| `color` | 高亮颜色 |
| `tagIds` | 标签集合 |
| `createdAt` | 创建时间 |

### 8.6 TagRecord

| 字段 | 说明 |
|---|---|
| `tagId` | 标签 ID |
| `docId` | 所属文档 |
| `name` | 标签名 |
| `sortOrder` | 展示顺序 |
| `createdAt` | 创建时间 |
| `updatedAt` | 更新时间 |

### 8.7 ReaderSessionSnapshot

| 字段 | 说明 |
|---|---|
| `docId` | 当前文档 |
| `unitId` | 当前单元 |
| `anchorParagraphId` | 当前锚点 |
| `readingMode` | 阅读模式 |
| `targetLanguage` | 目标语言 |
| `scrollOffset` | 可选滚动偏移 |
| `updatedAt` | 更新时间 |

### 8.8 OfflinePackageRecord

| 字段 | 说明 |
|---|---|
| `docId` | 文档 ID |
| `paragraphCoverage` | 段落缓存覆盖率 |
| `translationCoverage` | 翻译缓存覆盖率 |
| `annotationCoverage` | 标注覆盖率 |
| `offlineReadable` | 是否满足离线可读 |
| `updatedAt` | 更新时间 |

---

## 9. 状态机与控制流设计

### 9.1 导入与解析状态机

```text
idle
  -> importing
  -> imported
  -> parsing
  -> ready
  -> error
```

规则：

1. `importing` 只负责文件校验与文档记录创建。
2. `parsing` 只负责文本提取、段落切分、Unit 建模。
3. 只有段落与锚点落库成功后，文档才能进入 `ready`。

### 9.2 翻译队列状态机

```text
queued
  -> running
  -> success
  -> failed
  -> retrying
```

规则：

1. 当前可见段落优先。
2. 用户主动点击的句子翻译可插队。
3. `offline-only` 模式下只读缓存，不派发真实请求。

### 9.3 恢复状态机

```text
idle
  -> restoring
  -> restored
  -> failed
```

固定恢复顺序：

1. 恢复上次文档。
2. 恢复段落与 Unit。
3. 恢复锚点与模式。
4. 恢复标注。
5. 锚点失效时降级到最近可读段落。

### 9.4 离线包状态机

```text
idle
  -> packing
  -> ready
  -> failed
```

规则：

1. 离线包至少包含文档元数据、段落原文、可用译文、标注与会话。
2. 打包失败不能破坏在线阅读主链。
3. 覆盖率必须支持重算。

---

## 10. 各业务域实现设计

### 10.1 文档库与导入

1. 用户从本地导入 PDF。
2. 系统完成文件类型校验、文档记录创建、文档列表更新。
3. 导入后自动进入解析。
4. 删除文档时同步删除本地段落、翻译、标注、会话和离线包。

### 10.2 PDF 解析与段落建模

1. 解析输出必须是段落级主结构。
2. 每个段落必须具备稳定顺序、页码和锚点。
3. Unit 作为阅读组织层，可按页、章节或分片策略生成。
4. 无法解析的页面需记录失败并可在 UI 上提示降级。

### 10.3 阅读器与模式切换

1. 阅读器支持原文、译文、双语模式切换。
2. 模式切换不能破坏当前锚点。
3. 阅读器只消费 `readerStore` 的派生状态，不直接拼装底层仓储对象。
4. 长文档默认采用窗口化或分页化渲染策略，避免一次性全量渲染。

### 10.4 翻译链路

1. 段落翻译是 MVP 主能力。
2. 句子级翻译在 UI 上作为按需增强，不替代段落主翻译。
3. 缓存键至少由 `docId + targetType + targetId + targetLanguage` 组成。
4. 翻译失败时保留原文阅读并暴露重试入口。

### 10.5 标注链路

1. 高亮默认锚定段落，可附加句子粒度。
2. 高亮创建时同步保存原文快照与当前可用译文快照。
3. 标签只服务于高亮分类、过滤和跳转，不主导阅读器状态。

### 10.6 会话恢复

1. 页面重开优先恢复最后打开文档与锚点。
2. 文档存在但锚点失效时，降级到同 Unit 首个可读段落。
3. 文档不存在时，降级到文档列表页，不进入错误死循环。

### 10.7 离线能力

1. PWA 负责缓存应用壳资源。
2. IndexedDB 负责缓存用户文档数据与已解析内容。
3. 离线状态至少能读取已缓存原文、译文、标注和上次会话。
4. 对未缓存内容必须明确提示“未缓存，不可离线读取”。

### 10.8 错误与诊断

1. 导入、解析、翻译、恢复、缓存错误都要有结构化状态。
2. 每类错误至少提供提示、重试或降级路径三者之一。
3. 关键日志必须覆盖主链节点和失败原因。

---

## 11. 分阶段执行路径

| 阶段 | 目标 |
|---|---|
| Phase 1 | 建立工程脚手架、目录、测试和样例环境 |
| Phase 2 | 打通文档导入、解析、文档库主链 |
| Phase 3 | 打通阅读器主链与三种阅读模式 |
| Phase 4 | 打通翻译 Provider、缓存与降级 |
| Phase 5 | 打通高亮、标签与重点回看 |
| Phase 6 | 打通会话恢复与离线包 |
| Phase 7 | 打通日志、错误反馈、E2E 验收和文档回写 |

---

## 12. Gate 与统一完成定义

### Gate A: 工程基线可运行

通过条件：

1. 仓库具备可运行前端工程。
2. 样例 PDF 可本地导入并进入页面。
3. `lint + unit test` 可执行。

### Gate B: 导入与阅读主链可用

通过条件：

1. 文档可导入、解析并进入阅读器。
2. 段落结构和锚点稳定生成。
3. 三种阅读模式切换可用。

### Gate C: 翻译与标注主链可用

通过条件：

1. 段落翻译可执行并有缓存。
2. 高亮和标签可创建、删除、跳转。
3. 翻译失败不阻塞阅读。

### Gate D: 恢复与离线主链可用

通过条件：

1. 刷新或重开后可恢复上次阅读位置。
2. 已缓存内容可离线继续阅读。
3. 离线不可读内容有明确提示。

### Gate E: 验收与回写完成

通过条件：

1. 关键单测与 E2E 通过。
2. 风险、限制、已知问题已文档回写。
3. `Plan` 对应任务可凭证据勾选。

### 统一完成定义

一个模块只有同时满足以下条件才算完成：

1. 正式产物已存在。
2. 验证证据存在。
3. 相关文档和计划已回写。
4. 没有遗留会破坏下一 Gate 的显著缺口。

---

## 13. 风险与回滚

| 风险 | 影响 | 对策 |
|---|---|---|
| PDF 文本提取质量不稳定 | 段落结构错乱 | 第一阶段只承诺文本型 PDF，解析层保留失败提示与样例回归 |
| 翻译 Provider 不稳定 | 译文不可用 | Provider 抽象 + 本地缓存 + offline-only 降级 |
| 离线链路过重 | 首版复杂度失控 | PWA 只缓存应用壳，文档内容由 IndexedDB 管理 |
| 模块边界失控 | 后续维护困难 | 按产品域拆分 feature/store/service |
| 没有测试即进入执行 | 交付质量不可控 | 从脚手架阶段就冻结测试与 Gate |

回滚原则：

1. 优先回滚到上一个通过 Gate 的版本。
2. 不通过删除功能来掩盖主链失败。
3. 离线和翻译高风险能力应优先使用开关或 Mock 降级。

---

## 14. 对 `Plan` 的接口

### 14.1 `Plan` 必须承接

1. 工程脚手架与目录落位任务化。
2. PDF 导入、解析、阅读器主链任务化。
3. 翻译 Provider、缓存、降级任务化。
4. 高亮、标签、恢复、离线任务化。
5. 测试、日志、文档回写、Gate 验收任务化。

### 14.2 `Plan` 不得变更

1. 单仓 Web/PWA 交付形态。
2. `Vue 3 + TypeScript + Vite + Pinia + Vue Router` 技术基线。
3. 段落主粒度、句子增强粒度。
4. IndexedDB 本地优先持久化策略。
5. Provider 适配接入翻译的边界。
6. 恢复与离线作为 MVP 主链能力。

---

## 15. 回归检查

### 15.1 对 `Orient` 的回归

1. 已承接 docs-only、0→1、Web/PWA、本地优先等冻结点。
2. 已承接完整 MVP 主链，而非局部 store 重构。
3. 已承接离线、恢复、错误反馈的主链定位。

### 15.2 对产品需求的回归

1. 已覆盖导入、解析、阅读、翻译、标注、恢复、离线与错误反馈。
2. 已保留段落主粒度与多阅读模式。
3. 已保持账号、云同步、OCR、TTS、AI 扩展为非目标。

---

## 16. 用户 Check 摘要

在进入 `Plan` 前，建议用户重点确认：

1. 是否接受当前冻结的技术基线和单仓 Web/PWA 路线。
2. 是否接受基于 Provider 适配层接入翻译服务。
3. 是否接受第一阶段只对文本型 PDF 给出稳定承诺。
4. 是否接受当前模块拆分、Gate 和统一完成定义。

---

## 17. 结论

1. 本轮 `Design` 已把 ReadFlow MVP 从产品目标翻译成可落地的工程蓝图。
2. 当前蓝图覆盖了工程基线、模块分层、数据模型、状态机、离线策略、测试与 Gate。
3. 后续 `Plan` 应只负责按该蓝图拆任务，不再回头重新发明技术路径。
4. 当前文档已具备进入 `Plan` 草案阶段的条件，但正式进入下一阶段前仍需用户 Check。

---

*— End of Design Document —*
