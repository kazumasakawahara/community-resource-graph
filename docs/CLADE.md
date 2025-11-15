# コミュニティ・リソース・グラフ - 仕様書

## プロジェクト概要

### プロジェクト名
コミュニティ・リソース・グラフ（Community Resource Graph）

### 目的
福祉支援現場で蓄積される「見えない地域資源」を、支援者や地域住民が協力して可視化・共有するプラットフォーム。従来の制度的サービスだけでなく、「理解のあるカフェ」「静かな公園」「受け入れてくれる事業所」といったインフォーマルな資源を、Neo4jのグラフデータベースで関係性とともに管理する。

### コアコンセプト: 「つながりの連鎖」
- 最初から完璧な情報を集めるのではなく、小さく始めて使いながら育てる
- 支援者が日常業務の中で出会った資源を記録
- 「探したけど見つからない」ニーズも記録し、後から誰かが情報を追加
- 資源同士の「つながり」（近接性、類似性、連続性）を可視化
- フィードバックにより情報が「生きたもの」に進化

### ターゲットユーザー
1. **一次ユーザー**: 相談支援専門員、支援員（初期段階）
2. **二次ユーザー**: 当事者・家族、地域住民（将来的に）

---

## 技術スタック

### フロントエンド
- **Streamlit** (最新版): Pythonベースの迅速なプロトタイピングに最適
- **Streamlit-AgGraph** または **pyvis**: グラフ可視化ライブラリ

### バックエンド
- **Python 3.11+**
- **Neo4j 5.x**: グラフデータベース（Community Edition）
- **neo4j-driver**: Python用Neo4jドライバー

### AI機能（オプション）
- **Ollama + gemma2:2b**: ローカルLLMによるタグ自動提案、類似資源検索
- プライバシー重視のため、すべてローカル実行

### データ連携
- **Google Sheets API**: 既存の地域資源データインポート（オプション）
- **gspread + oauth2client**: Google Sheets連携

### パッケージ管理
- **uv**: 高速なPythonパッケージマネージャー
- **pyproject.toml**: 依存関係管理

### 開発ツール
- **Git**: バージョン管理
- **pytest**: テストフレームワーク
- **ruff**: コードフォーマッター・リンター

---

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                   Streamlit UI Layer                     │
│  - ホーム画面（ダッシュボード）                           │
│  - 資源検索画面                                           │
│  - 資源登録画面                                           │
│  - ニーズ記録画面                                         │
│  - 詳細表示・編集画面                                     │
│  - グラフ可視化画面                                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  - ResourceService: 資源CRUD操作                         │
│  - SearchService: 検索・フィルタリング                    │
│  - FeedbackService: フィードバック管理                    │
│  - NeedService: ニーズ管理                               │
│  - ConnectionService: つながり管理                        │
│  - AnalyticsService: 統計・分析                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  - Neo4jRepository: グラフDB操作の抽象化                 │
│  - CypherQueryBuilder: クエリビルダー                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Neo4j Graph Database                    │
│  - Resource nodes (資源ノード)                           │
│  - Tag nodes (タグノード)                                │
│  - User nodes (ユーザーノード)                           │
│  - Feedback nodes (フィードバックノード)                 │
│  - Need nodes (ニーズノード)                             │
│  - Area nodes (エリアノード)                             │
│  - Relationships (リレーションシップ)                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Optional AI Layer                       │
│  - Ollama (ローカルLLM)                                  │
│  - タグ自動提案                                           │
│  - 類似資源推薦                                           │
│  - ニーズマッチング支援                                   │
└─────────────────────────────────────────────────────────┘
```

---

## データモデル

### ノード定義

#### 1. Resource (資源ノード)
```python
{
    "id": str,              # 一意識別子（UUID）
    "name": str,            # 資源名
    "type": str,            # 種類: "place", "person", "activity", "information"
    "description": str,     # 説明
    "address": str,         # 住所（任意）
    "contact": str,         # 連絡先（任意）
    "hours": str,           # 営業時間など（任意）
    "latitude": float,      # 緯度（任意）
    "longitude": float,     # 経度（任意）
    "created_at": datetime, # 作成日時
    "updated_at": datetime, # 更新日時
    "view_count": int,      # 閲覧数
    "feedback_count": int,  # フィードバック数
}
```

#### 2. Tag (タグノード)
```python
{
    "id": str,              # 一意識別子
    "name": str,            # タグ名（例: "静か", "バリアフリー"）
    "category": str,        # カテゴリ: "atmosphere", "accessibility", "cost", "support"
    "usage_count": int,     # 使用回数
}
```

#### 3. User (ユーザーノード)
```python
{
    "id": str,              # 一意識別子
    "name": str,            # ユーザー名
    "organization": str,    # 所属組織（任意）
    "role": str,            # 役割: "supporter", "resident"
    "created_at": datetime, # 登録日時
    "contribution_count": int, # 貢献数
}
```

#### 4. Feedback (フィードバックノード)
```python
{
    "id": str,              # 一意識別子
    "content": str,         # フィードバック内容
    "visit_date": date,     # 訪問日（任意）
    "created_at": datetime, # 作成日時
    "helpful_count": int,   # 役立ったカウント
}
```

#### 5. Need (ニーズノード)
```python
{
    "id": str,              # 一意識別子
    "title": str,           # タイトル
    "description": str,     # 詳細説明
    "target": str,          # 対象者（任意）
    "purpose": str,         # 目的（任意）
    "status": str,          # 状態: "open", "matched", "closed"
    "created_at": datetime, # 作成日時
    "view_count": int,      # 閲覧数
}
```

#### 6. Area (エリアノード)
```python
{
    "id": str,              # 一意識別子
    "name": str,            # エリア名（例: "小倉北区"）
    "city": str,            # 市区町村
    "prefecture": str,      # 都道府県
}
```

### リレーションシップ定義

#### LOCATED_IN (資源 → エリア)
```python
{
    # プロパティなし
}
```

#### HAS_TAG (資源 → タグ)
```python
{
    "added_at": datetime,   # 追加日時
}
```

#### RELATED_TO (資源 → 資源)
```python
{
    "relation_type": str,   # "nearby", "similar", "sequential"
    "distance": str,        # 距離（任意、例: "徒歩5分"）
    "description": str,     # 関係の説明
    "created_by": str,      # 作成者ID
    "created_at": datetime, # 作成日時
}
```

#### REGISTERED_BY (資源 → ユーザー)
```python
{
    "registered_at": datetime, # 登録日時
}
```

#### HAS_FEEDBACK (資源 → フィードバック)
```python
{
    "created_at": datetime, # 作成日時
}
```

#### GIVEN_BY (フィードバック → ユーザー)
```python
{
    "given_at": datetime,   # 投稿日時
}
```

#### IN_AREA (ニーズ → エリア)
```python
{
    # プロパティなし
}
```

#### RECORDED_BY (ニーズ → ユーザー)
```python
{
    "recorded_at": datetime, # 記録日時
}
```

#### MATCHED_BY (ニーズ → 資源)
```python
{
    "matched_at": datetime,  # マッチング日時
    "matched_by": str,       # マッチングしたユーザーID
    "match_quality": str,    # "high", "medium", "low"
    "note": str,             # メモ（任意）
}
```

---

## 機能要件

### Phase 1: 基本機能 (MVP: Minimum Viable Product)

#### 1. 資源管理機能
- **資源登録**
  - 名前、種類、説明、場所、連絡先などの基本情報入力
  - タグの複数選択（プリセット + カスタムタグ）
  - エリアの選択
  - 登録者情報の自動記録
  
- **資源検索**
  - フリーワード検索（名前、説明を対象）
  - タグによるフィルタリング（複数選択可）
  - エリアによるフィルタリング
  - 検索結果のリスト表示（カード形式）
  
- **資源詳細表示**
  - 基本情報の表示
  - タグの表示
  - フィードバックリストの表示
  - 関連資源の表示
  - 編集・削除ボタン（権限管理は後のフェーズ）

#### 2. フィードバック機能
- **フィードバック追加**
  - 資源詳細画面からフィードバックを追加
  - 訪問日、内容の入力
  - 投稿者情報の自動記録
  
- **フィードバック表示**
  - 資源詳細画面に時系列で表示
  - 投稿者名、日付、内容を表示

#### 3. ニーズ管理機能
- **ニーズ記録**
  - タイトル、詳細説明の入力
  - エリア、対象者、目的の入力（任意）
  - ステータス管理（open/matched/closed）
  
- **ニーズ一覧表示**
  - 未解決ニーズの一覧表示
  - ニーズをクリックして詳細表示
  
- **ニーズマッチング**
  - ニーズに対して既存資源をマッチング
  - マッチング時のメモ記録

#### 4. つながり管理機能
- **つながり追加**
  - 2つの資源間の関係を登録
  - 関係の種類（近接、類似、連続）の選択
  - 距離や説明の入力
  
- **つながり表示**
  - 資源詳細画面で関連資源を表示
  - 関係の説明を表示

#### 5. ダッシュボード機能
- **統計情報表示**
  - 総資源数、総フィードバック数、総ニーズ数
  - 最近追加された資源（直近5件）
  - 最近のフィードバック（直近5件）
  - 未解決ニーズ（直近5件）

### Phase 2: 拡張機能

#### 6. グラフ可視化機能
- **資源ネットワークの可視化**
  - Neo4jのグラフ構造をインタラクティブに表示
  - ノードをクリックして詳細表示
  - つながりを辿って関連資源を探索
  
- **エゴネットワーク表示**
  - 特定の資源を中心とした関係性の可視化
  - 1-3ホップの範囲で表示

#### 7. 検索機能強化
- **セマンティック検索**
  - Ollamaを使った意味ベースの検索
  - 「引きこもりの若者が安心できる場所」のような自然言語検索
  
- **類似資源推薦**
  - タグや関係性に基づく類似資源の提案
  - 「この資源を見た人はこんな資源も見ています」機能

#### 8. AI支援機能
- **タグ自動提案**
  - 説明文からOllamaが適切なタグを提案
  
- **ニーズマッチング支援**
  - ニーズ記録時に類似する既存資源を自動提案

#### 9. データ連携機能
- **Google Sheetsインポート**
  - 既存の資源リスト（スプレッドシート）を一括インポート
  
- **エクスポート機能**
  - 資源データをCSV/Excel形式でエクスポート

### Phase 3: 発展機能

#### 10. ユーザー管理機能
- **認証・認可**
  - ユーザー登録・ログイン
  - 役割ベースのアクセス制御
  
- **貢献度の可視化**
  - 「あなたの情報が○人の役に立ちました」通知
  - 貢献ランキング（ゲーミフィケーション）

#### 11. 地図機能
- **地図上での資源表示**
  - 緯度経度情報を持つ資源を地図上にプロット
  - 地図からの資源検索

#### 12. 通知機能
- **新規資源通知**
  - 関心のあるエリア・タグに新しい資源が追加された際に通知
  
- **ニーズマッチング通知**
  - 自分が記録したニーズにマッチする資源が追加された際に通知

---

## ディレクトリ構造

```
community-resource-graph/
├── .git/                          # Gitリポジトリ
├── .gitignore                     # Git除外設定
├── pyproject.toml                 # プロジェクト設定・依存関係
├── uv.lock                        # ロックファイル
├── README.md                      # プロジェクト説明
├── CLADE.md                       # この仕様書
│
├── docs/                          # ドキュメント
│   ├── wireframe.html             # ワイヤーフレーム
│   ├── data-model.md              # データモデル詳細
│   └── user-guide.md              # ユーザーガイド
│
├── src/                           # ソースコード
│   ├── __init__.py
│   │
│   ├── config/                    # 設定
│   │   ├── __init__.py
│   │   ├── settings.py            # アプリケーション設定
│   │   └── neo4j_config.py        # Neo4j接続設定
│   │
│   ├── models/                    # データモデル
│   │   ├── __init__.py
│   │   ├── resource.py            # Resourceモデル
│   │   ├── tag.py                 # Tagモデル
│   │   ├── user.py                # Userモデル
│   │   ├── feedback.py            # Feedbackモデル
│   │   ├── need.py                # Needモデル
│   │   └── area.py                # Areaモデル
│   │
│   ├── repositories/              # データアクセス層
│   │   ├── __init__.py
│   │   ├── base.py                # 基底リポジトリ
│   │   ├── neo4j_repository.py    # Neo4jリポジトリ
│   │   ├── resource_repository.py # Resource用リポジトリ
│   │   ├── tag_repository.py      # Tag用リポジトリ
│   │   ├── feedback_repository.py # Feedback用リポジトリ
│   │   └── need_repository.py     # Need用リポジトリ
│   │
│   ├── services/                  # ビジネスロジック層
│   │   ├── __init__.py
│   │   ├── resource_service.py    # 資源管理サービス
│   │   ├── search_service.py      # 検索サービス
│   │   ├── feedback_service.py    # フィードバックサービス
│   │   ├── need_service.py        # ニーズ管理サービス
│   │   ├── connection_service.py  # つながり管理サービス
│   │   └── analytics_service.py   # 分析サービス
│   │
│   ├── ui/                        # Streamlit UI
│   │   ├── __init__.py
│   │   ├── app.py                 # メインアプリ
│   │   ├── pages/                 # ページモジュール
│   │   │   ├── __init__.py
│   │   │   ├── home.py            # ホーム画面
│   │   │   ├── search.py          # 検索画面
│   │   │   ├── register.py        # 登録画面
│   │   │   ├── needs.py           # ニーズ記録画面
│   │   │   └── detail.py          # 詳細表示画面
│   │   │
│   │   ├── components/            # 再利用可能なUIコンポーネント
│   │   │   ├── __init__.py
│   │   │   ├── resource_card.py   # 資源カード
│   │   │   ├── tag_selector.py    # タグセレクター
│   │   │   ├── feedback_list.py   # フィードバックリスト
│   │   │   └── stats_widget.py    # 統計ウィジェット
│   │   │
│   │   └── styles/                # スタイル定義
│   │       ├── __init__.py
│   │       └── custom.css         # カスタムCSS
│   │
│   ├── utils/                     # ユーティリティ
│   │   ├── __init__.py
│   │   ├── logger.py              # ロギング設定
│   │   ├── validators.py          # バリデーション
│   │   └── formatters.py          # フォーマッター
│   │
│   └── ai/                        # AI機能（Phase 2）
│       ├── __init__.py
│       ├── ollama_client.py       # Ollamaクライアント
│       ├── tag_suggester.py       # タグ提案
│       └── semantic_search.py     # セマンティック検索
│
├── scripts/                       # スクリプト
│   ├── init_database.py           # データベース初期化
│   ├── seed_data.py               # サンプルデータ投入
│   └── backup_database.py         # バックアップスクリプト
│
├── tests/                         # テスト
│   ├── __init__.py
│   ├── conftest.py                # pytest設定
│   ├── test_repositories/         # リポジトリテスト
│   ├── test_services/             # サービステスト
│   └── test_ui/                   # UIテスト（オプション）
│
├── data/                          # データファイル
│   ├── sample_resources.csv       # サンプルデータ
│   └── predefined_tags.json       # プリセットタグ定義
│
└── .streamlit/                    # Streamlit設定
    └── config.toml                # Streamlit設定ファイル
```

---

## 開発環境セットアップ

### 前提条件
- Python 3.11以上
- Neo4j 5.x（Docker推奨）
- uv（Pythonパッケージマネージャー）
- Git

### セットアップ手順

#### 1. プロジェクトディレクトリの作成
```bash
mkdir -p ~/Projects/community-resource-graph
cd ~/Projects/community-resource-graph
```

#### 2. Gitリポジトリの初期化
```bash
git init
```

#### 3. uvを使った仮想環境の作成
```bash
# uvのインストール（まだの場合）
curl -LsSf https://astral.sh/uv/install.sh | sh

# プロジェクトの初期化
uv init

# 必要なパッケージの追加
uv add streamlit neo4j-driver pydantic python-dotenv
uv add --dev pytest ruff black
```

#### 4. pyproject.tomlの設定
```toml
[project]
name = "community-resource-graph"
version = "0.1.0"
description = "地域の見えない資源を可視化・共有するプラットフォーム"
authors = [
    {name = "河原", email = ""}
]
requires-python = ">=3.11"
dependencies = [
    "streamlit>=1.30.0",
    "neo4j>=5.14.0",
    "pydantic>=2.5.0",
    "python-dotenv>=1.0.0",
    "pandas>=2.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "ruff>=0.1.0",
    "black>=23.0.0",
]
ai = [
    "ollama>=0.1.0",
]
sheets = [
    "gspread>=5.12.0",
    "oauth2client>=4.1.3",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.black]
line-length = 100
target-version = ['py311']
```

#### 5. Neo4jのセットアップ（Docker使用）
```bash
# Neo4jコンテナの起動
docker run \
    --name neo4j-community-resource \
    -p 7474:7474 -p 7687:7687 \
    -d \
    -v $HOME/neo4j/data:/data \
    -v $HOME/neo4j/logs:/logs \
    -v $HOME/neo4j/import:/var/lib/neo4j/import \
    -v $HOME/neo4j/plugins:/plugins \
    --env NEO4J_AUTH=neo4j/password123 \
    neo4j:5.14.0
```

#### 6. 環境変数の設定
```bash
# .envファイルの作成
cat > .env << 'EOF'
# Neo4j設定
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# アプリケーション設定
APP_NAME=コミュニティ・リソース・グラフ
DEBUG=True
LOG_LEVEL=INFO

# Ollama設定（Phase 2で使用）
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gemma2:2b
EOF
```

#### 7. .gitignoreの作成
```bash
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# 仮想環境
.venv/
venv/
ENV/
env/

# IDE
.vscode/
.idea/
*.swp
*.swo

# 環境変数
.env
.env.local

# ログ
*.log

# データベース
*.db
*.sqlite

# OS
.DS_Store
Thumbs.db

# uv
uv.lock
EOF
```

---

## 実装手順（段階的開発）

### Step 1: プロジェクト基盤の構築

#### 1.1 設定ファイルの作成
**ファイル**: `src/config/settings.py`
```python
"""アプリケーション設定"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """アプリケーション設定"""
    
    # アプリケーション
    app_name: str = "コミュニティ・リソース・グラフ"
    debug: bool = False
    log_level: str = "INFO"
    
    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password123"
    
    # Ollama（Phase 2）
    ollama_host: Optional[str] = None
    ollama_model: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# グローバル設定インスタンス
settings = Settings()
```

#### 1.2 Neo4j接続の確立
**ファイル**: `src/config/neo4j_config.py`
```python
"""Neo4j接続設定"""
from neo4j import GraphDatabase
from .settings import settings
from typing import Optional

class Neo4jConnection:
    """Neo4jデータベース接続クラス"""
    
    def __init__(self):
        self.driver: Optional[GraphDatabase.driver] = None
    
    def connect(self):
        """データベースに接続"""
        try:
            self.driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password)
            )
            # 接続テスト
            self.driver.verify_connectivity()
            print("Neo4jへの接続に成功しました")
        except Exception as e:
            print(f"Neo4jへの接続に失敗しました: {e}")
            raise
    
    def close(self):
        """接続を閉じる"""
        if self.driver:
            self.driver.close()
    
    def get_session(self):
        """セッションを取得"""
        if not self.driver:
            self.connect()
        return self.driver.session()

# グローバル接続インスタンス
neo4j_connection = Neo4jConnection()
```

#### 1.3 データベース初期化スクリプト
**ファイル**: `scripts/init_database.py`
```python
"""Neo4jデータベースの初期化"""
from src.config.neo4j_config import neo4j_connection

def create_constraints():
    """制約とインデックスを作成"""
    with neo4j_connection.get_session() as session:
        # 制約の作成
        constraints = [
            "CREATE CONSTRAINT resource_id IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE",
            "CREATE CONSTRAINT tag_name IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE",
            "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
            "CREATE CONSTRAINT feedback_id IF NOT EXISTS FOR (f:Feedback) REQUIRE f.id IS UNIQUE",
            "CREATE CONSTRAINT need_id IF NOT EXISTS FOR (n:Need) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT area_name IF NOT EXISTS FOR (a:Area) REQUIRE a.name IS UNIQUE",
        ]
        
        for constraint in constraints:
            try:
                session.run(constraint)
                print(f"制約を作成しました: {constraint}")
            except Exception as e:
                print(f"制約作成エラー（既に存在する可能性）: {e}")
        
        # インデックスの作成
        indexes = [
            "CREATE INDEX resource_name IF NOT EXISTS FOR (r:Resource) ON (r.name)",
            "CREATE INDEX resource_type IF NOT EXISTS FOR (r:Resource) ON (r.type)",
            "CREATE INDEX tag_category IF NOT EXISTS FOR (t:Tag) ON (t.category)",
            "CREATE INDEX need_status IF NOT EXISTS FOR (n:Need) ON (n.status)",
        ]
        
        for index in indexes:
            try:
                session.run(index)
                print(f"インデックスを作成しました: {index}")
            except Exception as e:
                print(f"インデックス作成エラー（既に存在する可能性）: {e}")

def seed_predefined_tags():
    """プリセットタグを登録"""
    with neo4j_connection.get_session() as session:
        predefined_tags = [
            {"name": "静か", "category": "atmosphere"},
            {"name": "バリアフリー", "category": "accessibility"},
            {"name": "理解がある", "category": "support"},
            {"name": "無料・低価格", "category": "cost"},
            {"name": "駅から近い", "category": "location"},
            {"name": "駐車場あり", "category": "location"},
            {"name": "人が少ない", "category": "atmosphere"},
            {"name": "飲食OK", "category": "facility"},
            {"name": "作業実習", "category": "support"},
            {"name": "居場所", "category": "support"},
        ]
        
        for tag in predefined_tags:
            query = """
            MERGE (t:Tag {name: $name})
            SET t.category = $category,
                t.usage_count = 0
            """
            session.run(query, name=tag["name"], category=tag["category"])
        
        print(f"{len(predefined_tags)}個のプリセットタグを登録しました")

def seed_areas():
    """北九州市のエリアを登録"""
    with neo4j_connection.get_session() as session:
        areas = [
            {"name": "小倉北区", "city": "北九州市", "prefecture": "福岡県"},
            {"name": "小倉南区", "city": "北九州市", "prefecture": "福岡県"},
            {"name": "八幡東区", "city": "北九州市", "prefecture": "福岡県"},
            {"name": "八幡西区", "city": "北九州市", "prefecture": "福岡県"},
            {"name": "戸畑区", "city": "北九州市", "prefecture": "福岡県"},
            {"name": "若松区", "city": "北九州市", "prefecture": "福岡県"},
            {"name": "門司区", "city": "北九州市", "prefecture": "福岡県"},
        ]
        
        for area in areas:
            query = """
            MERGE (a:Area {name: $name})
            SET a.city = $city,
                a.prefecture = $prefecture
            """
            session.run(query, **area)
        
        print(f"{len(areas)}個のエリアを登録しました")

if __name__ == "__main__":
    print("データベースの初期化を開始します...")
    neo4j_connection.connect()
    
    create_constraints()
    seed_predefined_tags()
    seed_areas()
    
    neo4j_connection.close()
    print("データベースの初期化が完了しました")
```

### Step 2: データモデルとリポジトリの実装

#### 2.1 Resourceモデル
**ファイル**: `src/models/resource.py`
```python
"""Resourceデータモデル"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
import uuid

class Resource(BaseModel):
    """資源モデル"""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., pattern="^(place|person|activity|information)$")
    description: str = Field(..., min_length=1)
    address: Optional[str] = None
    contact: Optional[str] = None
    hours: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_name: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    view_count: int = 0
    feedback_count: int = 0
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "カフェ「月のしずく」",
                "type": "place",
                "description": "静かで落ち着いた雰囲気のカフェ",
                "address": "小倉北区堺町1-2-3",
                "contact": "093-XXX-XXXX",
                "hours": "9:00-18:00（月曜定休）",
                "area_name": "小倉北区",
                "tags": ["静か", "理解がある", "面談に使える"]
            }
        }
```

#### 2.2 Resourceリポジトリ
**ファイル**: `src/repositories/resource_repository.py`
```python
"""Resource用リポジトリ"""
from typing import List, Optional
from datetime import datetime
from src.config.neo4j_config import neo4j_connection
from src.models.resource import Resource

class ResourceRepository:
    """資源データの永続化を担当"""
    
    def create(self, resource: Resource, user_id: str) -> Resource:
        """資源を作成"""
        with neo4j_connection.get_session() as session:
            query = """
            CREATE (r:Resource {
                id: $id,
                name: $name,
                type: $type,
                description: $description,
                address: $address,
                contact: $contact,
                hours: $hours,
                latitude: $latitude,
                longitude: $longitude,
                created_at: datetime($created_at),
                updated_at: datetime($updated_at),
                view_count: 0,
                feedback_count: 0
            })
            
            // ユーザーとの関係を作成
            WITH r
            MATCH (u:User {id: $user_id})
            CREATE (r)-[:REGISTERED_BY {registered_at: datetime()}]->(u)
            
            // エリアとの関係を作成（エリアが指定されている場合）
            WITH r
            OPTIONAL MATCH (a:Area {name: $area_name})
            FOREACH (area IN CASE WHEN a IS NOT NULL THEN [a] ELSE [] END |
                CREATE (r)-[:LOCATED_IN]->(area)
            )
            
            // タグとの関係を作成
            WITH r
            UNWIND $tags AS tag_name
            MERGE (t:Tag {name: tag_name})
            ON CREATE SET t.category = 'custom', t.usage_count = 0
            CREATE (r)-[:HAS_TAG {added_at: datetime()}]->(t)
            SET t.usage_count = t.usage_count + 1
            
            RETURN r
            """
            
            result = session.run(
                query,
                id=resource.id,
                name=resource.name,
                type=resource.type,
                description=resource.description,
                address=resource.address,
                contact=resource.contact,
                hours=resource.hours,
                latitude=resource.latitude,
                longitude=resource.longitude,
                created_at=resource.created_at.isoformat(),
                updated_at=resource.updated_at.isoformat(),
                area_name=resource.area_name,
                tags=resource.tags if resource.tags else [],
                user_id=user_id
            )
            
            return resource
    
    def find_by_id(self, resource_id: str) -> Optional[Resource]:
        """IDで資源を検索"""
        with neo4j_connection.get_session() as session:
            query = """
            MATCH (r:Resource {id: $id})
            OPTIONAL MATCH (r)-[:LOCATED_IN]->(a:Area)
            OPTIONAL MATCH (r)-[:HAS_TAG]->(t:Tag)
            RETURN r,
                   a.name AS area_name,
                   collect(DISTINCT t.name) AS tags
            """
            
            result = session.run(query, id=resource_id)
            record = result.single()
            
            if not record:
                return None
            
            r = record["r"]
            return Resource(
                id=r["id"],
                name=r["name"],
                type=r["type"],
                description=r["description"],
                address=r.get("address"),
                contact=r.get("contact"),
                hours=r.get("hours"),
                latitude=r.get("latitude"),
                longitude=r.get("longitude"),
                area_name=record.get("area_name"),
                tags=record.get("tags", []),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                view_count=r["view_count"],
                feedback_count=r["feedback_count"]
            )
    
    def search(
        self,
        keyword: Optional[str] = None,
        tags: Optional[List[str]] = None,
        area_name: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Resource]:
        """資源を検索"""
        with neo4j_connection.get_session() as session:
            # 基本クエリ
            query_parts = ["MATCH (r:Resource)"]
            where_clauses = []
            params = {"limit": limit}
            
            # キーワード検索
            if keyword:
                where_clauses.append(
                    "(toLower(r.name) CONTAINS toLower($keyword) OR "
                    "toLower(r.description) CONTAINS toLower($keyword))"
                )
                params["keyword"] = keyword
            
            # タイプフィルター
            if resource_type:
                where_clauses.append("r.type = $type")
                params["type"] = resource_type
            
            # エリアフィルター
            if area_name:
                query_parts.append("MATCH (r)-[:LOCATED_IN]->(a:Area {name: $area_name})")
                params["area_name"] = area_name
            
            # タグフィルター
            if tags:
                query_parts.append(
                    "MATCH (r)-[:HAS_TAG]->(t:Tag) "
                    "WHERE t.name IN $tags"
                )
                params["tags"] = tags
            
            # WHERE句の構築
            if where_clauses:
                query_parts.append("WHERE " + " AND ".join(where_clauses))
            
            # 追加情報の取得
            query_parts.extend([
                "OPTIONAL MATCH (r)-[:LOCATED_IN]->(area:Area)",
                "OPTIONAL MATCH (r)-[:HAS_TAG]->(tag:Tag)",
                "RETURN r,",
                "       area.name AS area_name,",
                "       collect(DISTINCT tag.name) AS tags",
                "ORDER BY r.created_at DESC",
                "LIMIT $limit"
            ])
            
            query = "\n".join(query_parts)
            results = session.run(query, **params)
            
            resources = []
            for record in results:
                r = record["r"]
                resources.append(Resource(
                    id=r["id"],
                    name=r["name"],
                    type=r["type"],
                    description=r["description"],
                    address=r.get("address"),
                    contact=r.get("contact"),
                    hours=r.get("hours"),
                    latitude=r.get("latitude"),
                    longitude=r.get("longitude"),
                    area_name=record.get("area_name"),
                    tags=record.get("tags", []),
                    created_at=r["created_at"],
                    updated_at=r["updated_at"],
                    view_count=r["view_count"],
                    feedback_count=r["feedback_count"]
                ))
            
            return resources
    
    def increment_view_count(self, resource_id: str):
        """閲覧数をインクリメント"""
        with neo4j_connection.get_session() as session:
            query = """
            MATCH (r:Resource {id: $id})
            SET r.view_count = r.view_count + 1
            """
            session.run(query, id=resource_id)
```

### Step 3: サービス層の実装

#### 3.1 ResourceService
**ファイル**: `src/services/resource_service.py`
```python
"""資源管理サービス"""
from typing import List, Optional
from src.repositories.resource_repository import ResourceRepository
from src.models.resource import Resource

class ResourceService:
    """資源管理のビジネスロジック"""
    
    def __init__(self):
        self.repository = ResourceRepository()
    
    def register_resource(
        self,
        name: str,
        resource_type: str,
        description: str,
        user_id: str,
        address: Optional[str] = None,
        contact: Optional[str] = None,
        hours: Optional[str] = None,
        area_name: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Resource:
        """資源を登録"""
        
        # バリデーション
        if resource_type not in ["place", "person", "activity", "information"]:
            raise ValueError("無効な資源タイプです")
        
        # Resourceモデルの作成
        resource = Resource(
            name=name,
            type=resource_type,
            description=description,
            address=address,
            contact=contact,
            hours=hours,
            area_name=area_name,
            tags=tags or []
        )
        
        # リポジトリ経由で保存
        return self.repository.create(resource, user_id)
    
    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """資源を取得（閲覧数カウント付き）"""
        resource = self.repository.find_by_id(resource_id)
        if resource:
            self.repository.increment_view_count(resource_id)
        return resource
    
    def search_resources(
        self,
        keyword: Optional[str] = None,
        tags: Optional[List[str]] = None,
        area_name: Optional[str] = None,
        resource_type: Optional[str] = None
    ) -> List[Resource]:
        """資源を検索"""
        return self.repository.search(
            keyword=keyword,
            tags=tags,
            area_name=area_name,
            resource_type=resource_type
        )
```

### Step 4: Streamlit UIの実装

#### 4.1 メインアプリ
**ファイル**: `src/ui/app.py`
```python
"""Streamlitメインアプリケーション"""
import streamlit as st
from src.config.neo4j_config import neo4j_connection
from src.config.settings import settings

# ページ設定
st.set_page_config(
    page_title=settings.app_name,
    page_icon="🌐",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Neo4j接続
@st.cache_resource
def init_connection():
    """Neo4j接続を初期化（キャッシュ）"""
    neo4j_connection.connect()
    return neo4j_connection

init_connection()

# カスタムCSS
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 30px;
    }
    .resource-card {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .tag {
        display: inline-block;
        background: #e3f2fd;
        color: #1976d2;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        margin: 2px;
    }
</style>
""", unsafe_allow_html=True)

# ヘッダー
st.markdown(f"""
<div class="main-header">
    <h1>🌐 {settings.app_name}</h1>
    <p>地域の「見えない資産」を可視化・共有するプラットフォーム</p>
</div>
""", unsafe_allow_html=True)

# サイドバーナビゲーション
page = st.sidebar.radio(
    "ページを選択",
    ["🏠 ホーム", "🔍 資源を探す", "➕ 資源を登録", "💡 ニーズを記録"]
)

# ページのルーティング
if page == "🏠 ホーム":
    from src.ui.pages.home import show_home_page
    show_home_page()
elif page == "🔍 資源を探す":
    from src.ui.pages.search import show_search_page
    show_search_page()
elif page == "➕ 資源を登録":
    from src.ui.pages.register import show_register_page
    show_register_page()
elif page == "💡 ニーズを記録":
    from src.ui.pages.needs import show_needs_page
    show_needs_page()
```

#### 4.2 ホーム画面
**ファイル**: `src/ui/pages/home.py`
```python
"""ホーム画面"""
import streamlit as st

def show_home_page():
    """ホーム画面を表示"""
    
    # 使い方の説明
    st.info("""
    💡 **このシステムの使い方**
    
    支援活動の中で出会った「使える場所・人・情報」を記録してください。
    小さな情報でもOK！みんなで少しずつ追加することで、地域の資源マップが育っていきます。
    """)
    
    # クイックアクション
    st.subheader("クイックアクション")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🔍 資源を探す", use_container_width=True):
            st.session_state.page = "search"
            st.rerun()
    
    with col2:
        if st.button("➕ 資源を登録", use_container_width=True):
            st.session_state.page = "register"
            st.rerun()
    
    with col3:
        if st.button("💡 ニーズを記録", use_container_width=True):
            st.session_state.page = "needs"
            st.rerun()
    
    # 統計情報
    st.subheader("📊 統計情報")
    
    # TODO: 実際の統計データを取得
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("総資源数", "0件")
    col2.metric("フィードバック", "0件")
    col3.metric("ニーズ記録", "0件")
    col4.metric("つながり", "0件")
    
    # 最近の活動
    st.subheader("📋 最近の活動")
    st.info("まだ活動がありません。最初の資源を登録してみましょう！")
```

#### 4.3 資源登録画面
**ファイル**: `src/ui/pages/register.py`
```python
"""資源登録画面"""
import streamlit as st
from src.services.resource_service import ResourceService

def show_register_page():
    """資源登録画面を表示"""
    
    st.subheader("➕ 新しい資源を登録")
    
    st.info("""
    ✨ **小さな情報でも大丈夫！**
    
    「ここのカフェのマスターが優しかった」「この公園は人が少なくて落ち着く」など、
    あなたが知っている「ちょっといい場所」を教えてください。完璧な情報でなくてOKです。
    """)
    
    # フォーム
    with st.form("resource_form"):
        # 資源の種類
        resource_type = st.selectbox(
            "資源の種類",
            ["place", "person", "activity", "information"],
            format_func=lambda x: {
                "place": "場所・施設（カフェ、公園、図書館など）",
                "person": "人・スタッフ（理解のある店主、専門家など）",
                "activity": "活動・プログラム（イベント、教室など）",
                "information": "情報・制度（使える制度、コツなど）"
            }[x]
        )
        
        # 名前
        name = st.text_input("名前・名称 *", placeholder="例: カフェ「月のしずく」")
        
        # 場所
        col1, col2 = st.columns([2, 1])
        with col1:
            address = st.text_input("住所", placeholder="例: 小倉北区堺町1-2-3")
        with col2:
            area_name = st.selectbox(
                "エリア",
                ["", "小倉北区", "小倉南区", "八幡東区", "八幡西区", "戸畑区", "若松区", "門司区"]
            )
        
        # 説明
        description = st.text_area(
            "どんな資源ですか？ *",
            placeholder="例: 静かで落ち着いた雰囲気のカフェ。マスターが障害のある方への理解があり、ゆっくり過ごせる。面談にも使える。",
            height=120
        )
        
        # タグ選択
        st.write("タグ（複数選択可）")
        predefined_tags = [
            "静か", "バリアフリー", "理解がある", "無料・低価格",
            "駅から近い", "駐車場あり", "人が少ない", "飲食OK",
            "作業実習", "居場所"
        ]
        
        selected_tags = []
        cols = st.columns(5)
        for i, tag in enumerate(predefined_tags):
            with cols[i % 5]:
                if st.checkbox(tag, key=f"tag_{tag}"):
                    selected_tags.append(tag)
        
        # カスタムタグ
        custom_tags = st.text_input(
            "カスタムタグ（カンマ区切り）",
            placeholder="例: 面談に使える, 平日午前が空いている"
        )
        if custom_tags:
            selected_tags.extend([t.strip() for t in custom_tags.split(",")])
        
        # 連絡先・営業時間
        with st.expander("連絡先・営業時間など（任意）"):
            contact = st.text_input("連絡先", placeholder="例: 093-XXX-XXXX")
            hours = st.text_input("営業時間", placeholder="例: 9:00-18:00（月曜定休）")
        
        # 送信ボタン
        submitted = st.form_submit_button("✅ 登録する", use_container_width=True)
        
        if submitted:
            # バリデーション
            if not name:
                st.error("名前は必須です")
            elif not description:
                st.error("説明は必須です")
            else:
                try:
                    # サービス経由で登録
                    service = ResourceService()
                    
                    # TODO: 実際のユーザーIDを取得（現在は仮のID）
                    user_id = "temp_user_001"
                    
                    resource = service.register_resource(
                        name=name,
                        resource_type=resource_type,
                        description=description,
                        user_id=user_id,
                        address=address if address else None,
                        contact=contact if contact else None,
                        hours=hours if hours else None,
                        area_name=area_name if area_name else None,
                        tags=selected_tags
                    )
                    
                    st.success("✅ 資源を登録しました！")
                    st.balloons()
                    
                    # 詳細を表示
                    st.info(f"登録ID: {resource.id}")
                    
                except Exception as e:
                    st.error(f"登録中にエラーが発生しました: {e}")
```

---

## テスト方針

### 単体テスト
- **リポジトリ層**: Neo4jとの通信をモックしてテスト
- **サービス層**: ビジネスロジックのテスト
- **モデル**: Pydanticのバリデーションテスト

### 統合テスト
- **Neo4jテストコンテナ**: 実際のデータベースを使った統合テスト
- **エンドツーエンド**: 主要なユースケースのテスト

### テスト実行
```bash
# すべてのテストを実行
uv run pytest

# カバレッジ付きで実行
uv run pytest --cov=src --cov-report=html

# 特定のテストのみ実行
uv run pytest tests/test_repositories/
```

---

## 起動方法

### 開発モードでの起動
```bash
# Neo4jコンテナの起動（初回のみ）
docker start neo4j-community-resource

# データベース初期化（初回のみ）
uv run python scripts/init_database.py

# Streamlitアプリの起動
uv run streamlit run src/ui/app.py
```

### アクセス
- **Streamlitアプリ**: http://localhost:8501
- **Neo4j Browser**: http://localhost:7474

---

## 開発の進め方

### Phase 1: MVP開発（2-3週間）
1. Week 1: 基盤構築 + 資源管理機能
   - プロジェクト構造の作成
   - Neo4j接続の確立
   - Resource CRUD実装
   - 資源登録・検索UI

2. Week 2: フィードバック + ニーズ機能
   - Feedback CRUD実装
   - Need CRUD実装
   - フィードバック追加UI
   - ニーズ記録UI

3. Week 3: つながり + ダッシュボード
   - つながり管理実装
   - ダッシュボード統計
   - 詳細表示画面
   - テスト + バグ修正

### Phase 2: 拡張機能（1-2ヶ月）
- グラフ可視化
- AI機能（Ollama統合）
- Google Sheets連携

### Phase 3: 発展機能（2-3ヶ月）
- ユーザー管理・認証
- 地図機能
- 通知機能

---

## 注意事項

### セキュリティ
- 本番環境では、環境変数を適切に管理（.envファイルをGit管理外に）
- Neo4jのパスワードは強固なものを使用
- 将来的にはユーザー認証を実装

### パフォーマンス
- 大量データに対応するため、ページネーションを実装
- Neo4jのインデックスを適切に設定
- キャッシュを活用（Streamlitの@st.cache_data）

### バックアップ
- 定期的なNeo4jデータベースのバックアップ
- バックアップスクリプトの自動実行

---

## トラブルシューティング

### Neo4jに接続できない
```bash
# Neo4jコンテナの状態確認
docker ps

# コンテナのログ確認
docker logs neo4j-community-resource

# コンテナの再起動
docker restart neo4j-community-resource
```

### パッケージのインストールエラー
```bash
# uvのキャッシュをクリア
uv cache clean

# 依存関係を再インストール
uv sync --reinstall
```

---

## まとめ

この仕様書は「コミュニティ・リソース・グラフ」の完全な実装ガイドです。
段階的に開発を進めることで、着実に機能を追加していくことができます。

**最初の一歩**: まずは基盤構築から始めましょう！
```bash
mkdir -p ~/Projects/community-resource-graph
cd ~/Projects/community-resource-graph
# このCLADE.mdをプロジェクトのルートに配置
# Claude Codeでプロジェクトを開いて開発開始！
```
