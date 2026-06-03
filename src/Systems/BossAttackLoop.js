class BehaviorNode {
  tick(context) {
    return null;
  }
}

class ConditionNode extends BehaviorNode {
  constructor(predicate) {
    super();
    this.predicate = predicate;
  }

  tick(context) {
    return this.predicate(context) ? context : null;
  }
}

class ActionNode extends BehaviorNode {
  constructor(action) {
    super();
    this.action = action;
  }

  tick(context) {
    return this.action(context);
  }
}

class SequenceNode extends BehaviorNode {
  constructor(children = []) {
    super();
    this.children = children;
  }

  tick(context) {
    let current = context;
    for (const child of this.children) {
      current = child.tick(current);
      if (!current) return null;
    }
    return current;
  }
}

class SelectorNode extends BehaviorNode {
  constructor(children = []) {
    super();
    this.children = children;
  }

  tick(context) {
    for (const child of this.children) {
      const result = child.tick(context);
      if (result) return result;
    }
    return null;
  }
}

export default class BossAttackLoop {
  constructor(scene) {
    this.scene = scene;
    this.token = 0;
    this.running = false;
    this.timers = [];
    this.lastSkillKey = null;
    this.lastSkillAt = 0;
    this.skillCooldowns = new Map();
    this.lastAssessmentAt = 0;
    this.behaviorTree = this.createBehaviorTree();
    this.lastContext = null;
    this.holyPressureDebt = 0;
  }

  start() {
    if (!this.canRun()) return;
    this.running = true;
    const token = ++this.token;
    this.scene.attackLoopToken = this.token;
    this.scheduleNextDecision(token, 420);
  }

  scheduleNextDecision(token, delay = 1000) {
    this.after(delay, token, () => this.runDecision(token));
  }

  runDecision(token) {
    if (!this.isValid(token)) return;

    const context = this.buildContext();
    this.announcePlayerState(context);

    const selected = this.behaviorTree.tick(context) || this.selectUtilitySkill(context);
    const action = selected?.action || selected;

    if (!action) {
      this.scheduleNextDecision(token, 1200);
      return;
    }

    this.castAction(action);
    const nextDelay = this.getNextDecisionDelay(action, context);
    this.after(nextDelay, token, () => this.runDecision(token));
  }

  createBehaviorTree() {
    return new SelectorNode([
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase === 1 && ctx.elapsedCombatMs > 6500 && ctx.timeSinceDestruction > 12000 && this.isReady("destructionBlast", ctx)),
        new ActionNode(() => this.action("destructionBlast", 116, "phase one blast tutorial"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase === 1 && ctx.elapsedCombatMs > 15500 && ctx.timeSinceAnnihilation > 14000 && this.isReady("annihilationSlash", ctx)),
        new ActionNode(() => this.action("annihilationSlash", 112, "phase one execution tutorial"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => false && ctx.phase >= 4 && ctx.activeTurrets === 0 && ctx.timeSinceTurrets > 5200 && this.isReady("massEnergyTurrets", ctx)),
        new ActionNode(() => this.action("massEnergyTurrets", 136, "ultimate turret lockdown"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase === 2 && ctx.activeTurrets === 0 && ctx.timeSinceTurrets > 4200 && this.isReady("massEnergyTurrets", ctx)),
        new ActionNode(() => this.action("massEnergyTurrets", 112, "phase two turret lockdown"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 4 && this.isReady("phaseThreePressureCombo", ctx)),
        new ActionNode(() => this.action("phaseThreePressureCombo", 130, "ultimate berserk combo"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 4 && ctx.playerAirborne && this.isReady("rayOfOblivion", ctx)),
        new ActionNode(() => this.action("rayOfOblivion", 126, "ultimate airborne execution"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 4 && ctx.distance < 620 && this.isReady("menacingAdvance", ctx)),
        new ActionNode(() => this.action("menacingAdvance", 132, "ultimate collision intercept"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 4 && ctx.timeSinceHoly > 12000 && this.isReady("holyClearance", ctx)),
        new ActionNode(() => this.action("holyClearance", 74, "limited ultimate suppression"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 2 && ctx.playerGroupedInOpenLane && ctx.safeToUseLongCast && this.isReady("purgeProtocol", ctx)),
        new ActionNode(() => this.action("purgeProtocol", 93, "bomb open movement lane"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 2 && ctx.playerPredictableGroundRun && ctx.timeSincePurge > 13000 && this.isReady("purgeProtocol", ctx)),
        new ActionNode(() => this.action("purgeProtocol", 88, "predict sustained ground route"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 2 && ctx.playerSeekingHealth && ctx.timeSinceHoly > 14500 && this.isReady("holyClearance", ctx)),
        new ActionNode(() => this.action("holyClearance", 72, "deny recovery route"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 2 && ctx.playerFast && ctx.distance > 360 && ctx.timeSinceHoly > 14500 && this.isReady("holyClearance", ctx)),
        new ActionNode(() => this.action("holyClearance", 66, "suppress high mobility"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 2 && ctx.playerOnLadder && ctx.timeSinceHoly > 14500 && this.isReady("holyClearance", ctx)),
        new ActionNode(() => this.action("holyClearance", 64, "punish vertical route"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 3 && ctx.playerLowHp && this.isReady("menacingAdvance", ctx)),
        new ActionNode(() => this.action("menacingAdvance", 94, "execute wounded intruder"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 2 && ctx.playerAirborne && ctx.distance > 280 && this.isReady("rayOfOblivion", ctx)),
        new ActionNode(() => this.action("rayOfOblivion", 88, "line-of-sight airborne target"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.hasTrees && ctx.phase >= 2 && this.isReady("annihilationSlash", ctx)),
        new ActionNode(() => this.action("annihilationSlash", 86, "remove unauthorized cover"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.playerNearArenaEdge && ctx.phase >= 2 && this.isReady("destructionBlast", ctx)),
        new ActionNode(() => this.action("destructionBlast", 84, "cut off edge escape"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.playerClusteredLow && this.isReady("gravityField", ctx)),
        new ActionNode(() => this.action("gravityField", 82, "contain low-ground movement"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 1 && ctx.timeSincePurge > 11500 && ctx.safeToUseLongCast && this.isReady("purgeProtocol", ctx)),
        new ActionNode(() => this.action("purgeProtocol", 82, "reset battlefield pathing"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => false && ctx.phase >= 4 && ctx.timeSinceTurrets > 8200 && ctx.activeTurrets === 0 && this.isReady("massEnergyTurrets", ctx)),
        new ActionNode(() => this.action("massEnergyTurrets", 118, "ultimate turret lockdown"))
      ]),
      new SequenceNode([
        new ConditionNode((ctx) => ctx.phase >= 2 && ctx.phase < 4 && ctx.timeSinceTurrets > 12500 && (ctx.playerControlsCenter || ctx.activeTurrets === 0) && this.isReady("massEnergyTurrets", ctx)),
        new ActionNode(() => this.action("massEnergyTurrets", 92, "contest center control"))
      ])
    ]);
  }

  selectUtilitySkill(context) {
    const candidates = this.getCandidateActions(context)
      .filter((entry) => this.isReady(entry.key, context) && entry.key !== this.lastSkillKey)
      .map((entry) => ({
        ...entry,
        score: this.scoreAction(entry, context)
      }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) return candidates[0];

    const fallback = this.getCandidateActions(context)
      .filter((entry) => this.isReady(entry.key, context))
      .map((entry) => ({ ...entry, score: this.scoreAction(entry, context) }))
      .sort((a, b) => b.score - a.score)[0];

    return fallback || this.action("destructionBlast", 40, "default pressure");
  }

  getCandidateActions(context) {
    const phase = context.phase;
    const actions = [
      this.action("destructionBlast", 48, "lane denial"),
      this.action("annihilationSlash", 46, "close slash threat"),
      this.action("purgeProtocol", 44, "aerial lockdown"),
      ...(phase >= 4 ? [] : [this.action("massEnergyTurrets", phase >= 2 ? 62 : 38, "area control")]),
      this.action("gravityField", 36, "center containment"),
      this.action("rayOfOblivion", phase >= 3 ? 50 : 34, "tracking line-of-sight pressure")
    ];

    if (phase >= 2) {
      actions.push(
        this.action("holyClearance", 28, "projectile suppression"),
        this.action("phaseTwoPressureCombo", 44, "combo pressure")
      );
    }

    if (phase >= 3) {
      actions.push(
        this.action("rayOfOblivion", 50, "line-of-sight punishment"),
        this.action("menacingAdvance", 46, "direct interception"),
        this.action("phaseThreePressureCombo", 50, "final combo pressure")
      );
    }

    if (phase >= 4) {
      actions.push(
        this.action("holyClearance", 22, "limited ultimate suppression"),
        this.action("purgeProtocol", 92, "continuous aerial lockdown"),
        this.action("rayOfOblivion", 96, "ultimate sweep laser"),
        this.action("menacingAdvance", 90, "collision pressure"),
        this.action("annihilationSlash", 64, "ultimate blade protocol")
      );
    }

    return actions;
  }

  scoreAction(action, ctx) {
    let score = action.base || 0;

    if (ctx.playerAirborne) {
      if (["rayOfOblivion", "holyClearance", "destructionBlast", "purgeProtocol"].includes(action.key)) score += 22;
      if (action.key === "purgeProtocol" && ctx.playerFallingIntoLane) score += 14;
      if (action.key === "gravityField") score -= 8;
    }

    if (ctx.playerGrounded) {
      if (["annihilationSlash", "menacingAdvance"].includes(action.key)) score += 18;
      if (action.key === "purgeProtocol" && ctx.playerPredictableGroundRun) score += 22;
      if (ctx.phase >= 2 && action.key === "holyClearance" && ctx.speedX > 180) score += 4;
    }

    if (ctx.distance > 560) {
      if (["rayOfOblivion", "destructionBlast", "purgeProtocol", "holyClearance"].includes(action.key)) score += 20;
      if (["menacingAdvance", "annihilationSlash"].includes(action.key)) score -= 8;
    }

    if (ctx.distance < 270) {
      if (["annihilationSlash", "menacingAdvance", "gravityField"].includes(action.key)) score += 22;
      if (action.key === "holyClearance" && ctx.playerFast) score += 2;
      if (action.key === "massEnergyTurrets") score += ctx.phase >= 4 ? 4 : -8;
    }

    if (ctx.hasTrees) {
      if (["annihilationSlash", "destructionBlast", "rayOfOblivion"].includes(action.key)) score += 18;
      if (action.key === "holyClearance") score -= 10;
    }

    if (ctx.playerLowHp) {
      if (["menacingAdvance", "holyClearance", "rayOfOblivion"].includes(action.key)) score += 18;
      if (ctx.playerSeekingHealth && action.key === "holyClearance") score += 6;
      if (action.key === "massEnergyTurrets") score += ctx.phase >= 4 ? 8 : -6;
    }

    if (ctx.playerOnLadder) {
      if (["holyClearance", "rayOfOblivion", "destructionBlast"].includes(action.key)) score += 24;
      if (action.key === "gravityField") score -= 8;
      if (action.key === "massEnergyTurrets") score += ctx.phase >= 4 ? 6 : -4;
    }

    if (ctx.playerNearArenaEdge) {
      if (["destructionBlast", "menacingAdvance", "holyClearance"].includes(action.key)) score += 18;
      if (action.key === "purgeProtocol") score += 18;
    }

    if (ctx.playerControlsCenter) {
      if (["massEnergyTurrets", "gravityField", "purgeProtocol"].includes(action.key)) score += 14;
      if (action.key === "massEnergyTurrets" && ctx.phase >= 3) score += 10;
      if (action.key === "purgeProtocol" && ctx.playerGroupedInOpenLane) score += 16;
    }

    if (ctx.playerAboveBoss) {
      if (["holyClearance", "rayOfOblivion"].includes(action.key)) score += 16;
      if (action.key === "annihilationSlash") score -= 6;
    }

    if (ctx.playerBelowBoss) {
      if (["gravityField", "destructionBlast", "purgeProtocol"].includes(action.key)) score += 12;
    }

    if (ctx.recentSameVerticalLine) {
      if (["rayOfOblivion", "holyClearance", "destructionBlast"].includes(action.key)) score += 18;
    }

    if (ctx.holyDebtHigh && action.key === "holyClearance") score += 4;
    if (ctx.activeTurrets === 0 && action.key === "massEnergyTurrets") score += ctx.phase >= 4 ? -999 : ctx.phase >= 2 ? 20 : 10;
    if (action.key === "menacingAdvance") score += ctx.phase >= 4 ? 30 : ctx.phase >= 3 ? 24 : ctx.phase >= 2 ? 17 : 8;
    if (ctx.activeTurrets > 0 && action.key === "massEnergyTurrets") score -= 38;

    if (ctx.phase >= 4) {
      if (["purgeProtocol", "rayOfOblivion", "annihilationSlash", "phaseThreePressureCombo"].includes(action.key)) score += 14;
      if (action.key === "holyClearance") score -= 18;
      if (action.key === "massEnergyTurrets") score -= 999;
      score += Math.random() * 12;
    } else if (ctx.phase >= 3) score += Math.random() * 7;
    else if (ctx.phase >= 2) score += Math.random() * 6;
    else score += Math.random() * 4;

    const cooldownAge = ctx.now - (this.skillCooldowns.get(action.key) || -99999);
    score += Math.min(16, cooldownAge / 900);

    return score;
  }

  buildContext() {
    const scene = this.scene;
    const player = scene.player;
    const boss = scene.boss;
    const body = player?.body;
    const now = scene.time?.now || 0;
    const distance = player && boss
      ? Phaser.Math.Distance.Between(player.x, player.y, boss.x, boss.y)
      : 999;
    const horizontalDistance = player && boss ? Math.abs(player.x - boss.x) : 999;
    const verticalDistance = player && boss ? player.y - boss.y : 0;
    const speedX = Math.abs(body?.velocity?.x || 0);
    const speedY = body?.velocity?.y || 0;
    const grounded = Boolean(body?.blocked?.down || body?.touching?.down);
    const airborne = !grounded || Math.abs(speedY) > 140;
    const hp = scene.playerHp ?? 3;
    const maxHp = scene.playerMaxHp ?? 5;
    const activeTrees = scene.playerTrees?.getChildren?.().filter((tree) => tree?.active).length || 0;
    const view = scene.cameras?.main?.worldView;
    const mapWidth = scene.map?.widthInPixels || 3840;
    const playerX = player?.x || 0;
    const playerY = player?.y || 0;
    const activeTurrets = scene.activeTurrets?.filter?.((turret) => turret?.active).length || 0;
    const packs = scene.healthPacks?.packs || [];
    const nearestHealthPackDistance = this.getNearestHealthPackDistance(player, packs);
    const playerLowHp = hp <= Math.max(1, Math.ceil(maxHp * 0.35));
    const playerFast = speedX > 250 || Math.abs(speedY) > 360;
    const recentSameVerticalLine = horizontalDistance < 130 && Math.abs(verticalDistance) > 180;
    const predictedX = Phaser.Math.Clamp(playerX + (body?.velocity?.x || 0) * 0.72, 140, mapWidth - 140);
    const predictedY = Phaser.Math.Clamp(playerY + (body?.velocity?.y || 0) * 0.45, 80, scene.map?.heightInPixels || 2048);
    const playerPredictableGroundRun = grounded && speedX > 150 && Math.abs(body?.velocity?.y || 0) < 120;
    const playerGroupedInOpenLane = view ? playerX > view.left + view.width * 0.22 && playerX < view.right - view.width * 0.22 : true;
    const playerFallingIntoLane = !grounded && (body?.velocity?.y || 0) > 220;

    if (playerFast || airborne || scene.playerIsClimbing || playerLowHp) {
      this.holyPressureDebt = Math.min(100, this.holyPressureDebt + 18);
    } else {
      this.holyPressureDebt = Math.max(0, this.holyPressureDebt - 6);
    }

    const context = {
      scene,
      player,
      boss,
      now,
      phase: scene.bossPhase || 1,
      distance,
      horizontalDistance,
      verticalDistance,
      speedX,
      speedY,
      playerGrounded: grounded,
      playerAirborne: airborne,
      playerLowHp,
      playerFast,
      hasTrees: activeTrees > 0,
      activeTrees,
      activeTurrets,
      playerOnLadder: Boolean(scene.playerIsClimbing),
      playerClusteredLow: view ? playerY > view.centerY + 100 : false,
      playerControlsCenter: view ? Math.abs(playerX - view.centerX) < view.width * 0.18 : false,
      playerNearArenaEdge: playerX < 260 || playerX > mapWidth - 260 || (view && (playerX < view.left + 160 || playerX > view.right - 160)),
      playerAboveBoss: verticalDistance < -160,
      playerBelowBoss: verticalDistance > 160,
      playerSeekingHealth: playerLowHp && nearestHealthPackDistance < 420,
      nearestHealthPackDistance,
      recentSameVerticalLine,
      predictedX,
      predictedY,
      playerPredictableGroundRun,
      playerGroupedInOpenLane,
      playerFallingIntoLane,
      safeToUseLongCast: activeTurrets < 3 && !scene.gravityFieldActive,
      holyDebtHigh: this.holyPressureDebt >= 42,
      elapsedCombatMs: now - (scene.combatStartTime || now),
      timeSinceDestruction: now - (this.skillCooldowns.get("destructionBlast") || -99999),
      timeSinceAnnihilation: now - (this.skillCooldowns.get("annihilationSlash") || -99999),
      timeSincePurge: now - (this.skillCooldowns.get("purgeProtocol") || -99999),
      timeSinceTurrets: now - (this.skillCooldowns.get("massEnergyTurrets") || -99999),
      timeSinceHoly: now - (this.skillCooldowns.get("holyClearance") || -99999)
    };

    this.lastContext = context;
    return context;
  }

  getNearestHealthPackDistance(player, packs) {
    if (!player || !packs || packs.length === 0) return 99999;

    let best = 99999;
    for (const pack of packs) {
      if (!pack || !pack.active) continue;
      const distance = Phaser.Math.Distance.Between(player.x, player.y, pack.x, pack.y);
      if (distance < best) best = distance;
    }
    return best;
  }

  announcePlayerState(context) {
    const now = context.now;
    if (now < this.lastAssessmentAt + 3300) return;

    let line;
    if (context.playerSeekingHealth) line = "RECOVERY ROUTE IDENTIFIED";
    else if (context.playerLowHp) line = "TARGET VITALS COMPROMISED";
    else if (context.hasTrees) line = "UNAUTHORIZED COVER DETECTED";
    else if (context.playerOnLadder) line = "VERTICAL ACCESS ROUTE LOGGED";
    else if (context.playerPredictableGroundRun) line = "GROUND ROUTE PREDICTED";
    else if (context.playerFallingIntoLane) line = "FALL PATH CALCULATED";
    else if (context.playerNearArenaEdge) line = "EDGE ESCAPE PATTERN DETECTED";
    else if (context.playerAboveBoss) line = "HIGH-GROUND ROUTE RECORDED";
    else if (context.playerAirborne) line = "AIRBORNE EVASION RECORDED";
    else if (context.distance > 560) line = "LONG-RANGE FLIGHT PATH LOGGED";
    else if (context.playerFast) line = "HIGH MOBILITY PATTERN IDENTIFIED";
    else if (context.playerControlsCenter) line = "CENTER CONTROL DETECTED";
    else if (context.playerGrounded) line = "GROUND ROUTE CONFIRMED";

    if (!line) return;
    this.lastAssessmentAt = now;
    context.scene.showPlayerStatusVoice?.(line, {
      color: context.playerLowHp || context.hasTrees || context.playerSeekingHealth ? "#ff9f9f" : "#dff8ff"
    });
  }

  action(key, base = 0, reason = "") {
    return { key, base, reason };
  }

  isReady(key, context) {
    const now = context.now;
    const last = this.skillCooldowns.get(key) || -99999;
    return now - last >= this.getCooldown(key, context.phase);
  }

  getCooldown(key, phase) {
    const base = {
      destructionBlast: 7000,
      annihilationSlash: 7400,
      massEnergyTurrets: phase >= 4 ? 13500 : phase >= 3 ? 9800 : phase >= 2 ? 10500 : 12000,
      gravityField: 11800,
      purgeProtocol: 9800,
      phaseTwoPressureCombo: 14500,
      phaseThreePressureCombo: 13500,
      rayOfOblivion: phase >= 3 ? 7600 : phase >= 2 ? 8600 : 9200,
      holyClearance: 13800,
      menacingAdvance: 5200
    }[key] || 8500;

    if (phase >= 4) return base * 0.88;
    if (phase >= 3) return base * 0.78;
    if (phase >= 2) return base * 0.90;
    return base * 1.0;
  }

  getNextDecisionDelay(action, context) {
    const m = this.getSpeedMultiplier();
    const base = {
      destructionBlast: 5100,
      annihilationSlash: 4700,
      massEnergyTurrets: context.phase >= 4 ? 7600 : context.phase >= 2 ? 7600 : 7600,
      gravityField: 7400,
      purgeProtocol: 7600,
      phaseTwoPressureCombo: 6200,
      phaseThreePressureCombo: 6200,
      rayOfOblivion: context.phase >= 4 ? 8800 : 4800,
      holyClearance: 6200,
      menacingAdvance: 3000
    }[action.key] || 4800;

    const phasePressure = context.phase >= 4 ? 0.88 : context.phase >= 3 ? 0.78 : context.phase >= 2 ? 0.86 : 0.98;
    return Math.max(context.phase >= 4 ? 3000 : context.phase >= 3 ? 2500 : context.phase >= 2 ? 2800 : 3000, base * m * phasePressure);
  }

  castAction(action) {
    const key = action.key;
    this.lastSkillKey = key;
    this.lastSkillAt = this.scene.time?.now || 0;
    this.skillCooldowns.set(key, this.lastSkillAt);

    const execute = () => {
      if (key === "phaseTwoPressureCombo") return this.scene.castPhaseTwoPressureCombo();
      if (key === "phaseThreePressureCombo") return this.scene.castPhaseThreePressureCombo();
      return this.scene.castSkill(key);
    };

    this.castWithBossTransition(execute);
  }

  after(delay, token, callback) {
    const event = this.scene.time.delayedCall(delay, () => {
      this.timers = this.timers.filter((timer) => timer !== event);
      if (!this.isValid(token)) return;
      callback();
    });

    this.timers.push(event);
    return event;
  }

  clearTimers() {
    for (const event of this.timers) {
      if (event && !event.hasDispatched) event.remove(false);
    }
    this.timers = [];
  }

  cancel() {
    this.running = false;
    this.token++;
    this.scene.attackLoopToken = this.token;
    this.clearTimers();
  }

  canRun() {
    return (
      !this.scene.gameOver &&
      this.scene.bossIntegrity > 0 &&
      !this.scene.isPhaseTransitioning &&
      !this.scene.__pauseMenuOpen
    );
  }

  isValid(token) {
    return this.running && token === this.token && this.canRun();
  }

  getSpeedMultiplier() {
    if (this.scene.phaseManager) return this.scene.phaseManager.attackSpeedMultiplier;
    return this.scene.attackSpeedMultiplier ?? 1.0;
  }

  castWithBossTransition(nextAction) {
    if (this.scene.bossMovement?.performTransition) {
      this.scene.bossMovement.performTransition(nextAction);
      return;
    }

    this.scene.bossPerformTransition(nextAction);
  }
}
