# Parser API 設計仕様 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象: Markdown ↔ Domain Model 変換モジュール

## 1. Overview

Parser モジュールは以下を実現する。

1. MarkdownParser: Markdown テキスト → Board ドメインモデル
2. KanbanWriter: Board ドメインモデル → Markdown テキスト
3. Reversibility: コメント、空行、未知の Frontmatter を保持する

## 2. Result Type

```typescript
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseError };

interface ParseError {
  code: 'INVALID_FRONTMATTER' | 'INVALID_SECTION' | 'INVALID_CARD' | 'UNKNOWN_ERROR';
  message: string;
  line?: number;
  column?: number;
}
```

## 3. Parser Responsibilities

### 3.1 MarkdownParser

- Frontmatter を抽出する。
- ToDo / Doing / Done のセクションを分割する。
- 各カードのタイトル、完了状態、ID、ラベル、期限を抽出する。
- Board を構築する。

### 3.2 KanbanWriter

- 元の Markdown 構造をできるだけ保持する。
- 更新対象のカードと列のみを書き換える。
- コメント、空白、未知キーを維持する。

## 4. Parse Context

```typescript
interface ParseContext {
  lines: string[];
  frontmatterStart: number;
  frontmatterEnd: number;
  sections: Map<string, SectionContext>;
}

interface SectionContext {
  name: 'ToDo' | 'Doing' | 'Done';
  startLine: number;
  endLine: number;
  cards: CardContext[];
}
```

## 5. Card Syntax

```markdown
- [ ] Task title here
  ID: task-1
  Label: feature,urgent
  Due: 2026-07-30
```

## 6. Writer Strategy

- original content を入力できるようにする。
- line range を利用して最小差分で更新する。
- 変更が大きい場合のみセクション単位で再構築する。

## 7. Error Handling

- 不正 Frontmatter は INVALID_FRONTMATTER。
- セクション不足や重複は INVALID_SECTION。
- カード形式不正は INVALID_CARD。
- 予期しない失敗は UNKNOWN_ERROR。

## 8. Testing Focus

- round-trip 可逆性。
- unknown frontmatter の保持。
- comment / blank line の保持。
- invalid input のエラーコード確認。
