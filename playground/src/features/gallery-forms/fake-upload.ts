/** URL answered by the fake upload (never leaves the browser). */
export const FAKE_UPLOAD_URL = '/gallery-fake-upload'

/**
 * Replaces `window.XMLHttpRequest` with a subclass that fakes only the requests to
 * {@link FAKE_UPLOAD_URL} (progress events, then a 200) and delegates everything else.
 *
 * @returns a function that restores the original constructor
 */
export function installFakeUpload(): () => void {
  const Original = window.XMLHttpRequest

  class FakeAwareXhr extends Original {
    private fake = false
    private timer: ReturnType<typeof setInterval> | undefined
    private fakeState = { readyState: 0, status: 0 }

    /** Marks the request as fake when it targets the fake URL. */
    override open(method: string, url: string | URL, ...rest: [boolean?, string?, string?]): void {
      this.fake = String(url) === FAKE_UPLOAD_URL
      if (this.fake) {
        Object.defineProperties(this, {
          readyState: { get: () => this.fakeState.readyState },
          status: { get: () => this.fakeState.status }
        })
      } else super.open(method, url, ...(rest as [boolean, string?, string?]))
    }

    override setRequestHeader(name: string, value: string): void {
      if (!this.fake) super.setRequestHeader(name, value)
    }

    /** Emits 10 progress steps (about 1 s), then completes with status 200. */
    override send(body?: Document | XMLHttpRequestBodyInit | null): void {
      if (!this.fake) return super.send(body)
      const total = body instanceof FormData ? [...body.values()].reduce<number>(
        (sum, v) => sum + (v instanceof File ? v.size : 0), 0) : 0
      let step = 0
      this.timer = setInterval(() => {
        step++
        const loaded = Math.round((total * step) / 10)
        this.upload.dispatchEvent(new ProgressEvent('progress', { loaded, total, lengthComputable: true }))
        if (step === 10) this.finish(200)
      }, 100)
    }

    override abort(): void {
      if (!this.fake) return super.abort()
      this.finish(0)
    }

    /** Ends the fake request with the given status. */
    private finish(status: number): void {
      clearInterval(this.timer)
      this.fakeState = { readyState: 4, status }
      this.dispatchEvent(new Event('readystatechange'))
    }
  }

  window.XMLHttpRequest = FakeAwareXhr as typeof XMLHttpRequest
  return () => {
    window.XMLHttpRequest = Original
  }
}
