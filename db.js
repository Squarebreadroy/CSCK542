const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '20191201',
    database: 'mydb'
}).promise();

module.exports = pool;