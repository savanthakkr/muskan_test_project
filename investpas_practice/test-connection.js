const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'redoq-dev-db-cluster.cluster-cs0kxsrqdtm7.ap-south-1.rds.amazonaws.com',
  user: 'savan.18seq',
  password: '1qaz!QAZ@WSX',
  database: 'project_investapas',
  connectionLimit: 1,
  connectionTimeout: 10000
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Connection failed:', err.code);
    console.error('Message:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connection successful!');
  
  connection.query('SELECT 1 as test', (err, results) => {
    if (err) {
      console.error('❌ Query failed:', err.message);
    } else {
      console.log('✅ Query successful - Database is accessible');
      console.log('Test result:', results);
    }
    pool.end(() => {
      process.exit(0);
    });
  });
});

setTimeout(() => {
  console.error('❌ Connection timeout');
  process.exit(1);
}, 15000);
