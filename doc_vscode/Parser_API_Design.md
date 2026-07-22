# Parser API 設計仕様 - Parser Module

**作成日**: 2026-07-03  
**対象**: `src/parser/` モジュール  
**目的**: Markdown ↔ Domain Model 変換の API 定義

---

## 1. Overview

Parser モジュールは以下を実現する：

1. **MarkdownParser**: Markdown テキスト → Board ドメインモデル
2. **KanbanWriter**: Board ドメインモデル → Markdown テキスト（可逆性保持）
3. **Reversibility**: 元の Markdown のコメント、空行、不明な YAML キーを保持

---

## 2. Type Definitions

### 2.1 Result Type

すべての Parser メソッドはこの型で返す：

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

**使用例**:
```typescript
const result = parser.parse(content);
if (result.ok) {
  console.log(result.value);  // Board モデル
} else {
  console.error(result.error.message);
}
```

---

### 2.2 Parsing Context（内部用）

Parser 処理中に状態を保持するコンテキスト：

```typescript
interface ParseContext {
  lines: string[];
  frontmatterStart: number;
  frontmatterEnd: number;
  sections: Map<string, SectionContext>;
  metadata: Map<string, unknown>;
}

interface SectionContext {
  name: 'ToDo' | 'Doing' | 'Done';
  startLine: number;
  endLine: number;
  cards: CardContext[];
}

interface CardContext {
  lineStart: number;
  lineEnd: number;
  title: string;
  checked: boolean;
  metadata: Map<string, string>;
  originalText: string;  // 可逆性のため元テキスト保持
}
```

---

## 3. MarkdownParser クラス

### 3.1 Constructor

```typescript
class MarkdownParser {
  constructor(options?: ParserOptions) {
    // options: { strictMode?: boolean; commentPreserve?: boolean; }
  }
}
```

### 3.2 parse() メソッド

```typescript
parse(content: string): Result<Board> {
  // 1. Frontmatter 抽出 & YAML パース
  // 2. セクション分割（## ToDo, ## Doing, ## Done）
  // 3. 各セクションのカード抽出
  // 4. Board モデル構築
  // 5. エラーなら Result.error を返す
  
  /*
   * 処理フロー：
   * content → 行分割 → Frontmatter 抽出 → YAML パース
   *         → セクション検出 → カード抽出 → Board 構築
   */
}
```

**入力**: 
```
Markdown テキスト（string）
```

**出力**:
```typescript
Result<Board>

// Board の構造:
{
  ok: true,
  value: {
    year: 2026,
    week: 27,
    metadata: { created: '2026-07-02', ... },
    columns: [
      { 
        name: 'ToDo',
        cards: [
          {
            id: 'task-1',
            title: 'Task 1',
            completed: false,
            labels: ['feature'],
            dueDate: '2026-07-10',
            lineStart: 10,
            lineEnd: 14
          },
          ...
        ]
      },
      ...
    ]
  }
}
```

### 3.3 parseFrontmatter() - Internal

```typescript
private parseFrontmatter(lines: string[]): Result<Frontmatter> {
  // YAML パース（--- で囲まれた部分）
  // year, week, created などのキーを抽出
  // 不明なキーは保持（可逆性のため）
}

interface Frontmatter {
  year: number;
  week: number;
  created?: string;
  metadata: Record<string, unknown>;  // 不明なキー保持
}
```

**Frontmatter 例**:
```yaml
---
year: 2026
week: 27
created: 2026-07-02
custom_field: custom_value  # ← 不明なキーも保持
---
```

### 3.4 parseCard() - Internal

```typescript
private parseCard(line: string, lineNumber: number): Result<CardContext> {
  // 1. チェックボックス抽出 [ ] or [x]
  // 2. タイトル抽出
  // 3. 以降のメタデータ行をパース
  //    ID: <id>
  //    Label: <label1,label2>
  //    Due: <date>
  //    Description: <text>
  // 4. CardContext 返す
}
```

**カード例**:
```markdown
- [ ] Task title here
  ID: task-1
  Label: feature,urgent
  Due: 2026-07-10
  Description: This is a description
```

**出力**:
```typescript
{
  ok: true,
  value: {
    lineStart: 5,
    lineEnd: 9,
    title: 'Task title here',
    checked: false,
    metadata: {
      'ID': 'task-1',
      'Label': 'feature,urgent',
      'Due': '2026-07-10',
      'Description': 'This is a description'
    },
    originalText: '- [ ] Task title here\n  ID: task-1\n...'
  }
}
```

---

## 4. KanbanWriter クラス

### 4.1 Constructor

```typescript
class KanbanWriter {
  constructor(options?: WriterOptions) {
    // options: { preserveComments?: boolean; preserveWhitespace?: boolean; }
  }
}
```

### 4.2 write() メソッド

```typescript
write(board: Board, originalContent?: string): Result<string> {
  // 1. 元の Markdown 構造を可能な限り保持
  // 2. Board の変更を反映
  // 3. 更新後 Markdown テキストを返す
  
  /*
   * 可逆性の実装：
   * - originalContent が提供されれば、コメント・空行を保持
   * - Line range トラッキングで最小限の変更を適用
   */
}
```

**入力**:
```typescript
board: Board,
originalContent?: string  // 元の Markdown（可逆性のため）
```

**出力**:
```typescript
Result<string>  // 更新後 Markdown テキスト
```

### 4.3 内部実装：Change Detection

```typescript
private detectChanges(
  originalBoard: Board,
  newBoard: Board
): Changeset {
  // 1. 各カラムのカード ID リストを比較
  // 2. 追加/削除/移動を検出
  // 3. 各カードのメタデータ変更を検出
  
  return {
    added: [{ columnName: 'Doing', card: {...} }],
    deleted: [{ columnName: 'ToDo', cardId: 'task-2' }],
    moved: [{ cardId: 'task-1', from: 'ToDo', to: 'Doing' }],
    updated: [{ cardId: 'task-3', changes: { title: 'new title' } }]
  };
}

interface Changeset {
  added: { columnName: string; card: Card }[];
  deleted: { columnName: string; cardId: string }[];
  moved: { cardId: string; from: string; to: string }[];
  updated: { cardId: string; changes: Partial<Card> }[];
}
```

### 4.4 applyChangeset() - Internal

```typescript
private applyChangeset(
  originalLines: string[],
  changeset: Changeset
): Result<string[]> {
  // Changeset を反映した行配列を返す
  // Line range を利用して最小限の変更を適用
}
```

---

## 5. Reversibility Strategy

### 5.1 コメント保持

**例**:
```markdown
## ToDo

- [ ] Task 1
  # 重要なコメント
  # 複数行 OK
  ID: task-1
  Label: feature

- [ ] Task 2
  # このコメントは保持される
  ID: task-2
```

**実装**:
- メタデータ行以外の行（ID:, Label: など）は元テキストに保持
- write() 時に再利用

### 5.2 不明な YAML キー保持

**例**:
```yaml
---
year: 2026
week: 27
custom_field: value  # 不明なキー
---
```

**実装**:
- Frontmatter パース時に不明なキーを metadata に保存
- write() 時に Frontmatter 再生成時に追加

### 5.3 空行・インデント保持

**例**:
```markdown
## ToDo

  # インデント付きコメント
- [ ] Task 1

- [ ] Task 2
```

**実装**:
- 各行のインデント、空行情報を LineInfo に保存
- write() 時に復元

---

## 6. Error Handling

### 6.1 エラーシナリオ

| シナリオ | エラーコード | 対応 |
|---------|-------------|------|
| YAML パース失敗 | `INVALID_FRONTMATTER` | parse() で error 返す |
| セクションヘッダ不正 | `INVALID_SECTION` | セクション無視、警告 log |
| カード形式不正 | `INVALID_CARD` | カード無視、警告 log |
| ファイル文字コード不正 | `UNKNOWN_ERROR` | parse() で error 返す |

### 6.2 エラー返却例

```typescript
const result = parser.parse(malformedContent);
if (!result.ok) {
  console.error(
    `Parse error at line ${result.error.line}: ${result.error.message}`
  );
  // → "Parse error at line 3: Invalid YAML in Frontmatter"
}
```

---

## 7. Performance Constraints

| 操作 | Target | 測定方法 |
|------|--------|--------|
| parse(10MB) | < 1 sec | Unit test で計測 |
| write(Board) | < 500ms | Integration test で計測 |
| applyChangeset() | < 200ms | Unit test で計測 |

**最適化**:
- Line range トラッキングで全体 re-parse を回避
- RegExp compile キャッシング
- Lazy evaluation 活用

---

## 8. Usage Examples

### 8.1 基本的な解析フロー

```typescript
import { MarkdownParser } from './parser/markdownParser';

const parser = new MarkdownParser();
const fileContent = fs.readFileSync('weekly-2026-W27.md', 'utf8');

const result = parser.parse(fileContent);
if (result.ok) {
  const board = result.value;
  console.log(`Week ${board.week} has ${board.columns[0].cards.length} ToDo cards`);
} else {
  console.error(`Failed to parse: ${result.error.message}`);
}
```

### 8.2 双方向同期フロー

```typescript
import { MarkdownParser } from './parser/markdownParser';
import { KanbanWriter } from './parser/kanbanWriter';

// 1. Markdown → Board
const parser = new MarkdownParser();
const result1 = parser.parse(originalMarkdown);
let board = result1.value;

// 2. Kanban で編集（ユーザー操作）
board.columns[0].cards[0].title = 'Updated Title';
board.columns[0].cards[0].done = true;

// 3. Board → Markdown（可逆性を保持）
const writer = new KanbanWriter();
const result2 = writer.write(board, originalMarkdown);
const updatedMarkdown = result2.value;

// 4. ファイルへ書き込み
fs.writeFileSync('weekly-2026-W27.md', updatedMarkdown);
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test File**: `src/test/parser.test.ts`

```typescript
describe('MarkdownParser', () => {
  it('should parse valid Markdown with Frontmatter', () => {
    // Given: Valid Markdown content
    const content = `---\nyear: 2026\nweek: 27\n---\n## ToDo\n...`;
    
    // When: Parse
    const result = parser.parse(content);
    
    // Then: Board returned
    expect(result.ok).toBe(true);
    expect(result.value.week).toBe(27);
  });

  it('should preserve comments on write', () => {
    // Reversibility test
    const original = `---\n...\n## ToDo\n- [ ] Task\n  # Important\n  ID: 1`;
    const board = parser.parse(original).value;
    const updated = writer.write(board, original).value;
    
    expect(updated).toContain('# Important');
  });

  it('should handle malformed YAML', () => {
    const content = `---\ninvalid yaml\n---\n## ToDo`;
    const result = parser.parse(content);
    
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INVALID_FRONTMATTER');
  });
});
```

### 9.2 Performance Tests

```typescript
describe('MarkdownParser Performance', () => {
  it('should parse 10MB file in < 1 second', () => {
    const largeContent = generateLargeMarkdown(10 * 1024 * 1024);
    
    const start = performance.now();
    const result = parser.parse(largeContent);
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(1000);  // 1 sec
    expect(result.ok).toBe(true);
  });
});
```

---

## 10. Future Extensions

- [ ] Markdown プリセット（Week/Month/Sprint テンプレート）
- [ ] 複数セクション対応（Custom column names）
- [ ] Markdown lint（形式チェック）
- [ ] Diff 生成（変更の可視化）
