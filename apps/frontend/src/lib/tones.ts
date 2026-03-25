let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext()
    }
    return audioCtx
}

async function ensureResumed(ctx: AudioContext): Promise<void> {
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume()
        } catch {
            // Silently fail — audio is non-critical
        }
    }
}

function scheduleTone(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    startOffset: number,
    type: OscillatorType = 'sine',
) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + startOffset)
    gain.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + startOffset + duration,
    )

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime + startOffset)
    osc.stop(ctx.currentTime + startOffset + duration)
}

export async function playClockInTone() {
    const ctx = getAudioContext()
    await ensureResumed(ctx)
    if (ctx.state !== 'running') return

    // Rising two-tone: friendly "boop-beep"
    scheduleTone(ctx, 440, 0.15, 0) // A4
    scheduleTone(ctx, 587, 0.2, 0.15) // D5
}

export async function playClockOutTone() {
    const ctx = getAudioContext()
    await ensureResumed(ctx)
    if (ctx.state !== 'running') return

    // Falling two-tone: gentle "beep-boop"
    scheduleTone(ctx, 587, 0.15, 0) // D5
    scheduleTone(ctx, 440, 0.2, 0.15) // A4
}

export async function playErrorTone() {
    const ctx = getAudioContext()
    await ensureResumed(ctx)
    if (ctx.state !== 'running') return

    scheduleTone(ctx, 200, 0.3, 0, 'square')
}
