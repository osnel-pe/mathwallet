// Sonidos originales sintetizados: sin descargas, muestras externas ni música protegida.
export function readSoundPreference() {
  try { return localStorage.getItem('super-mathy:sound') === 'on' } catch { return false }
}
export function saveSoundPreference(enabled) {
  try { localStorage.setItem('super-mathy:sound', enabled ? 'on' : 'off') } catch {}
}
export class MathyAudio {
  constructor() { this.context = null; this.master = null; this.enabled = false; this.last = {} }
  async resume() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!AC) return
    if (!this.context || this.context.state === 'closed') {
      this.context = new AC()
      const compressor = this.context.createDynamicsCompressor()
      compressor.threshold.value = -18
      compressor.ratio.value = 6
      this.master = this.context.createGain()
      this.master.gain.value = this.enabled ? 0.32 : 0
      this.master.connect(compressor)
      compressor.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
  }
  setEnabled(enabled) {
    this.enabled = enabled
    if (this.context && this.master) {
      const now = this.context.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(enabled ? 0.32 : 0, now, 0.012)
    }
  }
  tone(at, frequency, end, duration, volume = 0.14, wave = 'sine') {
    const c=this.context, osc=c.createOscillator(), envelope=c.createGain()
    osc.type=wave
    osc.frequency.setValueAtTime(frequency,at)
    if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration)
    envelope.gain.setValueAtTime(0.0001,at)
    envelope.gain.exponentialRampToValueAtTime(volume,at+0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001,at+duration)
    osc.connect(envelope); envelope.connect(this.master)
    osc.start(at); osc.stop(at+duration+0.02)
    osc.onended=()=>{osc.disconnect();envelope.disconnect()}
  }
  noise(at, duration, volume=0.1) {
    const c=this.context, n=Math.ceil(c.sampleRate*duration), buffer=c.createBuffer(1,n,c.sampleRate)
    const samples=buffer.getChannelData(0)
    for(let i=0;i<n;i++) samples[i]=(Math.random()*2-1)*(1-i/n)
    const source=c.createBufferSource(), filter=c.createBiquadFilter(), gain=c.createGain()
    filter.type='lowpass';filter.frequency.value=900;gain.gain.value=volume
    source.buffer=buffer;source.connect(filter);filter.connect(gain);gain.connect(this.master)
    source.start(at);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()}
  }
  play(type) {
    const c=this.context
    if (!this.enabled || !c || c.state!=='running') return
    const t=c.currentTime, cooldown=type==='coin'?0.065:type==='step'?0.16:0.08
    if (t-(this.last[type]??-100)<cooldown)return
    this.last[type]=t
    const tone=(f,end,d,v,w,delay=0)=>this.tone(t+delay,f,end,d,v,w)
    if(type==='block'||type==='switch'||type==='stomp') {tone(440,660,0.12,0.1,'triangle');tone(880,null,0.12,0.035,'sine',0.04)}
    else if(type==='crumble') {this.noise(t,0.19,0.12)}
    else if(type==='coin') {tone(1046,1568,0.12,0.11);tone(2093,2637,0.16,0.045,'sine',0.045)}
    else if(type==='credit') [784,988,1175,1568].forEach((f,i)=>tone(f,null,0.24,0.1,'sine',i*0.065))
    else if(type==='jump') {tone(180,620,0.19,0.12,'triangle');tone(360,1240,0.12,0.035)}
    else if(type==='spring') {tone(170,1100,0.29,0.13,'triangle');tone(850,1600,0.18,0.04,'sine',0.07)}
    else if(type==='dash') {this.noise(t,0.16,0.15);tone(260,110,0.16,0.1,'triangle')}
    else if(type==='damage') {this.noise(t,0.22,0.22);tone(230,65,0.3,0.16,'triangle')}
    else if(type==='build') {this.noise(t,0.08,0.1);[330,440,660].forEach((f,i)=>tone(f,null,0.18,0.1,'triangle',i*0.07))}
    else if(type==='correct'||type==='finish') {const notes=type==='finish'?[523,659,784,1046,1318]:[659,784,1046];notes.forEach((f,i)=>{tone(f,null,0.35,0.11,'triangle',i*0.09);tone(f*2,null,0.22,0.025,'sine',i*0.09)})}
    else if(type==='wrong') {tone(280,200,0.17,0.1,'triangle');tone(210,150,0.22,0.08,'triangle',0.15)}
    else if(type==='step') {tone(100,55,0.045,0.07,'triangle')}
    else if(type==='ui') tone(620,830,0.065,0.08,'sine')
  }
  async close() { await this.context?.close?.(); this.context=null;this.master=null }
}
