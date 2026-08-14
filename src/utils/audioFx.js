/**
 * SAHAYAK Tactical Audio Synthesizer
 * Uses Web Audio API to create zero-asset sound effects:
 *  - Emergency priority chime (Tier 1 SOS alerts)
 *  - Radio dispatch click / static squelch
 *  - Tactile HUD blip / button confirm
 *  - Sonar hydrographic pulse
 */

class TacticalAudio {
  constructor() {
    this.ctx = null
    this.muted = typeof window !== 'undefined' && localStorage.getItem('sahayak_audio_muted') === 'true'
  }

  _initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setMuted(mute) {
    this.muted = mute
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahayak_audio_muted', String(mute))
    }
  }

  isMuted() {
    return this.muted
  }

  playTactile() {
    if (this.muted) return
    try {
      this._initContext()
      if (!this.ctx) return

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04)

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start()
      osc.stop(this.ctx.currentTime + 0.045)
    } catch (e) {
      console.warn('Audio synthesis error:', e)
    }
  }

  playAlert() {
    if (this.muted) return
    try {
      this._initContext()
      if (!this.ctx) return

      const now = this.ctx.currentTime
      const osc1 = this.ctx.createOscillator()
      const osc2 = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc1.type = 'sawtooth'
      osc2.type = 'triangle'

      osc1.frequency.setValueAtTime(880, now)
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.25)

      osc2.frequency.setValueAtTime(1760, now)
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.25)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(this.ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.3)
      osc2.stop(now + 0.3)
    } catch (e) {
      console.warn('Audio alert error:', e)
    }
  }

  playRadioDispatch() {
    if (this.muted) return
    try {
      this._initContext()
      if (!this.ctx) return

      const now = this.ctx.currentTime

      // Squelch white noise burst
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08)
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5
      }

      const noise = this.ctx.createBufferSource()
      noise.buffer = buffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1800, now)
      filter.Q.setValueAtTime(3, now)

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(0.07, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(this.ctx.destination)

      noise.start(now)

      // Dual-tone confirm chirp
      const osc = this.ctx.createOscillator()
      const toneGain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, now + 0.05)
      osc.frequency.setValueAtTime(950, now + 0.12)

      toneGain.gain.setValueAtTime(0.06, now + 0.05)
      toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      osc.connect(toneGain)
      toneGain.connect(this.ctx.destination)

      osc.start(now + 0.05)
      osc.stop(now + 0.24)
    } catch (e) {
      console.warn('Audio radio dispatch error:', e)
    }
  }

  playSonar() {
    if (this.muted) return
    try {
      this._initContext()
      if (!this.ctx) return

      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1046.5, now) // C6
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.4)

      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.85)
    } catch (e) {
      console.warn('Audio sonar error:', e)
    }
  }
}

export const audioFx = new TacticalAudio()
