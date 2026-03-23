let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext()
    }
    return audioCtx
}

function playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
) {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
}

export function playClockInTone() {
    const ctx = getAudioContext()
    // Rising two-tone: friendly "boop-beep"
    playTone(440, 0.15) // A4
    setTimeout(() => {
        if (ctx.state === 'running') {
            playTone(587, 0.2) // D5
        }
    }, 150)
}

export function playClockOutTone() {
    const ctx = getAudioContext()
    // Falling two-tone: gentle "beep-boop"
    playTone(587, 0.15) // D5
    setTimeout(() => {
        if (ctx.state === 'running') {
            playTone(440, 0.2) // A4
        }
    }, 150)
}

export function playErrorTone() {
    playTone(200, 0.3, 'square')
}
