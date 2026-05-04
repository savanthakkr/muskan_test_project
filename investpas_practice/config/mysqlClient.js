let Promise = require('bluebird'),
    mysql = require('mysql2'),
    using = Promise.using;

let dbs = require("../vars/db").dbs;
let dbs_login = require("../vars/db").dbs_login;
let constants = require("../vars/constants");
let utility = require("../helpers/utility");

let env = (process.env.NODE_ENV == 'production') ? 'prod' : 'dev';
let pools = {};
let base = {
    host: 'localhost' ,// DB host (change to localhost for local setup)
    user: 'root',
    password: '',         // MySQL password
    database: 'investpas_local',        // will be set dynamically per DB

    connectionLimit: 50,        // max connections in pool
    multipleStatements: true,    // allow multiple SQL queries in one call
    dateStrings: true,          // return dates as strings instead of JS Date objects

    typeCast: function (field, next) {
        // Custom handling for BIT(1) fields
        if (field.type === "BIT" && field.length === 1) {
            const bit = field.string();
            return bit === null ? null : bit.charCodeAt(0);
        }
        return next();
    }
};


exports.connection = async () => new Promise(
    (resolve, reject) => {
        if (!utility.checkEmpty(dbs)) {
            Object.keys(dbs).forEach(function (d) {
                let o = Object.assign({}, base);
                o['database'] = dbs[d].database;
                if (!utility.checkEmpty(constants.vals.service_name) && !utility.checkEmpty(dbs_login[constants.vals.service_name])) {
                    o['user'] = dbs_login[constants.vals.service_name].user;
                    o['password'] = dbs_login[constants.vals.service_name].password;
                }

                let readPool = Object.assign({}, o);
                let writePool = Object.assign({}, o);

                readPool.host = dbs[d].read;
                writePool.host = dbs[d].write;

                console.log("dbsd", dbs[d], "readPool", readPool, "writePool", writePool);
                pools[d] = {
                    read: mysql.createPool(readPool),
                    write: mysql.createPool(writePool),
                };
            });
            constants.vals.dbconn = pools;
        }
        resolve(pools);
    });

exports.query = async (database, qry, params) => new Promise(
    (resolve, reject) => {


        let queryType = 'write';

        qry = typeof qry === 'string' ? qry.trim() : '';

        if (!constants.vals.dbconn || !constants.vals.dbconn[database]) {
            throw new Error("DB pool not initialized: " + database);
        }

        let connectionObj = constants.vals.dbconn[database][queryType];

        try {
            connectionObj.getConnection(function (err, connection) {
                if (err) {
                    console.error('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
                    console.error(mysql.format(qry, params));
                    console.error('------------------------------------------------------------------------------------------------');
                    console.error('runQry-cannot getConnection ERROR: ' + database, err);
                    reject(err);
                }
                connection.query(qry, params, function (err, result) {
                    if (database == 'mysql_test') {
                        let querylog = {};
                        querylog.querylog_Product = 'serv-nodejs';
                        querylog.querylog_Database = database;
                        querylog.querylog_Stmt = qry;
                        querylog.querylog_Params = params;
                        querylog.querylog_Query = mysql.format(qry, params);
                        try {
                            //constants.vals.mongodbconn[constants.vals.commonDB].model("querylog")(querylog).save();
                        } catch (e) {
                            console.log('MDB ERR', e);
                        }
                    }
                    connection.release();
                    if (err) {
                        console.error('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
                        console.error(mysql.format(qry, params));
                        console.error('------------------------------------------------------------------------------------------------');
                        console.error('runQry-cannot Query ERROR:' + database, err);
                        reject(err);
                    }

                    resolve(result);
                });
            });
        } catch (err) {
            console.log('Connection error ', database, err);
        }
    });

    

// const mysql = require('mysql2/promise');

// // Create a pool with promise-based API
// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'project_investapas',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// async function testConnection() {
//     try {
//         console.log('Database connected successfully.');
//     } catch (error) {
//         console.error('Error while connecting to the database:', error);
//     }
// }

// // Run the test function
// testConnection();

// module.exports = pool;

