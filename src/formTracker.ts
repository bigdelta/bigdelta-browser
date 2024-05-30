export class FormTracker {
  constructor(
    private selector: string,
    private eventHandler: (form: HTMLFormElement, callback: () => void, event: SubmitEvent) => void,
  ) {}

  public init() {
    try {
      if (!this.eventHandler) {
        return;
      }

      const elements = this.findElements();
      for (const element of elements) {
        this.registerHandler(element);
      }

      this.initializeMutationObserver();
    } catch (e) {
      console.log('Error initializing form tracker', e);
    }
  }

  private initializeMutationObserver() {
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const formTracker = this;
    const mutationObserver = new MutationObserver((mutationRecords) => {
      const elements = formTracker.findElements();

      for (const mutationRecord of mutationRecords) {
        if (mutationRecord.type === 'childList') {
          mutationRecord.addedNodes.forEach((formElement) => {
            if (formElement.nodeType !== Node.ELEMENT_NODE || !elements.some((element) => element === formElement)) {
              return;
            }

            formTracker.registerHandler(formElement as Element);
          });
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  private registerHandler(element: Element) {
    if (element.tagName.toLowerCase() !== 'form') {
      return;
    }
    const state = { callbackCalled: false, eventHandlerCalled: false, dispatchedEvents: [] };

    element.addEventListener('submit', (evt: SubmitEvent) => {
      if (state.eventHandlerCalled) {
        return;
      }

      state.eventHandlerCalled = true;

      evt.preventDefault();
      evt.stopPropagation();

      const formElement = element as HTMLFormElement;
      const callback = () => {
        if (state.callbackCalled) {
          return;
        }
        state.callbackCalled = true;

        formElement.submit();
      };

      this.eventHandler(formElement, callback, evt);

      setTimeout(callback, 300);
    });
  }

  private findElements(): Element[] {
    if (typeof document === 'undefined') {
      return [];
    }

    return Array.from(document.querySelectorAll(this.selector));
  }
}
