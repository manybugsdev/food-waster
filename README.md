# 🍕 Food Waster - 食べ物投げ合い3Dゲーム 🍔

食べ物を投げつけ合う楽しい3Dゲームです！CPUと対戦して、先に相手の体力をゼロにしよう！

## 🎮 遊び方

1. `index.html`をブラウザで開く
2. 「ゲーム開始」ボタンをクリック
3. CPUに食べ物を投げつけて倒そう！

## 🕹️ 操作方法

| キー | アクション |
|------|-----------|
| W | 前進 |
| S | 後退 |
| A | 左移動 |
| D | 右移動 |
| マウス | 視点操作 |
| 左クリック | 食べ物を投げる |
| スペース | ジャンプ |
| Q | 前の食べ物 |
| E | 次の食べ物 |

## 🍎 食べ物の種類

- 🍕 ピザ - ダメージ: 10
- 🍔 ハンバーガー - ダメージ: 12
- 🍎 りんご - ダメージ: 8
- 🍌 バナナ - ダメージ: 7
- 🍉 すいか - ダメージ: 15
- 🍰 ケーキ - ダメージ: 11
- 🍦 アイス - ダメージ: 9
- 🐙 たこ焼き - ダメージ: 13

## 🤖 CPU AI

CPUは以下の行動を取ります：
- プレイヤーを追跡・回避
- 予測射撃（プレイヤーの動きを予測）
- 体力が低いほど攻撃的に
- ランダムな回避行動

## 🛠️ 技術仕様

- **レンダリング**: Three.js (WebGL)
- **言語**: JavaScript (ES6 Modules)
- **依存関係**: なし（CDNからThree.jsを読み込み）

## 📁 ファイル構成

```
food-waster/
├── index.html    # メインHTMLファイル
├── game.js       # ゲームロジック
├── README.md     # このファイル
└── LICENSE       # MITライセンス
```

## 🚀 ローカルで実行

### 方法1: Live Server（推奨）
```bash
# VS Codeの場合
# Live Server拡張機能をインストールして、index.htmlを右クリック → "Open with Live Server"

# または、npx経由
npx live-server
```

### 方法2: Python HTTP Server
```bash
# Python 3
python -m http.server 8000

# ブラウザで http://localhost:8000 を開く
```

### 方法3: Node.js HTTP Server
```bash
npx http-server -p 8000

# ブラウザで http://localhost:8000 を開く
```

## 📜 ライセンス

MIT License