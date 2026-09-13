/** One render at a time. Superseded results never reach the visible document. */
export class RenderQueue<Input, Result> {
  private generation = 0;
  private pending?: { input: Input; generation: number };
  private running = false;
  private disposed = false;

  constructor(private readonly handlers: {
    render(input: Input, current: () => boolean): Promise<Result>;
    success(input: Input, result: Result): void;
    failure(input: Input, error: unknown): void;
    release(result: Result): void;
  }) {}

  submit(input: Input): void {
    if (this.disposed) return;
    this.pending = { input, generation: ++this.generation };
    void this.drain();
  }

  invalidate(): void {
    ++this.generation;
    this.pending = undefined;
  }

  dispose(): void {
    this.disposed = true;
    this.invalidate();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending && !this.disposed) {
        const job = this.pending;
        this.pending = undefined;
        const current = () => !this.disposed && job.generation === this.generation;
        try {
          const result = await this.handlers.render(job.input, current);
          if (current()) this.handlers.success(job.input, result);
          else this.handlers.release(result);
        } catch (error) {
          if (current()) this.handlers.failure(job.input, error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
