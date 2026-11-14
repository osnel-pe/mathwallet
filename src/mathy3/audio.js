// Sonidos originales sintetizados: sin descargas, muestras externas ni música protegida.
export function readSoundPreference() {
  try { return localStorage.getItem('super-mathy:sound') !== 'off' } catch { return true }
}
export function saveSoundPreference(enabled) {
  try { localStorage.setItem('super-mathy:sound', enabled ? 'on' : 'off') } catch {}
}
export class MathyAudio {
  constructor() { this.context = null; this.master = null; this.enabled = false; this.last = {}; this.musicTimer = null; this.musicBus = null; this.musicWanted = false; this.musicStep = 0; this.musicNext = 0; this.musicNodes = new Set() }
  async resume() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!AC) return false
    if (!this.context || this.context.state === 'closed') {
      this.context = new AC()
      const compressor = this.context.createDynamicsCompressor()
      compressor.threshold.value = -18
      compressor.ratio.value = 6
      this.master = this.context.createGain()
      this.master.gain.value = this.enabled ? 0.55 : 0
      this.musicBus = this.context.createGain()
      this.musicBus.gain.value = 0
      this.musicBus.connect(this.master)
      this.master.connect(compressor)
      compressor.connect(this.context.destination)
    }
    if (this.context.state !== 'running') await this.context.resume()
    if (this.musicWanted) this.setMusic(true)
    return this.context.state === 'running'
  }
  setEnabled(enabled) {
    this.enabled = enabled
    if (!enabled) this.setMusic(false)
    if (this.context && this.master) {
      const now = this.context.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(enabled ? 0.55 : 0, now, 0.012)
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
    const t=c.currentTime, cooldown=type==='coin'?0:type==='step'?0.16:0.08
    if (t-(this.last[type]??-100)<cooldown)return
    this.last[type]=t
    const tone=(f,end,d,v,w,delay=0)=>this.tone(t+delay,f,end,d,v,w)
    if(type==='block'||type==='switch'||type==='stomp') {tone(440,660,0.12,0.1,'triangle');tone(880,null,0.12,0.035,'sine',0.04)}
    else if(type==='crumble') {this.noise(t,0.19,0.12)}
    else if(type==='coin') {tone(1568,null,0.09,0.2,'sine');tone(3136,null,0.22,0.13,'sine',0.035)}
    else if(type==='credit') [784,988,1175,1568].forEach((f,i)=>tone(f,null,0.24,0.1,'sine',i*0.065))
    else if(type==='jump') {tone(190,980,0.17,0.19,'square');tone(380,1600,0.1,0.055,'triangle')}
    else if(type==='spring') {tone(170,1100,0.29,0.13,'triangle');tone(850,1600,0.18,0.04,'sine',0.07)}
    else if(type==='dash') {this.noise(t,0.16,0.15);tone(260,110,0.16,0.1,'triangle')}
    else if(type==='damage') {this.noise(t,0.22,0.22);tone(230,65,0.3,0.16,'triangle')}
    else if(type==='build') {this.noise(t,0.08,0.1);[330,440,660].forEach((f,i)=>tone(f,null,0.18,0.1,'triangle',i*0.07))}
    else if(type==='correct'||type==='finish') {const notes=type==='finish'?[523,659,784,1046,1318]:[659,784,1046];notes.forEach((f,i)=>{tone(f,null,0.35,0.11,'triangle',i*0.09);tone(f*2,null,0.22,0.025,'sine',i*0.09)})}
    else if(type==='wrong') {tone(280,200,0.17,0.1,'triangle');tone(210,150,0.22,0.08,'triangle',0.15)}
    else if(type==='step') {tone(100,55,0.045,0.07,'triangle')}
    else if(type==='ui') tone(620,830,0.065,0.08,'sine')
  }
  setMusic(active) {
    this.musicWanted = active
    const c=this.context
    if (!active || !this.enabled || !c || c.state!=='running') {
      clearInterval(this.musicTimer); this.musicTimer=null
      if(c && this.musicBus) {this.musicBus.gain.cancelScheduledValues(c.currentTime);this.musicBus.gain.setTargetAtTime(0,c.currentTime,0.015)}
      for (const node of this.musicNodes) {try{node.stop()}catch{}}
      this.musicNodes.clear()
      return
    }
    if(this.musicTimer)return
    this.musicBus.gain.setTargetAtTime(0.55,c.currentTime,0.05)
    this.musicNext=c.currentTime+0.035
    const tick=()=>{
      if(!this.enabled || !this.musicWanted || c.state!=='running')return
      // Limitar recuperación si el navegador ralentizó los temporizadores.
      if(this.musicNext<c.currentTime-0.12)this.musicNext=c.currentTime+0.025
      let count=0
      while(this.musicNext<c.currentTime+0.18 && count++<8){this.musicBeat(this.musicStep++,this.musicNext);this.musicNext+=60/132/2}
    }
    tick();this.musicTimer=setInterval(tick,40)
  }
  musicNote(midi,at,duration,volume,wave='square') {
    if(midi===null)return
    const c=this.context, osc=c.createOscillator(),gain=c.createGain()
    osc.type=wave;osc.frequency.value=440*2**((midi-69)/12)
    gain.gain.setValueAtTime(0.0001,at)
    gain.gain.exponentialRampToValueAtTime(volume,at+0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001,at+duration)
    osc.connect(gain);gain.connect(this.musicBus)
    this.musicNodes.add(osc);osc.start(at);osc.stop(at+duration+0.01)
    osc.onended=()=>{this.musicNodes.delete(osc);osc.disconnect();gain.disconnect()}
  }
  musicBeat(step,at) {
    // Tema original «Mathy en marcha», 8 compases. No reproduce la melodía de Mario.
    const tune=[
      74,null,78,81,78,76,74,69, 71,74,78,null,76,74,71,69,
      67,null,71,74,78,74,71,69, 66,69,73,76,73,null,69,66,
      74,78,81,null,83,81,78,76, 71,74,78,81,78,76,74,null,
      67,71,74,79,78,74,71,67, 69,73,76,81,76,73,69,null]
    const bass=[50,47,43,45,50,47,43,45],index=step%64
    this.musicNote(tune[index],at,0.15,0.08)
    if(index%2===0)this.musicNote(bass[Math.floor(index/8)]+(index%4===2?12:0),at,0.2,0.11,'triangle')
    if(index%4===0)this.musicNote(35,at,0.07,0.09,'triangle')
    if(index%2===1)this.musicNote(100,at,0.018,0.017,'square')
  }
  async close() { this.setMusic(false); await this.context?.close?.(); this.context=null;this.master=null;this.musicBus=null }

}
