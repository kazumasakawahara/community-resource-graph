// Neo4j インデックス作成スクリプト
// Community Resource Graph プロジェクト用

// Resource ノードのインデックス
CREATE INDEX resource_id_index IF NOT EXISTS FOR (r:Resource) ON (r.id);
CREATE INDEX resource_name_index IF NOT EXISTS FOR (r:Resource) ON (r.name);
CREATE INDEX resource_type_index IF NOT EXISTS FOR (r:Resource) ON (r.type);

// Area ノードのインデックス
CREATE INDEX area_id_index IF NOT EXISTS FOR (a:Area) ON (a.id);
CREATE INDEX area_name_index IF NOT EXISTS FOR (a:Area) ON (a.name);

// Tag ノードのインデックス
CREATE INDEX tag_id_index IF NOT EXISTS FOR (t:Tag) ON (t.id);
CREATE INDEX tag_name_index IF NOT EXISTS FOR (t:Tag) ON (t.name);

// User ノードのインデックス
CREATE INDEX user_id_index IF NOT EXISTS FOR (u:User) ON (u.id);
CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email);

// 全文検索インデックス（Resource用）
CREATE FULLTEXT INDEX resource_fulltext IF NOT EXISTS
  FOR (r:Resource) ON EACH [r.name, r.description, r.address];

// 全文検索インデックス（Tag用）
CREATE FULLTEXT INDEX tag_fulltext IF NOT EXISTS
  FOR (t:Tag) ON EACH [t.name, t.description];
