const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// 从环境变量获取数据库配置
const DATABASE_URL = process.env.PGDATABASE_URL;

async function createAdminUser(email, password) {
  // 解析数据库连接字符串
  const connectionString = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    // 生成密码哈希
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入管理员用户
    const query = `
      INSERT INTO users (email, password, name, is_admin, provider, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        is_admin = $4,
        updated_at = NOW()
      RETURNING id, email, is_admin
    `;

    const values = [email, hashedPassword, 'Admin', true, 'email'];
    const result = await pool.query(query, values);

    console.log('✓ Admin user created successfully!');
    console.log('Email:', result.rows[0].email);
    console.log('Is Admin:', result.rows[0].is_admin);
    console.log('\nYou can now log in at: http://localhost:5000/admin/login');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 从命令行参数获取邮箱和密码
const email = process.argv[2] || 'admin@example.com';
const password = process.argv[3] || 'admin123';

createAdminUser(email, password);
