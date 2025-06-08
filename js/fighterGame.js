// === Fighter Class ===
class Fighter extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key, punchTexture, kickTexture, hitboxWidth = 80, hitboxHeight = 80, hitboxOffset = 60, facingLeft = false, uniquePower = null) {
    super(scene, x, y, key);
    this.defaultTexture = key;
    this.punchTexture = punchTexture;
    this.kickTexture = kickTexture;
    this.hitboxOffset = hitboxOffset;
    this.facingLeft = facingLeft;
    this.scene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(FIGHTERS[key]?.scale || 0.36);
    this.setCollideWorldBounds(true);

    this.hp = 100;
    this.isAttacking = false;
    this.hasHit = false;
    this.isAI = false;
    this.invincible = false;
    this.comboCount = 0;
    this.superMeter = 0;
    this.juggleTimer = 0;
    this.uniquePower = uniquePower;

    this.attackBox = scene.add.rectangle(0, 0, hitboxWidth, hitboxHeight, 0xff0000, 0);
    scene.physics.add.existing(this.attackBox);
    this.attackBox.body.setAllowGravity(false);

    this.dashing = false;

    if (uniquePower) uniquePower(this);
  }

  updateAttackBox() {
    this.setFlipX(this.facingLeft);
    this.attackBox.x = this.facingLeft ? this.x - this.hitboxOffset : this.x + this.hitboxOffset;
    this.attackBox.y = this.y;
  }

  punch() {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.hasHit = false;
    this.setTexture(this.punchTexture);
    this.setFlipX(this.facingLeft);
    this.scene.time.delayedCall(160, () => {
      this.isAttacking = false;
      this.setTexture(this.defaultTexture);
      this.setFlipX(this.facingLeft);
    });
  }

  kick() {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.hasHit = false;
    this.setTexture(this.kickTexture);
    this.setFlipX(this.facingLeft);
    this.scene.time.delayedCall(230, () => {
      this.isAttacking = false;
      this.setTexture(this.defaultTexture);
      this.setFlipX(this.facingLeft);
    });
  }

  jump() {
    if (this.body.blocked.down) {
      this.isAttacking = false;
      this.setTexture(this.defaultTexture);
      this.setVelocityY(-400);
    }
  }

  dash(dir) {
    if (this.dashing || this.isAttacking) return;
    this.dashing = true;
    this.invincible = true;
    this.setVelocityX(dir * 400);
    this.scene.time.delayedCall(130, () => {
      this.setVelocityX(0);
      this.dashing = false;
      this.invincible = false;
    });
  }

  takeHit(damage, hitX, hitY, isJuggle = false, isSuper = false) {
    if (this.invincible) return;
    this.invincible = true;
    let dmg = damage + (isJuggle ? 2 : 0) + (isSuper ? 7 : 0);
    this.hp = Math.max(0, this.hp - dmg);

    this.scene.sound.play('punch', { volume: isSuper ? 2.1 : 1.5 });
    this.scene.cameras.main.shake(isSuper ? 190 : 85, isSuper ? 0.01 : 0.008);
    this.scene.time.timeScale = 0.13;
    this.scene.time.delayedCall(isSuper ? 90 : 60, () => this.scene.time.timeScale = 1);

    const spark = this.scene.add.image(hitX, hitY, 'spark').setScale(isSuper ? 1 : 0.6);
    const blood = this.scene.add.image(hitX, hitY, 'blood').setScale(0.33 + (isSuper ? 0.23 : 0));
    this.scene.time.delayedCall(isSuper ? 390 : 210, () => spark.destroy());
    this.scene.time.delayedCall(isSuper ? 370 : 180, () => blood.destroy());

    if (this.scene.comboCounter) this.scene.comboCounter.increment();
    if (this === this.scene.player1) this.superMeter = Math.min(100, this.superMeter + 9);
    if (this === this.scene.player2) this.superMeter = Math.min(100, this.superMeter + 8);
    if (!this.body.blocked.down) this.juggleTimer = this.scene.time.now + 300;

    this.scene.time.delayedCall(420, () => { this.invincible = false; });
  }

  superMove() {
    if (this.isAttacking || this.superMeter < 100) return;
    this.isAttacking = true;
    this.hasHit = false;
    this.superMeter = 0;
    this.setTexture(this.punchTexture);
    this.setScale(this.scaleX * 1.21, this.scaleY * 1.16);
    this.scene.time.delayedCall(400, () => {
      this.isAttacking = false;
      this.setTexture(this.defaultTexture);
      this.setScale(FIGHTERS[this.defaultTexture]?.scale || 0.36);
    });
  }
}

// === ComboCounter Class ===
class ComboCounter {
  constructor(scene) {
    this.scene = scene;
    this.combo = 0;
    this.comboText = scene.add.text(scene.sys.game.config.width / 2, 48, '', {
      fontSize: '28px', color: '#ffe83b', fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(11);
    this.timer = 0;
  }
  increment() {
    this.combo++;
    this.comboText.setText(`${this.combo} HIT COMBO!`);
    this.comboText.setAlpha(1);
    if (this.timer) this.scene.time.removeEvent(this.timer);
    this.timer = this.scene.time.delayedCall(880, () => {
      this.combo = 0;
      this.comboText.setText('');
    });
  }
  reset() {
    this.combo = 0;
    this.comboText.setText('');
  }
}

// === SpeechBubble Class ===
class SpeechBubble {
  constructor(scene, x, y, text) {
    const w = Math.max(80, text.length * 11);
    const h = 40;
    this.bkg = scene.add.graphics({ x, y });
    this.bkg.fillStyle(0xffffff, 0.95);
    this.bkg.fillRoundedRect(-w / 2, -h, w, h, 12);
    this.bkg.lineStyle(2, 0x222222, 1);
    this.bkg.strokeRoundedRect(-w / 2, -h, w, h, 12);
    this.bkg.fillTriangle(-10, 0, 0, 18, 10, 0);
    this.txt = scene.add.text(x, y - h + 11, text, {
      fontSize: '16px',
      color: '#1b1b1b',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);
  }
  destroy() {
    this.bkg.destroy();
    this.txt.destroy();
  }
}

// === MainScene Hooks ===
window.preloadAssets = function() {
  this.load.image('background', 'assets/background.png');
  this.load.image('spark', 'assets/spark.png');
  this.load.image('blood', 'assets/blood.png');
  this.load.image('elon', 'assets/elon.png');
  this.load.image('elon_punch', 'assets/elon_punch.png');
  this.load.image('elon_kick', 'assets/elon_kick.png');
  this.load.image('trump', 'assets/trump.png');
  this.load.image('trump_punch', 'assets/trump_punch.png');
  this.load.image('trump_kick', 'assets/trump_kick.png');
  this.load.image('pelosi', 'assets/pelosi.png');
  this.load.image('pelosi_punch', 'assets/pelosi_punch.png');
  this.load.image('pelosi_kick', 'assets/pelosi_kick.png');
  this.load.audio('punch', 'assets/punch.mp3');
  this.load.audio('bgmusic', 'assets/bg.mp3');
};

window.createMainScene = function(data) {
  data = data || window.__dcf_startData || { selected: 'elon', difficulty: 3 };
  const F = FIGHTERS;
  const cx = this.sys.game.config.width / 2;
  const cy = this.sys.game.config.height / 2;

  this.aiConf = {...aiConf, difficulty: data.difficulty};
  this.add.image(cx, cy, 'background').setDisplaySize(this.sys.game.config.width, this.sys.game.config.height);

  const p1Conf = F[data.selected];
  let aiKeys = Object.keys(F).filter(k => k !== data.selected);
  const aiKey = aiKeys[Math.floor(Math.random() * aiKeys.length)];
  const aiConf = F[aiKey];

  // Only small top HP bars above names (red/blue)
  const topBarWidth = 160, topBarHeight = 14;
  this.hpFill1 = this.add.rectangle(cx - 230, 12, topBarWidth, topBarHeight, 0xff3333).setOrigin(0, 0.5).setDepth(15);
  this.hpFill2 = this.add.rectangle(cx + 80, 12, topBarWidth, topBarHeight, 0x3333ff).setOrigin(0, 0.5).setDepth(15);

  this.nameLabel1 = this.add.text(cx - 230, 6, p1Conf.name, {
    fontSize: '16px',
    color: '#ffe83b',
    fontFamily: 'Arial',
    fontWeight: 'bold'
  }).setOrigin(0, 0).setDepth(16);

  this.nameLabel2 = this.add.text(cx + 80, 6, aiConf.name, {
    fontSize: '16px',
    color: '#ffe83b',
    fontFamily: 'Arial',
    fontWeight: 'bold'
  }).setOrigin(0, 0).setDepth(16);

  this.player1 = new Fighter(this,
    Math.round(this.sys.game.config.width * 0.22),
    Math.round(this.sys.game.config.height * 0.68),
    p1Conf.img, p1Conf.punch, p1Conf.kick,
    80, 80, p1Conf.offset, false, uniquePower(data.selected)
  );
  this.player2 = new Fighter(this,
    Math.round(this.sys.game.config.width * 0.77),
    Math.round(this.sys.game.config.height * 0.68),
    aiConf.img, aiConf.punch, aiConf.kick,
    80, 80, aiConf.offset, true, uniquePower(aiKey)
  );
  this.player1.setScale(p1Conf.scale);
  this.player2.setScale(aiConf.scale);
  this.player2.isAI = true;

  this.comboCounter = new ComboCounter(this);

  this.tauntTimer = 0;
  this.inputBuffer = { punch: false, kick: false, super: false };
  this.speechBubble = null;
  this.lastKeyTimes = { A: 0, D: 0 };
  this.dashThreshold = 250;

  if (!this.sound.get('bgmusic')) this.sound.play('bgmusic', { loop: true, volume: 0.35 });

  this.p1Conf = p1Conf;
  this.aiConf = aiConf;
};

window.updateMainScene = function() {
  const now = this.time.now;
  const keys = this.input.keyboard;

  let p1Left = keys.addKey('A').isDown;
  let p1Right = keys.addKey('D').isDown;
  let p1Jump = Phaser.Input.Keyboard.JustDown(keys.addKey('W'));
  let p1Punch = Phaser.Input.Keyboard.JustDown(keys.addKey('SPACE'));
  let p1Kick = Phaser.Input.Keyboard.JustDown(keys.addKey('S'));
  let p1Super = Phaser.Input.Keyboard.JustDown(keys.addKey('ENTER'));

  if (Phaser.Input.Keyboard.JustDown(keys.addKey('A'))) {
    if (now - (this.lastKeyTimes.A || 0) < this.dashThreshold) this.player1.dash(-1);
    this.lastKeyTimes.A = now;
  }
  if (Phaser.Input.Keyboard.JustDown(keys.addKey('D'))) {
    if (now - (this.lastKeyTimes.D || 0) < this.dashThreshold) this.player1.dash(1);
    this.lastKeyTimes.D = now;
  }

  if (!this.player1.dashing) {
    this.player1.setVelocityX(0);
    if (p1Left) this.player1.setVelocityX(-160);
    if (p1Right) this.player1.setVelocityX(160);
  }
  if (p1Jump) this.player1.jump();
  if (p1Punch) this.player1.punch();
  if (p1Kick) this.player1.kick();
  if (p1Super && this.player1.superMeter >= 100) this.player1.superMove();

  if (this.player2.isAI && !this.physics.world.isPaused) {
    const p1 = this.player1, ai = this.player2;
    let dist = ai.x - p1.x;
    let absDist = Math.abs(dist);

    const difficulty = this.aiConf.difficulty || 3;
    const SPEED = 110 + difficulty * 25 + Math.random() * 20;
    const AGGRO = 0.4 + 0.15 * difficulty;
    ai.setVelocityX(0);

    if (absDist > 110) {
      ai.setVelocityX(dist > 0 ? -SPEED : SPEED);
    } else if (absDist < 65 && Math.random() < AGGRO * 0.31) {
      ai.setVelocityX(dist > 0 ? SPEED * 0.7 : -SPEED * 0.7);
    }

    if (ai.body.blocked.down && absDist < 180 && Math.random() < 0.15 * AGGRO) ai.jump();

    if (!ai.isAttacking && absDist < 97 && Math.abs(ai.y - p1.y) < 65) {
    if (Math.random() < AGGRO) ai.punch();
    else ai.kick();
    }

    if (this.tauntTimer < now && Math.random() < 0.016) {
      showTaunt.call(this, ai, "You're getting schooled!");
      this.tauntTimer = now + 1550;
    }
  }

  this.physics.world.overlap(this.player1.attackBox, this.player2, () => {
    if (this.player1.isAttacking && !this.player1.hasHit) {
      this.player1.hasHit = true;
      const { x, y } = this.player2;
      this.player2.takeHit(10, x, y);
      if (this.player2.hp <= 0) endRound.call(this, `${this.p1Conf.name} Wins!`);
    }
  });
  this.physics.world.overlap(this.player2.attackBox, this.player1, () => {
    if (this.player2.isAttacking && !this.player2.hasHit) {
      this.player2.hasHit = true;
      const { x, y } = this.player1;
      this.player1.takeHit(8, x, y);
      if (this.player1.hp <= 0) endRound.call(this, `${this.aiConf.name} Wins!`);
    }
  });

  if (!this.player1.isAttacking && !this.player2.isAttacking) this.comboCounter.reset();

  if (this.speechBubble && typeof this.speechBubble.destroy === "function") {
    this.speechBubble.destroy();
    this.speechBubble = null;
  }

  this.player1.updateAttackBox();
  this.player2.updateAttackBox();

  // Update red and blue top bars width based on HP
  const maxTopWidth = 160;
  this.hpFill1.width = Math.max(6, maxTopWidth * (this.player1.hp / 100));
  this.hpFill2.width = Math.max(6, maxTopWidth * (this.player2.hp / 100));

  // Keep names aligned with bars
  this.nameLabel1.x = this.hpFill1.x;
  this.nameLabel2.x = this.hpFill2.x;
};

// Helper functions
function showTaunt(fighter, text) {
  if (this.speechBubble) this.speechBubble.destroy();
  this.speechBubble = new SpeechBubble(this, fighter.x, fighter.y - 120, text);
  this.time.delayedCall(1200, () => {
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
  });
}

function uniquePower(key) {
  if (key === 'elon') {
    return fighter => {
      fighter.jump = function() {
        if (this.body.blocked.down) {
          this.setVelocityY(-400);
          setTimeout(() => {
            if (!this.body.blocked.down) this.setVelocityY(-360);
          }, 60);
        }
      };
    };
  }
  if (key === 'trump') {
    return fighter => {
      fighter.punch = function() {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.hasHit = false;
        this.setTexture(this.punchTexture);
        this.setFlipX(this.facingLeft);
        this.scene.time.delayedCall(130, () => {
          this.isAttacking = false;
          this.setTexture(this.defaultTexture);
          this.setFlipX(this.facingLeft);
        });
        this.scene.sound.play('punch', { volume: 2.3 });
      };
    };
  }
  if (key === 'pelosi') {
    return fighter => {
      fighter.takeHit = function(dmg, x, y, juggle, superM) {
        this.hp = Math.min(100, this.hp + 3);
        Fighter.prototype.takeHit.call(this, dmg, x, y, juggle, superM);
      };
    };
  }
  return null;
}

function endRound(message) {
  this.physics.pause();
  const cx = this.sys.game.config.width / 2;
  const cy = this.sys.game.config.height / 2;
  this.add.text(cx, cy, message, {
    fontFamily: 'Arial',
    fontSize: '36px',
    color: '#ff3333'
  }).setOrigin(0.5);
}
