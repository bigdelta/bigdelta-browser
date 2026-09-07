import { record } from 'rrweb';
import { isUnmaskableInput, SessionRecorder } from '../src/recording/sessionRecorder';

jest.mock('rrweb', () => ({
  record: Object.assign(jest.fn(), { addCustomEvent: jest.fn() }),
}));

const recordMock = record as unknown as jest.Mock;

const buildRecorder = (overrides = {}) =>
  new SessionRecorder({
    enabled: true,
    baseURL: 'https://api.test',
    trackingKey: 'tracking-key',
    getSessionId: () => 'session-1',
    getRelationIds: () => ({ users: 'user-1' }),
    ...overrides,
  });

const buildInput = (attributes: Record<string, string> = {}, tagName = 'input'): HTMLElement => {
  const element = document.createElement(tagName);

  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  document.body.appendChild(element);

  return element;
};

const startAndGetMaskInputFn = (overrides = {}) => {
  recordMock.mockClear();
  buildRecorder(overrides).start();

  return recordMock.mock.calls[0][0].maskInputFn as ((text: string, element: HTMLElement) => string) | undefined;
};

describe('Input masking', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should not install a mask function when no unmask selector is configured', () => {
    expect(startAndGetMaskInputFn()).toBeUndefined();
  });

  it('should keep masking inputs that do not match the unmask selector', () => {
    const maskInputFn = startAndGetMaskInputFn({ unmaskSelector: '[data-bigdelta-unmask]' });
    const element = buildInput({ type: 'text' });

    expect(maskInputFn!('acme.com', element)).toBe('********');
  });

  it('should unmask an input that matches the selector', () => {
    const maskInputFn = startAndGetMaskInputFn({ unmaskSelector: '[data-bigdelta-unmask]' });
    const element = buildInput({ type: 'text', 'data-bigdelta-unmask': '' });

    expect(maskInputFn!('acme.com', element)).toBe('acme.com');
  });

  it('should unmask an input nested inside a matching container', () => {
    const maskInputFn = startAndGetMaskInputFn({ unmaskSelector: '.unmasked' });
    const container = document.createElement('div');

    container.className = 'unmasked';
    document.body.appendChild(container);

    const element = document.createElement('input');

    element.setAttribute('type', 'text');
    container.appendChild(element);

    expect(maskInputFn!('acme.com', element)).toBe('acme.com');
  });

  describe('sensitive inputs stay masked', () => {
    it.each(['password', 'email', 'tel'])('should keep a %s input masked even when the selector matches', (type) => {
      const maskInputFn = startAndGetMaskInputFn({ unmaskSelector: 'input' });
      const element = buildInput({ type });

      expect(maskInputFn!('secret123', element)).toBe('*********');
    });

    it('should keep sensitive inputs masked when the type is uppercase', () => {
      const maskInputFn = startAndGetMaskInputFn({ unmaskSelector: 'input' });
      const element = buildInput({ type: 'PASSWORD' });

      expect(maskInputFn!('secret123', element)).toBe('*********');
    });
  });

  describe('isUnmaskableInput', () => {
    it.each(['password', 'email', 'tel'])('should refuse to unmask a %s input', (type) => {
      expect(isUnmaskableInput(buildInput({ type }))).toBe(false);
    });

    it.each(['text', 'search', 'url', 'number'])('should allow unmasking a %s input', (type) => {
      expect(isUnmaskableInput(buildInput({ type }))).toBe(true);
    });

    it('should allow unmasking an input with no type attribute', () => {
      expect(isUnmaskableInput(buildInput())).toBe(true);
    });

    it('should refuse to unmask a password input typed via the DOM property', () => {
      const element = buildInput() as HTMLInputElement;

      element.type = 'password';

      expect(isUnmaskableInput(element)).toBe(false);
    });

    it('should allow unmasking a textarea', () => {
      expect(isUnmaskableInput(buildInput({}, 'textarea'))).toBe(true);
    });
  });
});
