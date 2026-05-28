export default class FixedStepRunner {
  constructor({ stepSeconds = 1 / 60, maxStepsPerFrame = 4 } = {}) {
    this.stepMs = stepSeconds * 1000;
    this.maxStepsPerFrame = maxStepsPerFrame;
    this.accumulatorMs = 0;
  }

  update(time, deltaMs, callback) {
    if (typeof callback !== "function") return;

    this.accumulatorMs += Math.min(deltaMs, this.stepMs * this.maxStepsPerFrame);

    let steps = 0;
    while (this.accumulatorMs >= this.stepMs && steps < this.maxStepsPerFrame) {
      callback(time, this.stepMs, steps);
      this.accumulatorMs -= this.stepMs;
      steps++;
    }

    if (steps >= this.maxStepsPerFrame) {
      this.accumulatorMs = 0;
    }
  }
}
