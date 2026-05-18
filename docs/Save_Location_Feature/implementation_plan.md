# Implementation Plan - Save Location Selection

保存場所を選択できるようにするために、`window.showSaveFilePicker` APIを使用します。

## Proposed Changes

### Logic
- **File**: `js/app.js`
- **Change**: `downloadBtn.onclick` イベントハンドラを変更します。
    - `window.showSaveFilePicker` がサポートされているか確認します。
    - サポートされている場合、保存ダイアログを表示し、ユーザーが選択した場所に画像を保存します。
    - サポートされていない場合（またはエラーが発生した場合）、既存の `<a>` タグによるダウンロード方法（デフォルトのダウンロードフォルダへの保存）にフォールバックします。

## Verification Plan

### Manual Verification
- 「Export Image」ボタンをクリックし、保存ダイアログが表示されることを確認します。
- キャンセルした場合、エラーにならずに処理が終了することを確認します。
- 保存を実行し、指定した場所に画像が保存されることを確認します。
