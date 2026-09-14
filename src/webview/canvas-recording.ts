import { english, Translator } from '../localization.js';

const DRAW_METHODS = new Set(['save', 'restore', 'reset', 'setTransform', 'resetTransform', 'transform', 'scale', 'translate', 'rotate',
  'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'rect', 'arc', 'arcTo', 'ellipse',
  'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill', 'clip', 'fillText', 'strokeText', 'drawImage', 'setLineDash']);
const READ_METHODS = new Set(['measureText', 'getImageData', 'getTransform', 'getLineDash', 'getContextAttributes',
  'isPointInPath', 'isPointInStroke', 'isContextLost']);
const DRAW_PROPERTIES = new Set(['fillStyle', 'strokeStyle', 'font', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
  'textAlign', 'textBaseline', 'direction', 'lineDashOffset', 'globalAlpha', 'globalCompositeOperation',
  'imageSmoothingEnabled', 'imageSmoothingQuality']);
type Command = { kind: 'call'; key: string; args: unknown[] } | { kind: 'set'; key: string; value: string | number | boolean };

/** Counts cumulative work, even after canvas resets, so repeated resets cannot bypass the limit. */
export class RecordingBudget {
  private commands = 0;
  private text = 0;
  constructor(private readonly t: Translator = english, private readonly maximumCommands = 150_000,
    private readonly maximumText = 1_000_000) {}

  reserve(values: unknown[]): void {
    const text = values.reduce<number>((sum, value) => sum + (typeof value === 'string' ? value.length : 0), 0);
    if (this.commands + 1 > this.maximumCommands || this.text + text > this.maximumText) {
      throw new Error(this.t('This score is too complex to print. Split it into smaller files.'));
    }
    ++this.commands;
    this.text += text;
  }
}

/** Records only our page canvases. Native Path2D/image objects stay in this browser; no serialization or SVG conversion. */
export class CanvasRecording {
  private commands: Command[] = [];
  private sealed = false;
  private disposed = false;
  private readonly context: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement, private readonly budget: RecordingBudget,
    private readonly t: Translator = english) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('Could not create the print canvas.'));
    this.context = context;
    const wrappers = new Map<string, (...args: unknown[]) => unknown>();
    const proxy = new Proxy(context, {
      get: (target, key) => {
        const value: unknown = Reflect.get(target, key, target);
        if (typeof value !== 'function') return value;
        const name = String(key);
        if (!wrappers.has(name)) wrappers.set(name, (...args) => {
          if (READ_METHODS.has(name)) return Reflect.apply(value, target, args);
          if (!DRAW_METHODS.has(name)) throw new Error(t('Unsupported print drawing operation: {0}', name));
          this.append({ kind: 'call', key: name, args: args.map(arg => Array.isArray(arg) ? [...arg] : arg) }, args);
          return Reflect.apply(value, target, args);
        });
        return wrappers.get(name);
      },
      set: (target, key, value: unknown) => {
        const name = String(key);
        if (!DRAW_PROPERTIES.has(name)) {
          // Fumen also stores non-Canvas hints such as "font-weight" on the context.
          if (key in target && typeof Reflect.get(target, key, target) === 'function') {
            throw new Error(t('Unsupported print drawing operation: {0}', name));
          }
          if (key in CanvasRenderingContext2D.prototype) throw new Error(t('Unsupported print drawing operation: {0}', name));
          return Reflect.set(target, key, value, target);
        }
        const result = Reflect.set(target, key, value, target);
        // Record the accepted state (Canvas ignores invalid font/style assignments).
        const accepted: unknown = Reflect.get(target, key, target);
        if (typeof accepted !== 'string' && typeof accepted !== 'number' && typeof accepted !== 'boolean') {
          throw new Error(t('Unsupported print drawing operation: {0}', name));
        }
        this.append({ kind: 'set', key: name, value: accepted }, [accepted]);
        return result;
      }
    });
    Object.defineProperty(canvas, 'getContext', { value: (kind: string) => kind === '2d' ? proxy : null });
    for (const dimension of ['width', 'height']) {
      const native = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)!;
      Object.defineProperty(canvas, dimension, {
        configurable: true,
        get: () => native.get!.call(canvas) as number,
        set: (value: number) => {
          native.set!.call(canvas, value);
          this.commands = []; // Resizing resets both the native drawing and all context state.
          this.sealed = false;
        }
      });
    }
  }

  private append(command: Command, values: unknown[]): void {
    if (this.disposed || this.sealed) throw new Error(this.t('The print drawing changed unexpectedly. Reopen it from VS Code.'));
    this.budget.reserve(values);
    this.commands.push(command);
  }

  seal(): void { this.sealed = true; }

  replay(): void {
    if (this.disposed || !this.sealed) throw new Error(this.t('The print drawing is not ready.'));
    this.context.reset();
    for (const command of this.commands) {
      if (command.kind === 'set') Reflect.set(this.context, command.key, command.value, this.context);
      else Reflect.apply(Reflect.get(this.context, command.key) as (...args: unknown[]) => void, this.context, command.args);
    }
  }

  dispose(): void { this.disposed = true; this.commands = []; }
}
