// 创建pixi pixi会创建canvas并插入到页面中
let app = new PIXI.Application({
    width: 512,
    height: 512
});
document.body.appendChild(app.view);
// 对常用类命名 TODO 不要() eg:PIXI.Container()
let Container = PIXI.Container;
let Sprite = PIXI.Sprite;
// 加载资源
let loader = new PIXI.loaders.Loader();
loader
    .add('treasureHunter', './images/treasureHunter.json')
    // .add('dungeon', './images/dungeon.png')
    .load(setup);
let state = 'ready';
let totalLife = 4;
let isGotTreasure = false;
let isComplete = false;
let isHitBlob = false;
let redBar = undefined; //血条
let explorer = undefined; //探险者
let dungeon = undefined; //地牢
let door = undefined; //门
let blobArr = []; //小怪物array
let treasure = undefined //宝藏
let gameScene = undefined;
let gameEndScene = undefined;
let wonText = undefined;
let loseText = undefined;
const TICKER = new PIXI.Ticker();

let range = {
    x: 28,
    y: 10,
    width: 488,
    height: 480
}
const speed = {
    left: -2,
    up: -2,
    right: 2,
    down: 2
}

/* 初始化游戏 */
function setup(loader, resources) {
    let textures = resources.treasureHunter.textures; // 游戏所有纹理对象
    gameScene = new Container(); // 游戏场景容器
    gameScene.visible = true;
    app.stage.addChild(gameScene);
    gameEndScene = new Container(); // 游戏结束场景容器
    gameEndScene.visible = false; // 隐藏游戏结束场景 需要时show
    app.stage.addChild(gameEndScene);
    // 创建地牢
    dungeon = new Sprite(textures['dungeon.png']);
    gameScene.addChild(dungeon);
    // 创建door
    door = new Sprite(textures['door.png']);
    door.x = 50;
    door.y = 0;
    gameScene.addChild(door);
    // 创建宝藏猎手
    explorer = new Sprite(textures['explorer.png']);
    explorer.x = door.x + door.width / 2 - explorer.width / 2; //人物出现在门口
    explorer.y = door.height;
    explorer.vx = 0;
    explorer.vy = 0;
    gameScene.addChild(explorer);
    // 创建宝藏
    treasure = new Sprite(textures['treasure.png']);
    treasure.x = dungeon.width - 80;
    treasure.y = dungeon.height - 80;
    gameScene.addChild(treasure);
    // 创建小怪物
    let blobNumber = 8; //小怪物数量
    let space = 50; //间距
    let offsetX = 88; //距离舞台左侧的初始距离
    let direction = 1; //运动方向
    for (let i = 0; i < blobNumber; i++) {
        let blob = new Sprite(textures['blob.png']);
        blob.x = space * i + offsetX; //固定x间隔摆放小怪物
        blob.y = randomInt(50, dungeon.height - 50); //随机小怪物y坐标
        direction *= -1; //让相邻小怪物反向运动
        blob.direction = direction;
        blob.vy = 1;
        gameScene.addChild(blob);
        blobArr.push(blob);
    }
    // 创建血条
    let healthBar = new Container();
    healthBar.x = dungeon.width - 170;
    healthBar.y = 4;
    gameScene.addChild(healthBar);
    // 创建空血条
    let blackBar = new PIXI.Graphics();
    blackBar.beginFill(0x000000);
    blackBar.drawRect(0, 0, 128, 8);
    blackBar.endFill();
    healthBar.addChild(blackBar);
    // 创建剩余血量
    redBar = new PIXI.Graphics();
    redBar.beginFill(0xFF3300);
    redBar.drawRect(0, 0, 128, 8);
    redBar.endFill();
    redBar.pivot.x = 128;
    redBar.x = 128;
    redBarWidth = redBar.width;
    healthBar.addChild(redBar);
    healthBar.redBar = redBar;
    // 创建游戏结束页
    let textContainer = new Container();
    let textStyle = new PIXI.TextStyle({ //文本样式
        fontFamily: "Futura",
        fontSize: 64,
        fill: "white"
    });
    wonText = new PIXI.Text('YOU WON ^_^', textStyle);
    loseText = new PIXI.Text('YOU LOSE T_T', textStyle);
    wonText.visible = false;
    loseText.visible = true;
    textContainer.addChild(wonText);
    textContainer.addChild(loseText);
    textContainer.x = 512 / 2 - loseText.width / 2; //水平居中
    textContainer.y = 512 / 2 - loseText.height / 2; //垂直居中
    gameEndScene.addChild(textContainer);
    // 控制猎人移动
    // 创建键盘映射
    let left = keyboard(37);
    let up = keyboard(38);
    let right = keyboard(39);
    let down = keyboard(40);
    // 上下左右键按下和抬起的方法 TODO 优化两个键同时按下的逻辑
    left.press = () => {
        explorer.vx = speed.left;
        explorer.vy = 0; //防止同时按下相邻方向 人物走斜线
    };
    left.release = () => {
        // 防止 按键冲突
        if (!right.isDown && explorer.vy === 0) {
            explorer.vx = 0;
        }
    };
    up.press = () => {
        explorer.vx = 0;
        explorer.vy = speed.up;
    };
    up.release = () => {
        if (!down.isDown && explorer.vx === 0) {
            explorer.vy = 0;
        }
    };
    right.press = () => {
        explorer.vx = speed.right;
        explorer.vy = 0;
    };
    right.release = () => {
        if (!left.isDown && explorer.vy === 0) {
            explorer.vx = 0;
        }
    };
    down.press = () => {
        explorer.vx = 0;
        explorer.vy = speed.down;
    };
    down.release = () => {
        if (!up.isDown && explorer.vx === 0) {
            explorer.vy = 0;
        }
    };
    state = 'play'; // 更新游戏状态
    TICKER.stop();
    TICKER.add(gameLoop);
    TICKER.start();
}
/* 游戏循环 */
function gameLoop(params) {
    // 移动探险者
    explorer.x += explorer.vx;
    explorer.y += explorer.vy;
    // 限定移动范围
    contain(explorer, range)
    // 移动小怪物
    // 小怪物撞墙往回走
    blobArr.forEach((blob) => {
        // 移动
        blob.y += blob.vy * blob.direction;
        // 计算是否撞墙
        let calcHitWall = contain(blob, range)
        // 撞墙改变方向
        if (calcHitWall === 'up') {
            blob.direction = 1;
        }
        if (calcHitWall === 'down') {
            blob.direction = -1;
        }
        // 如果碰到小怪物
        if (hitTest(explorer, blob)) {
            hitBlob();
        }
    })
    // 如果碰到宝藏
    if (hitTest(explorer, treasure)) {
        if (!isGotTreasure) {
            getTreasure();
        }
    }
    // 如果碰到门
    if (hitTest(explorer, door)) {
        hidDoor();
    }
}
/* play */
function play(params) {

}
/* end */
function end(params) {
    state = 'end';
    TICKER.stop();
    // 切换游戏场景
    gameScene.visible = false;
    gameEndScene.visible = true;
    // 显示游戏结果
    if (isComplete) {
        wonText.visible = true;
        loseText.visible = false;
    } else {
        wonText.visible = false;
        loseText.visible = true;
    }
}
/* 碰到小怪物的方法 */
function hitBlob() {
    if (isHitBlob) return;
    console.log('被抓住啦');
    isHitBlob = true;
    // 无敌时间
    setTimeout(() => {
        isHitBlob = false;
    }, 1500);
    if (redBar.width === 0) return;
    redBar.width -= redBarWidth / totalLife;
    if (redBar.width === 0) {
        isComplete = false;
        end();
    }


}
/* 碰到宝藏的方法 */
function getTreasure() {
    console.log('找到宝藏啦');
    isGotTreasure = true;
    treasure.parent.removeChild(treasure);
}
/* 碰到门的方法 */
function hidDoor() {
    console.log('任务完成');
    if (!isGotTreasure) return;
    isComplete = true;
    end();
}
/* 随机一个a-b的整数 */
function randomInt(a, b) {
    return parseInt(Math.random() * (b - a + 1) + a, 10);
}

/* 按键相关方法 */
function keyboard(keycode) {
    let key = {};
    key.code = keycode; //监听的按键
    key.isUp = true; //是否抬起
    key.isDown = false; //是否按下
    key.press = undefined; //自定义方法 按下时执行
    key.release = undefined; //自定义方法 抬起时执行
    // 按下时执行
    key.downHandler = function (event) {
        if (this.code === event.keyCode) {
            if (this.isUp && this.press) {
                this.press();
            }
            this.isUp = false;
            this.isDown = true;
        }
    };
    // 抬起时执行
    key.upHandler = function (event) {
        if (this.code === event.keyCode) {
            if (key.isDown && key.release) {
                key.release();
            }
            key.isUp = true;
            key.isDown = false;
        }
    }
    // 监听按键抬起和按下
    window.addEventListener('keydown', key.downHandler.bind(key), false);
    window.addEventListener('keyup', key.upHandler.bind(key), false);
    return key;
}
/* 计算是否碰撞到墙壁 */
function contain(target, container) {
    let collision = ''
    if (target.x < container.x) {
        target.x = container.x
        collision = 'left'
    }
    if (target.y < container.y) {
        target.y = container.y
        collision = 'up'
    }
    if (target.x > container.width - container.x) {
        target.x = container.width - container.x
        collision = 'right'
    }
    if (target.y > container.height - container.y) {
        target.y = container.height - container.y
        collision = 'down'
    }
    return collision;
}
/* 碰撞检测 
 * a检测对象1 b检测对象2
 */
function hitTest(a, b) {
    let isHit;
    let isHitX = Math.abs(a.x - b.x) < a.width / 2 + b.width / 2;
    let isHitY = Math.abs(a.y - b.y) < a.height / 2 + b.height / 2;
    if (isHitX && isHitY) {
        isHit = true;
    }
    return isHit;
}