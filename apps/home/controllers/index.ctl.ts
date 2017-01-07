import {Beacon} from "../../../src/core/beacon";
import {Mysql} from "../../../src/adapter/db/mysql";
import {Redis} from "../../../src/adapter/db/redis";

export class Index extends Beacon.Controller {

    public redis: Redis;

    public async init() {
        await this.initSesion();
        // await this.initDB('mysql');
        this.redis = Redis.getRedisInstance();
    }


    public async indexAction() {
        let db: Mysql = this.db;
        console.log(this.getSession('abc'));
        this.assign('title', this.getSession('abc'));
        this.assign('foot_content', 'All rights reserved.');
        this.assign('meetingPlace', 'New York');
        //  throw new Error('数据异常请重试.');
        this.display('index');
        console.log(Date.now() - this.context.startTime);
    }

    public async loginAction() {
        console.log(await this.redis.get('abc'));
        console.log(Date.now() - this.context.startTime);
        this.setSession('abc', 'xxxxxx');
        this.end('login');
    }
}