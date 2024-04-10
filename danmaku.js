'use strict';

class TextLabel extends Actor {
    constructor(x, y, text) {
        const hitArea = new Rectangle(0, 0, 0, 0);
        super(x, y, hitArea);
        
        this.text = text;
    }

    render(target) {
        const context = target.getContext('2d');
        context.font = '25px sans-serif';
        context.fillStyle = 'white';
        context.fillText(this.text, this.x, this.y);
    }
}

class Bullet extends SpriteActor {
    constructor(x, y) {
        const sprite = new Sprite(assets.get('sprite'), new Rectangle(0, 16, 16, 16));
        const hitArea = new Rectangle(4, 0, 8, 16);
        super(x, y, sprite, hitArea, ['playerBullet']);

        this._speed = 6;

        // 敵に当たったら消える
        this.addEventListener('hit', (e) => {
           if(e.target.hasTag('enemy')) { this.destroy(); } 
        });
    }

    update(gameInfo, input) {
        this.y -= this._speed;
        if(this.isOutOfBounds(gameInfo.screenRectangle)) {
            this.destroy();
        }
    }
}

class Fighter extends SpriteActor {
    constructor(x, y) {
        const sprite = new Sprite(assets.get('sprite'), new Rectangle(0, 0, 16, 16));
        const hitArea = new Rectangle(8, 8, 2, 2);
        super(x, y, sprite, hitArea);

        this._interval = 1;
        this._timeCount = 0;
        this._speed = 2;
        this._velocityX = 0;
        this._velocityY = 0;
        
        // 敵の弾に当たったらdestroyする
        this.addEventListener('hit', (e) => {
           if(e.target.hasTag('enemyBullet')) {
               this.destroy();
           } 
        });
    }
    
    update(gameInfo, input) {
        // キーを押されたら移動する
        this._velocityX = 0;
        this._velocityY = 0;

        if(input.getKey('ArrowUp')) { this._velocityY = -this._speed; }
        if(input.getKey('ArrowDown')) { this._velocityY = this._speed; }
        if(input.getKey('ArrowRight')) { this._velocityX = this._speed; }
        if(input.getKey('ArrowLeft')) { this._velocityX = -this._speed; }
        
        this.x += this._velocityX;
        this.y += this._velocityY;

        // 画面外に行ってしまったら押し戻す
        const boundWidth = gameInfo.screenRectangle.width - this.width;
        const boundHeight = gameInfo.screenRectangle.height - this.height;
        const bound = new Rectangle(this.width, this.height, boundWidth, boundHeight);
        
        if(this.isOutOfBounds(bound)) {
            this.x -= this._velocityX;
            this.y -= this._velocityY;
        }

        // スペースキーで弾を打つ
        this._timeCount++;
        const isFireReady = this._timeCount > this._interval;
        if(isFireReady && input.getKey(' ')) {
            const bullet = new Bullet(this.x, this.y);
            this.spawnActor(bullet);
            this._timeCount = 0;
        }
    }
}

class EnemyBullet extends SpriteActor {
    constructor(x, y, velocityX, velocityY, isFrozen = false) {
        const sprite = new Sprite(assets.get('sprite'), new Rectangle(16, 16, 16, 16));
        const hitArea = new Rectangle(4, 4, 8, 8);
        super(x, y, sprite, hitArea, ['enemyBullet']);

        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.isFrozen = isFrozen;
    }

    update(gameInfo, input) {
        if(!this.isFrozen) {
            this.x += this.velocityX;
            this.y += this.velocityY;
        }

        if(this.isOutOfBounds(gameInfo.screenRectangle)) {
            this.destroy();
        }
    }
}

class FireworksBullet extends EnemyBullet {
    constructor(x, y, velocityX, velocityY, explosionTime) {
        super(x, y, velocityX, velocityY);

        this._eplasedTime = 0;
        this.explosionTime = explosionTime;
    }

    // degree度の方向にspeedの速さで弾を発射する
    shootBullet(degree, speed) {
        const rad = degree / 180 * Math.PI;
        const velocityX = Math.cos(rad) * speed;
        const velocityY = Math.sin(rad) * speed;

        const bullet = new EnemyBullet(this.x, this.y, velocityX, velocityY);
        this.spawnActor(bullet);
    }

    // num個の弾を円形に発射する
    shootCircularBullets(num, speed) {
        const degree = 360 / num;
        for(let i = 0; i < num; i++) {
            this.shootBullet(degree * i, speed);
        }
    }

    update(gameInfo, input) {
        super.update(gameInfo, input);

        // 経過時間を記録する
        this._eplasedTime++;
        
        // 爆発時間を超えたら弾を生成して自身を破棄する
        if(this._eplasedTime > this.explosionTime) {
            this.shootCircularBullets(10, 2);
            this.destroy();
        }
    }
}

assets.addImage('enemySprite', 'enemy.png');

class Enemy extends SpriteActor {
    constructor(x, y) {
        const sprite = new Sprite(assets.get('enemySprite'), new Rectangle(0, 0, 32, 32)); // 32x32の敵画像を想定
        const hitArea = new Rectangle(0, 0, 32, 32); // ヒットエリアを画像サイズに合わせる
        super(x, y, sprite, hitArea, ['enemy']);

        this.maxHp = 50;
        this.currentHp = this.maxHp;
        
        this.fireInterval = 50;
        this.fireCooldown = 0;

        // プレイヤーの弾に当たったらHPを減らす
        this.addEventListener('hit', (e) => {
           if(e.target.hasTag('playerBullet')) {
               this.currentHp--;
               this.dispatchEvent('changehp', new GameEvent(this));
           }
        });

        // 初期速度をランダムに設定する
        this.vx = Math.random() * 4 - 2; // x方向の速度
        this.vy = Math.random() * 4 - 2; // y方向の速度
    }

    update(gameInfo, input) {
        // ショットのクールダウンを減らす
        this.fireCooldown--;

        // インターバルを経過していたら弾を撃つ
        if (this.fireCooldown <= 0) {
            this.fireBullet();
            this.fireCooldown = this.fireInterval;
        }

        // HPがゼロになったらdestroyする
        if (this.currentHp <= 0) {
            this.destroy();
        }

        // 敵の移動
        this.moveRandomly();

        // 画面外に行ったら速度を反転させて画面内に戻る
        if (this.x < 0 || this.x > gameInfo.screenRectangle.width - this.width) {
            this.vx *= -1;
        }
        if (this.y < 0 || this.y > gameInfo.screenRectangle.height - this.height) {
            this.vy *= -1;
        }

        // 座標を更新する
        this.x += this.vx;
        this.y += this.vy;
    }

    fireBullet() {
        const explosionTime = 50;
        const bullet = new FireworksBullet(this.x, this.y, 0, 2, explosionTime); // 固定速度で上に向かって弾を発射
        this.spawnActor(bullet);
    }

    moveRandomly() {
        const speed = 50; // 移動速度を調整
const angle = Math.random() * 2 * Math.PI; // ランダムな角度を生成
this.vx = Math.cos(angle) * speed; // x方向の速度
this.vy = Math.sin(angle) * speed; // y方向の速度
this.x += this.vx;
this.y += this.vy;
    }
}





class EnemyHpBar extends Actor {
    constructor(x, y, enemy) {
        const hitArea = new Rectangle(0, 0, 0, 0);
        super(x, y, hitArea);

        this._width = 200;
        this._height = 10;
        
        this._innerWidth = this._width;

        // 敵のHPが変わったら内側の長さを変更する
        enemy.addEventListener('changehp', (e) => {
            const maxHp = e.target.maxHp;
            const hp = e.target.currentHp;
            this._innerWidth = this._width * (hp / maxHp);
        });
    }

    render(target) {
        const context = target.getContext('2d');
        context.strokeStyle = 'white';
        context.fillStyle = 'white';
        
        context.strokeRect(this.x, this.y, this._width, this._height);
        context.fillRect(this.x, this.y, this._innerWidth, this._height);
    }
}

class DanmakuStgEndScene extends Scene {
    constructor(renderingTarget) {
        super('クリア', 'black', renderingTarget);
        const text = new TextLabel(310, 200, 'ゲームクリア！');
        this.add(text);
    }
}

class DanmakuStgGameOverScene extends Scene {
    constructor(renderingTarget) {
        super('ゲームオーバー', 'black', renderingTarget);
        const text = new TextLabel(300, 200, 'ゲームオーバー…');
        this.add(text);
    }
}

class DanmakuStgMainScene extends Scene {
    constructor(renderingTarget) {
        super('メイン', 'black', renderingTarget);
        const fighter = new Fighter(150, 300);
        const enemy1 = new Enemy(150, 100);
        const enemy2 = new Enemy(550, 100); // 新しい敵を追加
        const hpBar1 = new EnemyHpBar(50, 20, enemy1);
        const hpBar2 = new EnemyHpBar(540, 20, enemy2); // 新しい敵のHPバーを追加
        this.add(fighter);
        this.add(enemy1);
        this.add(enemy2); // 新しい敵をシーンに追加
        this.add(hpBar1);
        this.add(hpBar2); // 新しい敵のHPバーをシーンに追加

        let destroyedEnemies = 0; // 破壊された敵の数を追跡するための変数

        // 自機がやられたらゲームオーバー画面にする
        fighter.addEventListener('destroy', (e) => {
            const scene = new DanmakuStgGameOverScene(this.renderingTarget);
            this.changeScene(scene);
        });

        // 敵がやられたら破壊された敵の数を更新し、全ての敵が破壊された場合はクリア画面にする
        const checkForWinCondition = () => {
            destroyedEnemies++;
            if (destroyedEnemies === 2) {
                const scene = new DanmakuStgEndScene(this.renderingTarget);
                this.changeScene(scene);
            }
        };

        enemy1.addEventListener('destroy', checkForWinCondition);
        enemy2.addEventListener('destroy', checkForWinCondition);
    }
}



class DanmakuStgTitleScene extends Scene {
    constructor(renderingTarget) {
        super('タイトル', 'black', renderingTarget);
        const title = new TextLabel(320, 200, '進撃の矢部');
        this.add(title);
    }

    update(gameInfo, input) {
        super.update(gameInfo, input);
        if(input.getKeyDown(' ')) {
            const mainScene = new DanmakuStgMainScene(this.renderingTarget);
            this.changeScene(mainScene);
        }
    }
}

class DanamkuStgGame extends Game {
    constructor() {
        super('進撃の矢部', 800, 600, 60); // 幅: 800, 高さ: 600 に変更
        const titleScene = new DanmakuStgTitleScene(this.screenCanvas);
        this.changeScene(titleScene);
    }
}


assets.addImage('sprite', 'sprite.png',);
assets.loadAll().then(() => {
    const game = new DanamkuStgGame();
    document.body.appendChild(game.screenCanvas);
    game.start();
});


// スクロールイベントをキャプチャしてデフォルトのスクロール動作を停止する
document.addEventListener('scroll', (e) => {
    e.preventDefault();
}, { passive: false });

