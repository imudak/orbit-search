# MUSUBI - Orbit Search

AI時代の情報収集・整理プラットフォーム

## Initialized with MUSUBI SDD for Claude Code

This project uses **MUSUBI** (Ultimate Specification Driven Development) with 8 skill groups.

### Available Skills

Check `.claude/skills/` directory for all installed skills.

### Commands

- `/sdd-steering` - Generate/update project memory
- `/sdd-requirements <feature>` - Create EARS requirements
- `/sdd-design <feature>` - Generate C4 + ADR design
- `/sdd-tasks <feature>` - Break down into tasks
- `/sdd-implement <feature>` - Execute implementation
- `/sdd-validate <feature>` - Validate constitutional compliance

### Project Memory

- `steering/structure.md` - Architecture patterns
- `steering/tech.md` - Technology stack
- `steering/product.md` - Product context
- `steering/rules/constitution.md` - 9 Constitutional Articles

### Learn More

- [MUSUBI Documentation](https://github.com/nahisaho/MUSUBI)
- [Constitutional Governance](steering/rules/constitution.md)
- [8-Stage SDD Workflow](steering/rules/workflow.md)

---

**Agent**: Claude Code
**Initialized**: 2026-02-15
**MUSUBI Version**: 0.1.0

## 作業プロトコル

作業開始・終了時は `~/projects/flow-manager/docs/flows/work-protocol.md` を参照。

百式page_id: 3071aeb6-4b1d-81c5-b9cb-f70fbac4d15f

## Git Push ルール

作業完了時は必ず `jj git push` を実行すること。
- MUSUBIの各ステップ完了時
- 機能実装完了時
- steering files 更新時
