# FF14 Photo Framer

FF14のスクリーンショットを、SNS投稿向けの余白付きフォトフレーム画像に整えるためのブラウザアプリです。

画像をドラッグ&ドロップするだけで、縦長・横長・正方形のフレーム、LUTベースのフィルター、エリア名付きテキスト、PNG書き出しまでをローカルで完結できます。

## Features

- スクリーンショットのドラッグ&ドロップ読み込み
- `Standard` / `Wide` / `Square` のアスペクト比切り替え
- 縦向き・横向きの切り替え
- Canvas上での画像位置調整
- WebGL + LUT によるフィルター処理
  - Film
  - Bloom
  - Vibrant
  - Noir
  - Mist
- フィルター強度の調整
- FF14エリア辞書による地域名の自動補完
- PNG画像として書き出し
- X投稿用テキストの生成とクリップボードコピー

## Demo / Usage

このプロジェクトはビルド不要の静的Webアプリです。

1. リポジトリをクローン、またはダウンロードします。
2. `index.html` をブラウザで開きます。
3. 画面中央へ画像をドラッグ&ドロップします。
4. アスペクト比、向き、フィルター、位置情報テキストを調整します。
5. `Export Image` でPNGを書き出します。
6. 必要に応じて `Copy Text for X` で投稿文をコピーします。

ローカルサーバーで確認する場合は、以下のように起動できます。

```bash
python -m http.server 8000
```

その後、ブラウザで `http://localhost:8000` を開いてください。

## Project Structure

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── gl-renderer.js
│   ├── ff14-area-dictionary.json
│   └── filters/
│       ├── lut-presets.js
│       ├── analog.js
│       ├── bloom.js
│       ├── noir.js
│       └── vibrant.js
├── docs/
└── LICENSE
```

## Technical Notes

- フレーム描画とテキスト描画には Canvas API を使用しています。
- フィルターは WebGL で画像にLUTを適用し、Canvasへ合成しています。
- LUTは `js/filters/lut-presets.js` 内でプロシージャルに生成されます。
- 画像処理はブラウザ上で実行され、サーバーへ画像を送信しません。

## Browser Support

WebGLに対応したモダンブラウザを推奨します。

`showSaveFilePicker` に対応しているブラウザでは保存先を選択できます。未対応ブラウザでは通常のダウンロード処理にフォールバックします。

## License

MIT License

Copyright (c) 2026 ktmineo
