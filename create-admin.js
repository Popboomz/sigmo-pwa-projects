const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    // 使用环境变量中的数据库连接
    const dbUrl = process.env.PGDATABASE_URL;
    if (!dbUrl) {
      console.error('未找到数据库连接字符串');
      process.exit(1);
    }

    const pool = new Pool({ connectionString: dbUrl });
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 检查用户是否已存在
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@example.com']
    );

    if (checkResult.rows.length > 0) {
      // 更新现有用户
      await pool.query(
        'UPDATE users SET password = $1, is_admin = true, updated_at = NOW() WHERE email = $2',
        [hashedPassword, 'admin@example.com']
      );
      console.log('✓ 管理员账户更新成功！');
    } else {
      // 创建新用户
      await pool.query(
        `INSERT INTO users (email, password, name, is_admin, provider, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        ['admin@example.com', hashedPassword, 'Admin', true, 'email']
      );
      console.log('✓ 管理员账户创建成功！');
    }

    await pool.end();

    console.log('邮箱: admin@example.com');
    console.log('密码: admin123');
    console.log('登录地址: http://localhost:5000/admin/login');
  } catch (error) {
    console.error('创建失败:', error.message);
    console.error(error.stack);
  }
}

createAdmin();
