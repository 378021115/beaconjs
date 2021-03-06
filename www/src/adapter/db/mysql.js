"use strict";
const mysql = require("mysql2");
class SqlBlock {
    constructor(sql, args) {
        this.sql = sql;
        this.args = args == void 0 ? {} : args;
    }
}
class Mysql {
    constructor(options = null) {
        this.conn = null;
        this._inTransaction = 0;
        this._options = null;
        this.prefix = '';
        this.SqlList = [];
        this._options = options;
        if (this._options == null && Mysql._options == null) {
            let options = Beacon.getConfig('mysql:*');
            Mysql._options = options;
        }
        if (options != null) {
            this.prefix = options.prefix || '';
        }
        else {
            this.prefix = Mysql._options.prefix || '';
        }
    }
    static getDBInstance() {
        if (Mysql.instance != null) {
            return Mysql.instance;
        }
        return Mysql.instance = new Mysql();
    }
    static createPool() {
        Mysql.pool = mysql.createPool(Mysql._options);
    }
    async getConnection() {
        if (this.conn) {
            return this.conn;
        }
        if (this._options != null) {
            return this.conn = await new Promise(function (resolve, reject) {
                mysql.createConnection(this._options, function (err, connection) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(connection);
                });
            });
        }
        let that = this;
        if (Mysql.pool == null) {
            Mysql.createPool();
        }
        let deferred = Beacon.defer();
        Mysql.pool.getConnection(function (err, connection) {
            if (err) {
                return deferred.reject(err);
            }
            if (connection._onerror) {
                connection.removeListener('fail', connection._onerror);
            }
            connection._onerror = function (err) {
                that.release();
                console.log(err.code); // 'ER_BAD_DB_ERROR'
            };
            connection.once('fail', connection._onerror);
            return deferred.resolve(connection);
        });
        return this.conn = await deferred.promise;
    }
    async query(sql, args) {
        if (this._inTransaction > 0 && this.conn == null) {
            throw new Error('mysql is disconnect');
        }
        let conn = await this.getConnection();
        return await new Promise(function (resolve, reject) {
            if (args === void 0 || args === null) {
                conn.query(sql, function (err, result) {
                    if (err) {
                        if (Beacon.debug) {
                            err.sql = mysql.format(sql, args);
                        }
                        return reject(err);
                    }
                    return resolve(result);
                });
            }
            else {
                conn.query(sql, args, function (err, result) {
                    if (err) {
                        if (Beacon.debug) {
                            err.sql = mysql.format(sql, args);
                        }
                        return reject(err);
                    }
                    return resolve(result);
                });
            }
        });
    }
    async release() {
        if (this.conn) {
            Mysql.pool.releaseConnection(this.conn);
            this.conn.release();
            this.conn = null;
        }
    }
    async beginTransaction() {
        let conn = await this.getConnection();
        this._inTransaction++;
        if (this._inTransaction > 1) {
            return false;
        }
        return await new Promise(function (resolve, reject) {
            conn.beginTransaction(function (err) {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        });
    }
    async commit() {
        if (this.conn == null) {
            throw new Error('mysql is disconnect');
        }
        this._inTransaction--;
        if (this._inTransaction > 0) {
            return false;
        }
        let conn = this.conn;
        return await new Promise(function (resolve, reject) {
            conn.commit(function (err) {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        });
    }
    async rollback() {
        if (this.conn == null) {
            throw new Error('mysql is disconnect');
        }
        this._inTransaction--;
        if (this._inTransaction > 0) {
            return false;
        }
        let conn = this.conn;
        return await new Promise(function (resolve, reject) {
            conn.rollback(function (err) {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        });
    }
    async getRow(sql, args) {
        if (this.prefix) {
            sql = sql.replace('@pf_', this.prefix);
        }
        let rows = await this.query(sql, args);
        if (!rows || !rows[0]) {
            return null;
        }
        return rows[0];
    }
    async getList(sql, args) {
        if (this.prefix) {
            sql = sql.replace('@pf_', this.prefix);
        }
        return await this.query(sql, args);
    }
    async getOne(sql, args, name) {
        if (this.prefix) {
            sql = sql.replace('@pf_', this.prefix);
        }
        let row = await this.getRow(sql, args);
        if (!row) {
            return null;
        }
        if (name === void 0) {
            let key = Object.keys(row)[0];
            return row[key] === void 0 ? null : row[key];
        }
        return row[name] === void 0 ? null : row[name];
    }
    sqlBlock(sql, args) {
        if (this.prefix) {
            sql = sql.replace('@pf_', this.prefix);
        }
        return new SqlBlock(sql, args);
    }
    async insert(tbname, values) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        if (!Beacon.isObject(values)) {
            return null;
        }
        let names = [];
        let vals = [];
        for (let key in values) {
            let item = values[key];
            names.push(key);
            if (Beacon.isObject(item) && item instanceof SqlBlock) {
                vals.push(mysql.format(item.sql, item.args));
            }
            else if (Beacon.isBoolean(item)) {
                vals.push(item ? 1 : 0);
            }
            else if (item === null) {
                vals.push('NULL');
            }
            else {
                item = String(item);
                vals.push(mysql.escape(item));
            }
        }
        if (names.length == 0 || vals.length == 0) {
            return null;
        }
        let excsql = `INSERT INTO ${tbname} `;
        excsql += '(`' + names.join('`,`') + '`)';
        excsql += 'VALUES (' + vals.join(',') + ');';
        return await this.query(excsql);
    }
    async replace(tbname, values) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        if (!Beacon.isObject(values)) {
            return null;
        }
        let names = [];
        let vals = [];
        for (let key in values) {
            let item = values[key];
            names.push(key);
            if (Beacon.isObject(item) && item instanceof SqlBlock) {
                vals.push(mysql.format(item.sql, item.args));
            }
            else if (Beacon.isBoolean(item)) {
                vals.push(item ? 1 : 0);
            }
            else if (item === null) {
                vals.push('NULL');
            }
            else {
                item = String(item);
                vals.push(mysql.escape(item));
            }
        }
        if (names.length == 0 || vals.length == 0) {
            return null;
        }
        let excsql = `REPLACE  INTO ${tbname} `;
        excsql += '(`' + names.join('`,`') + '`)';
        excsql += 'VALUES (' + vals.join(',') + ');';
        return await this.query(excsql);
    }
    async update(tbname, values, where, args) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        if (!Beacon.isObject(values)) {
            return null;
        }
        let sets = [];
        for (let key in values) {
            let item = values[key];
            if (Beacon.isObject(item) && item instanceof SqlBlock) {
                sets.push('`' + key + '`=' + mysql.format(item.sql, item.args));
            }
            else if (Beacon.isBoolean(item)) {
                sets.push('`' + key + '`=' + (item ? 1 : 0));
            }
            else if (item === null) {
                sets.push('`' + key + '`=' + 'NULL');
            }
            else {
                item = String(item);
                sets.push('`' + key + '`=' + mysql.escape(item));
            }
        }
        if (sets.length == 0) {
            return null;
        }
        let excsql = `UPDATE ${tbname} SET `;
        excsql += sets.join(',');
        if (!where) {
            excsql += ' WHERE 1=1';
        }
        else {
            excsql += ' WHERE ' + mysql.format(where, args);
        }
        return await this.query(excsql);
    }
    async delete(tbname, where, args) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        let excsql = `DELETE  FROM ${tbname}`;
        if (!where) {
            excsql += ' WHERE 1=1';
        }
        else {
            excsql += ' WHERE ' + mysql.format(where, args);
        }
        return await this.query(excsql);
    }
    async getFields(tbname) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        return await this.query(`desc ${tbname};`);
    }
    async existsField(tbname, name) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        let row = await this.getRow(`describe ${tbname} \`${name}\`;`);
        return row !== null;
    }
    async addField(tbname, name, options = {}) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        options = Object.assign({
            type: 'VARCHAR',
            len: 250,
            scale: 0,
            def: null,
            comment: ''
        }, options);
        let { type, len, scale, def, comment } = options;
        type = String(type).toUpperCase();
        let excSql = `ALTER TABLE ${tbname} ADD \`${name}\` `;
        switch (type) {
            case 'VARCHAR':
            case 'INT':
            case 'BIGINT':
            case 'SMALLINT':
            case 'INTEGER':
            case 'TINYINT':
                excSql += type + '(' + len + ')';
                break;
            case 'DECIMAL':
            case 'DOUBLE':
            case 'FLOAT':
                excSql += type + '(' + len + ',' + scale + ')';
                break;
            default:
                excSql += type;
                break;
        }
        excSql += ' DEFAULT ' + mysql.escape(def);
        if (comment) {
            excSql += ' COMMENT ' + mysql.escape(comment);
        }
        excSql += ';';
        return await this.query(excSql);
    }
    async modifyField(tbname, name, options = {}) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        if (!await this.existsField(tbname, name)) {
            return await this.addField(tbname, name, options);
        }
        options = Object.assign({
            type: 'VARCHAR',
            len: 250,
            scale: 0,
            def: null,
            comment: ''
        }, options);
        let { type, len, scale, def, comment } = options;
        type = String(type).toUpperCase();
        let excSql = `ALTER TABLE ${tbname} MODIFY \`${name}\` `;
        switch (type) {
            case 'VARCHAR':
            case 'INT':
            case 'BIGINT':
            case 'SMALLINT':
            case 'INTEGER':
            case 'TINYINT':
                excSql += type + '(' + len + ')';
                break;
            case 'DECIMAL':
            case 'DOUBLE':
            case 'FLOAT':
                excSql += type + '(' + len + ',' + scale + ')';
                break;
            default:
                excSql += type;
                break;
        }
        excSql += ' DEFAULT ' + mysql.escape(def);
        if (comment) {
            excSql += ' COMMENT ' + mysql.escape(comment);
        }
        excSql += ';';
        return await this.query(excSql);
    }
    async updateField(tbname, oldname, newname, options = {}) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        //一样的
        if (oldname == newname) {
            return await this.modifyField(tbname, newname, options);
        }
        let chkOld = await this.existsField(tbname, oldname);
        let chkNew = await this.existsField(tbname, newname);
        if (!chkOld && !chkNew) {
            return await this.addField(tbname, newname, options);
        }
        if (chkNew) {
            return await this.modifyField(tbname, newname, options);
        }
        options = Object.assign({
            type: 'VARCHAR',
            len: 250,
            scale: 0,
            def: null,
            comment: ''
        }, options);
        let { type, len, scale, def, comment } = options;
        type = String(type).toUpperCase();
        let excSql = `ALTER TABLE ${tbname} CHANGE \`${oldname}\` \`${newname}\` `;
        switch (type) {
            case 'VARCHAR':
            case 'INT':
            case 'BIGINT':
            case 'SMALLINT':
            case 'INTEGER':
            case 'TINYINT':
                excSql += type + '(' + len + ')';
                break;
            case 'DECIMAL':
            case 'DOUBLE':
            case 'FLOAT':
                excSql += type + '(' + len + ',' + scale + ')';
                break;
            default:
                excSql += type;
                break;
        }
        excSql += ' DEFAULT ' + mysql.escape(def);
        if (comment) {
            excSql += ' COMMENT ' + mysql.escape(comment);
        }
        excSql += ';';
        return await this.query(excSql);
    }
    async dropField(tbname, name) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        if (await this.existsField(tbname, name)) {
            let excSql = `ALTER TABLE ${tbname} DROP \`${name}\` ;`;
            return await this.query(excSql);
        }
        return null;
    }
    async existsTable(tbname) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        let row = await this.getRow('SHOW TABLES LIKE ?;', tbname);
        return row != null;
    }
    async dropTable(tbname) {
        if (this.prefix) {
            tbname = tbname.replace('@pf_', this.prefix);
        }
        let row = await this.getRow('DROP TABLE IF EXISTS ?;', tbname);
        return row != null;
    }
}
Mysql.pool = null;
Mysql._options = null;
Mysql.instance = null;
exports.Mysql = Mysql;
//# sourceMappingURL=mysql.js.map