export class FormTracker {
  constructor(
    private excludedFormIds: string[],
    private excludedInputFieldNames: string[],
    private onSubmitHandler: (formId: string, formData: Record<string, string>) => Promise<void>,
  ) {}

  public init() {
    try {
      if (!this.onSubmitHandler || typeof document === 'undefined') {
        return;
      }

      const forms = this.findForms();
      for (const form of forms) {
        this.registerHandler(form);
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

    const mutationObserver = new MutationObserver((mutations) => {
      const childListMutations = mutations.filter((m) => m.type === 'childList');

      for (const mutation of childListMutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType == Node.ELEMENT_NODE && node.nodeName === 'FORM') {
            formTracker.registerHandler(node as HTMLFormElement);
          }

          if ('querySelectorAll' in node && typeof node.querySelectorAll === 'function') {
            (Array.from(node.querySelectorAll('form')) as HTMLFormElement[]).forEach((htmlFormElement) =>
              formTracker.registerHandler(htmlFormElement),
            );
          }
        });
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  private registerHandler(htmlFormElement: HTMLFormElement) {
    if (this.excludedFormIds.includes(htmlFormElement.id)) {
      return;
    }

    let eventHandlerCalled = false;

    htmlFormElement.addEventListener(
      'submit',
      async (evt: SubmitEvent) => {
        if (eventHandlerCalled) {
          return;
        }

        eventHandlerCalled = true;

        if (typeof htmlFormElement.requestSubmit === 'function') {
          evt.preventDefault();
          evt.stopPropagation();

          await this.handleFormSubmitted(htmlFormElement);

          const submitter = htmlFormElement.querySelector('button[type=submit]');
          setTimeout(() => {
            if (submitter) {
              htmlFormElement.requestSubmit(submitter as HTMLElement);
            } else {
              htmlFormElement.requestSubmit();
            }
          }, 0);
        } else {
          await this.handleFormSubmitted(htmlFormElement);
        }
      },
      { capture: true },
    );
  }

  private async handleFormSubmitted(form: HTMLFormElement) {
    try {
      const excludedProperties = [
        'ccn',
        'cvv',
        'password',
        'pin',
        'secret',
        'token',
        ...(this.excludedInputFieldNames || []),
      ].map((p) => p.toLowerCase());

      for (const element of Array.from(form.querySelectorAll('input'))) {
        if (element.type === 'password') {
          excludedProperties.push(element.name);
        }
      }

      const formData = new FormData(form);
      const formEntries = Array.from(formData.entries());

      const stringEntries: [string, string][] = formEntries
        .filter(([_, value]) => typeof value === 'string')
        .filter(([key, _]) => !excludedProperties.includes(key.toLowerCase()))
        .map(([key, value]) => [key, value.toString()]);

      await this.onSubmitHandler(form.id, Object.fromEntries(stringEntries));
    } catch (e) {
      console.warn('Error tracking form submit', e);
    }
  }

  private findForms(): HTMLFormElement[] {
    if (typeof document === 'undefined') {
      return [];
    }

    return Array.from(document.querySelectorAll('form'));
  }
}
