// Runs on instagram.com, but only does anything for tabs opened from The Stack,
// which tags its Instagram links with "#stack". Normal Instagram browsing is untouched.
//
// Instagram autoplays its video muted. Until you first click or press a key in the
// tab, this keeps the video paused at the start with sound on. Your first click then
// plays it with sound, and after that Instagram's own controls behave as usual.
if (location.hash.includes('stack')) {
  let released = false // you have interacted with the tab
  let unmuteUntil = Infinity // after release, keep sound on until just after playback starts

  const hold = (video) => {
    if (video.muted) video.muted = false
    if (!video.paused) {
      video.pause()
      video.currentTime = 0
    }
  }

  for (const type of ['play', 'playing', 'volumechange', 'loadeddata']) {
    document.addEventListener(
      type,
      (event) => {
        const video = event.target
        if (!(video instanceof HTMLVideoElement)) return
        if (!released) return hold(video)
        // Instagram still believes the video is muted and re-mutes it as it starts.
        if (type === 'playing' && unmuteUntil === Infinity) unmuteUntil = Date.now() + 2000
        if (Date.now() < unmuteUntil && video.muted) video.muted = false
      },
      true,
    )
  }

  // Videos are added after the page loads, so catch them as they appear.
  new MutationObserver(() => {
    if (!released) document.querySelectorAll('video').forEach(hold)
  }).observe(document.documentElement, { childList: true, subtree: true })

  const release = (event) => {
    if (event.isTrusted) released = true
  }
  addEventListener('pointerdown', release, true)
  addEventListener('keydown', release, true)
}
