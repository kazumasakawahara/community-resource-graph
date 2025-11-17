import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:17687',
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || 'neo4j',
    process.env.NEO4J_PASSWORD || 'community-resource-dev-2024'
  )
);

async function checkUsers() {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (u:User)
      RETURN u.id AS id, u.email AS email, u.name AS name, u.role AS role
      ORDER BY u.id
      LIMIT 10
    `);

    console.log('📊 総ユーザー数:', result.records.length + '件\n');

    if (result.records.length === 0) {
      console.log('❌ ユーザーが存在しません');
    } else {
      console.log('👥 ユーザー一覧:');
      result.records.forEach(record => {
        const id = record.get('id');
        const email = record.get('email');
        const name = record.get('name');
        const role = record.get('role');
        console.log('  -', id, ':', email, '(', name, ') -', role);
      });
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

checkUsers();
