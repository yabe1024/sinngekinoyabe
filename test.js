class DanmakuStgTitleScene extends Scene {
    constructor(renderingTarget) {
        super('タイトル', 'black', renderingTarget);
        const title = new TextLabel(320, 200, '進撃の矢部');
        this.add(title);

        // 背景画像を表示する
        const backgroundImage = new Sprite(assets.get('titleBackgroundImage'), new Rectangle(0, 0, 800, 600)); // 背景画像のサイズに合わせてRectangleを指定
        this.add(backgroundImage);
    }

    update(gameInfo, input) {
        super.update(gameInfo, input);
        if(input.getKeyDown(' ')) {
            const mainScene = new DanmakuStgMainScene(this.renderingTarget);
            this.changeScene(mainScene);
        }
    }
}
