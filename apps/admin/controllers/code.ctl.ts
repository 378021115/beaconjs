import {Beacon} from "../../../src/core/beacon";
import {Captcha} from "../../../src/adapter/pnglib/captcha";

import gm = require("gm");
import path = require('path');


export class Code extends Beacon.Controller {


    //使用gm库 需要安装 GraphicsMagick
    public async indexAction() {

        function rand(start, end) {
            let p = Math.round(Math.random() * (end - start));
            return start + p;
        }
        function randcode(len = 4) {
            let text = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let out = [];
            for (let i = 0; i < len; i++) {
                let idx = Math.round(Math.random() * (text.length - 1));
                out.push(text[idx]);
            }
            return out.join('');
        }
        await this.initSesion();
        let code = randcode(4).toUpperCase();
        let bcode = randcode(4);
        console.log(code);
        this.setSession('code', code);
        let buffer = await new Promise(function (resolve, reject) {
            let bgcolor = 'rgb(240,243,248)';
            let w = 70, h = 26;
            let img = gm(w, h, bgcolor);
            let textcolor = 'rgb(' + rand(0, 150) + ',' + rand(0, 150) + ',' + rand(0, 150) + ')';
            img.font(path.join(Beacon.RUNTIME_PATH, 'font', 'wingding.ttf'), 24);
            for (let i = 0; i < bcode.length; i++) {
                let x = (15 * i) + rand(6, 10);
                let y = rand(15, 25);
                img.fontSize(rand(25, 30)).stroke('none', 0).fill(textcolor).drawText(x, y, bcode[i]);
            }
            img.implode(1);
            img.font(path.join(Beacon.RUNTIME_PATH, 'font', 'arialbd.ttf'), 24);
            for (let i = 0; i < code.length; i++) {
                let x = (15 * i) + rand(5, 7);
                let y = rand(16, 24);
                img.fontSize(rand(18, 24)).stroke(textcolor, 1).fill(bgcolor).drawText(x, y, code[i]);
            }
            img.implode(-0.2);
            img.toBuffer('PNG', function (err, buffer) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(buffer);
            });
        });
        this.setContentType('png');
        this.end(buffer);
    }

    //无组件，不完善的png库

    public async imgAction() {
        await this.initSesion();
        let code = Beacon.randNumber(4);
        console.log(code);
        this.setSession('code', code);
        let oo = new Captcha(70, 26, code);
        this.setContentType('png');
        this.end(oo.captchapng().getBuffer());

    }

}