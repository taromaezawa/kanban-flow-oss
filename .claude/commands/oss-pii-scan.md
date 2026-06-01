---
description: OSSリポジトリの個人情報・業務情報・認証情報を検出し、公開可否を判定する
---

# OSS 個人情報・機密情報スキャン

カレントリポジトリ内の全ファイルを対象に、OSSとして公開してはいけない情報を検出します。

## 実行手順

Explore エージェントを使って以下の検索を実施し、結果をレポートしてください。

### 1. メールアドレス検索

```bash
grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  "[a-zA-Z0-9._%+-]\+@[a-zA-Z0-9.-]\+\.[a-zA-Z]\{2,\}" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.json" --include="*.md" --include="*.sql" \
  --include="*.yml" --include="*.yaml" .
```

### 2. 日本人名・組織名検索

引数で渡されたキーワード（$ARGUMENTS）を検索。未指定の場合は一般的な個人名パターンを検索：

```bash
grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  "佐藤\|鈴木\|高橋\|田中\|渡辺\|伊藤\|山本\|中村\|小林\|加藤" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.json" --include="*.md" --include="*.sql" .
```

$ARGUMENTS が指定されている場合は、そのキーワードでも追加検索する。

### 3. 認証情報・シークレット検索

```bash
grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  "xoxb-\|xoxp-\|sk-\|ghp_\|DATABASE_URL\s*=\s*[^ ]\|password\s*=\s*[^ ]" \
  --include="*.ts" --include="*.js" --include="*.json" \
  --include="*.env" --include="*.env.*" \
  --exclude="*.example" . 2>/dev/null
```

### 4. 内部URL・IPアドレス検索

```bash
grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  "192\.168\.\|10\.\|172\.\(1[6-9]\|2[0-9]\|3[01]\)\.\|localhost:[0-9]\{4,\}\|\.internal\b" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.json" --include="*.md" . 2>/dev/null
```

### 5. .gitignore で除外されているか確認

```bash
cat .gitignore
```

## レポート形式

検出された各項目について：

| ファイル | 行 | 内容（抜粋） | リスク | 公開可否 | 対処法 |
|---------|-----|------------|--------|---------|--------|
| path/to/file.ts | 42 | "email@example.com" | 個人情報 | **NG** | 削除または匿名化 |

### リスク分類

- 🔴 **NG（削除必須）**: 実在する個人・組織の特定情報、認証情報、APIキー
- 🟡 **要確認**: コンタクト用メール、サンプルデータ、公開意図が不明な情報
- 🟢 **OK**: テンプレート記述、example.comドメイン、公開済みURL

### 最終判定

- **公開可**: 問題なし
- **要修正後公開**: 具体的な修正箇所リストを提示
- **公開不可**: 重大な情報漏洩リスクあり
