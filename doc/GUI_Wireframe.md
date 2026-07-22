# GUI ワイヤーフレーム案 - Weekly Kanban Obsidian Plugin

作成日: 2026-07-22  
対象: Obsidian の ItemView と Modal を併用する UI

## 1. Main Layout

```text
Weekly Kanban | Week 30 / 2026
Target: weekly-2026-w30.md

ToDo (3)     Doing (1)     Done (2)
[card]       [card]        [card]
[card]                     [card]
[+ Add]      [+ Add]       [+ Add]

Status: idle / syncing / conflict / error
```

## 2. ItemView

- 常設表示の主画面とする。
- ヘッダーに週情報と対象ファイル名を表示する。
- 3 カラムを横並びで表示する。
- カードはドラッグ可能な単位として見せる。

## 3. Modal

### 3.1 File Picker Modal

- 候補ファイルが複数ある場合に使用する。
- ファイル名、週情報、更新日を一覧にする。

### 3.2 Card Edit Modal

- title、labels、dueDate、completed を編集する。
- 削除時は確認を挟む。
- 入力の妥当性は閉じる前に検証する。

## 4. Interactions

### 4.1 Drag and Drop

1. ユーザーがカードを掴む。
2. 対象カラムをハイライトする。
3. ドロップ後に変更をキューへ積む。
4. デバウンス後に Markdown へ反映する。

### 4.2 Add / Edit / Delete

- 追加は各カラムの Add ボタンから行う。
- 編集はカードのメニューまたはクリックで開く。
- 削除は確認モーダルを出す。

### 4.3 Status Display

- idle: 待機状態。
- syncing: 変更適用中。
- conflict: 外部編集と競合。
- error: 失敗状態。

## 5. Accessibility

- キーボード操作でカード移動を可能にする。
- ボタンには aria-label を付与する。
- ステータス更新は screen reader に通知する。

## 6. Responsive Behavior

- 幅が広い場合は 3 列固定。
- 狭い場合は縦スクロールでカード閲覧を維持する。
- モバイル相当の表示でも編集導線を失わない。
