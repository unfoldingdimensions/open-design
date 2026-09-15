# 发布 OpenDesign 插件

OpenDesign registry v1 复用 GitHub 作为后端。CLI 是 canonical workflow；
产品 UI 和 agent 创建流程只是包装这些命令。

## 1. 创建

```bash
capt plugin scaffold --id vendor/plugin-name --title "Plugin name" --out ./plugins/community
```

公开 registry ID 必须是 `vendor/plugin-name`。生成的 `open-design.json`
需要包含 `plugin.repo`，指向插件的源码仓库或源码子目录。

## 2. 校验和打包

```bash
capt plugin validate ./plugins/community/plugin-name
capt plugin pack ./plugins/community/plugin-name --out ./dist
```

registry 接受任何能通过 validate 和 pack 的插件。源码仓库不需要特殊结构，
只需要 `SKILL.md` 和 `open-design.json`。

## 3. 登录

```bash
capt plugin login
capt plugin whoami --json
```

这两个命令包装 GitHub CLI。token 留在 `gh`，OpenDesign 不保存 GitHub
凭据。

## 4. 发布

```bash
capt plugin publish vendor/plugin-name --to open-design --repo https://github.com/vendor/plugin-name
```

v1 会打开 GitHub registry review flow。发布 payload 包含插件 ID、版本、
源码仓库、能力摘要、包 digest 和 registry entry path。合并之后，CI 重新生成
`open-design-marketplace.json`。

## 5. 从 registry 安装

```bash
capt marketplace refresh official
capt plugin install vendor/plugin-name
capt plugin info vendor/plugin-name --json
```

安装记录会保留 marketplace provenance、resolved source、manifest digest 和
archive integrity。`official` / `trusted` 来源默认安装为 trusted；`restricted`
来源仍然保持 restricted，直到用户主动授权。

## 6. Yank 版本

```bash
capt plugin yank vendor/plugin-name@1.0.0 --reason "Security issue"
```

Yank 不删除元数据和包。新安装会拒绝 yanked version；已经存在的精确 lockfile
重放可以在 integrity 匹配且 archive 仍可访问时带警告继续。
